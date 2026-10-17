"""Ellie scam scorer.

Two layers, combined per transcript chunk:
1. Rules: instant regex signals with weights. Works offline, no API key.
2. Claude: reads the transcript so far, returns tactics with evidence and a probability.

Final score (0 to 100) = running max of (0.4 * rules + 0.6 * claude), or rules alone if Claude is off.
Running max means once a call turns red it stays red, which matches how the demo should behave.
Bands match Jonno's call demo: low < 30, watch 30-59, high 60-79, scam >= 80. Ellie acts at 80.
Tactic keys match app/call-demo/script.js (auth, urgency, secrecy, payment, remote, ...).

--checks prints a `checks` array in the same shape as script.js, so the demo can run on real scores.

Usage:
  python backend/scoring/score.py data/scam-transcripts/fake-police.md            # rules + Claude
  python backend/scoring/score.py data/scam-transcripts/fake-police.md --offline  # rules only
  python backend/scoring/score.py FILE --offline --voice 0.9   # plus a synthetic-voice signal

Voice check: a synthetic-voice detector (Pindrop is the first candidate, see docs/aws-architecture.md)
returns a probability that the caller's voice is AI generated. It is one more input, never a verdict:
VOICE_WEIGHT * probability is added to the combined score. Today the value is passed in by hand.

Reads ANTHROPIC_API_KEY from the environment or .env. Never commit keys.
"""
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROMPT = (ROOT / "prompts" / "scam-scorer.md").read_text(encoding="utf-8")
MODEL = os.environ.get("ELLIE_MODEL", "claude-haiku-5-5")  # fast enough for per-chunk scoring

THRESHOLD = 80
VOICE_WEIGHT = 0.25  # a certain synthetic voice adds 25 points, enough to turn "high" into "scam"
# Map the prompt's tactic ids to the call demo's keys.
DEMO_KEY = {"authority_impersonation": "auth", "urgency": "urgency", "secrecy": "secrecy",
            "payment_request": "payment", "remote_access": "remote", "credential_request": "credentials",
            "threat": "threat", "emotional_manipulation": "emotion", "isolation": "isolation"}

# id: (weight, patterns). Weights add up, capped at 1.0.
RULES = {
    "authority_impersonation": (0.25, [r"\bpolice\b", r"\bofficer\b", r"\bdetective\b", r"\bpolizei\b", r"\bbank\b.*\b(security|fraud)\b", r"\btax office\b", r"\bfinanzamt\b", r"\bimmigration\b"]),
    "urgency": (0.15, [r"\bright now\b", r"\bimmediately\b", r"\btoday\b", r"\bno time\b", r"\bquickly\b"]),
    "secrecy": (0.2, [r"\bdon'?t tell\b", r"\bnot tell\b", r"\bkeep (this|it) (secret|between)\b", r"\bconfidential\b"]),
    "threat": (0.15, [r"\barrest", r"\bfine\b", r"\bfrozen\b", r"\bblocked\b", r"\bprison\b", r"\bjail\b"]),
    "payment_request": (0.3, [r"\bsafe account\b", r"\btransfer\b", r"\bgift card", r"\bgoogle play\b", r"\bitunes\b", r"\bread me the codes?\b", r"\bbitcoin\b", r"\bcrypto", r"\bcash\b", r"\bvaluables\b", r"\bjewel"]),
    "remote_access": (0.3, [r"\banydesk\b", r"\bteamviewer\b", r"\bremote (access|support|app)\b", r"\binstall (an |this )?app\b"]),
    "credential_request": (0.3, [r"\bpin\b", r"\btan\b", r"\bcode\b", r"\bpassword\b", r"\bcard number\b", r"\bonline banking\b"]),
    "emotional_manipulation": (0.15, [r"\baccident\b", r"\bin trouble\b", r"\bgrandson\b", r"\bgranddaughter\b"]),
    "isolation": (0.1, [r"\bstay on the line\b", r"\bdon'?t hang up\b", r"\bdo not hang up\b"]),
}


def rule_score(text):
    low = text.lower()
    hits = {}
    for tid, (w, pats) in RULES.items():
        for p in pats:
            m = re.search(p, low)
            if m:
                hits[tid] = m.group(0)
                break
    score = min(1.0, sum(RULES[t][0] for t in hits))
    # Same combination rule as the Claude prompt: asking for money, codes or remote
    # access while posing as an authority, or demanding secrecy, is a scam on its own.
    asks = {"payment_request", "credential_request", "remote_access"}
    cover = {"authority_impersonation", "secrecy"}
    if hits.keys() & asks and hits.keys() & cover:
        score = max(score, 0.8)
    return score, hits


def claude_score(transcript):
    import anthropic  # pip install anthropic
    client = anthropic.Anthropic()
    msg = client.messages.create(
        model=MODEL,
        max_tokens=400,
        system=PROMPT,
        messages=[{"role": "user", "content": f"Transcript so far:\n\n{transcript}"}],
    )
    raw = msg.content[0].text.strip()
    raw = raw[raw.find("{"): raw.rfind("}") + 1]
    return json.loads(raw)


def tier(score):
    """score is 0 to 100. Bands match the call demo."""
    if score >= 80:
        return "scam"
    if score >= 60:
        return "high"
    if score >= 30:
        return "watch"
    return "low"


def load_env():
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


def caller_lines(path):
    """Lines starting with 'Caller:' or 'Elder:' from a transcript file."""
    out = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\s*(Caller|Elder|Helga)\s*:\s*(.+)$", line)
        if m:
            out.append((m.group(1), m.group(2)))
    return out


def run(path, offline=False, checks=False, voice=0.0):
    load_env()
    use_claude = not offline and bool(os.environ.get("ANTHROPIC_API_KEY"))
    so_far, best, seen, out_checks = [], 0.0, set(), []
    caller_idx = 0
    for speaker, text in caller_lines(path):
        so_far.append(f"{speaker}: {text}")
        transcript = "\n".join(so_far)
        caller_text = "\n".join(l for l in so_far if l.startswith("Caller"))
        r, hits = rule_score(caller_text)
        result = {"rules": round(r, 2), "rule_hits": hits}
        if use_claude and speaker == "Caller":
            try:
                c = claude_score(transcript)
                result["claude"] = c
                combined = 0.4 * r + 0.6 * float(c.get("probability", 0))
            except Exception as e:  # keep the demo running if the API fails
                result["claude_error"] = str(e)
                combined = r
        else:
            combined = r
        combined = min(1.0, combined + VOICE_WEIGHT * voice)
        best = max(best, combined)
        score100 = round(best * 100)
        result.update({"line": f"{speaker}: {text}", "score": score100, "tier": tier(score100)})
        if speaker == "Caller":
            caller_idx += 1
            new = [DEMO_KEY.get(t, t) for t in hits if t not in seen]
            seen.update(hits)
            reason = result.get("claude", {}).get("reason") or ("Flagged: " + ", ".join(new) if new else "Nothing new flagged.")
            out_checks.append({"after": f"c{caller_idx}", "delay": 1.2, "score": score100,
                               "tactics": new, "reason": reason})
        if not checks:
            print(json.dumps(result, ensure_ascii=False))
    if checks:
        print(json.dumps(out_checks, ensure_ascii=False, indent=2))
    return best


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    voice = float(sys.argv[sys.argv.index("--voice") + 1]) if "--voice" in sys.argv else 0.0
    run(sys.argv[1], offline="--offline" in sys.argv, checks="--checks" in sys.argv, voice=voice)
