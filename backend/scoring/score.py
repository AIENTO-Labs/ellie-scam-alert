"""Ellie scam scorer.

Two layers, combined per transcript chunk:
1. Rules: instant regex signals with weights. Works offline, no API key.
2. Claude: reads the transcript so far, returns tactics with evidence and a probability.

Final score = running max of (0.4 * rules + 0.6 * claude), or rules alone if Claude is off.
Running max means once a call turns red it stays red, which matches how the demo should behave.

Usage:
  python backend/scoring/score.py data/scam-transcripts/fake-police.md            # rules + Claude
  python backend/scoring/score.py data/scam-transcripts/fake-police.md --offline  # rules only

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

# id: (weight, patterns). Weights add up, capped at 1.0.
RULES = {
    "authority_impersonation": (0.25, [r"\bpolice\b", r"\bofficer\b", r"\bpolizei\b", r"\bbank\b.*\b(security|fraud)\b", r"\btax office\b", r"\bfinanzamt\b", r"\bimmigration\b"]),
    "urgency": (0.15, [r"\bright now\b", r"\bimmediately\b", r"\btoday\b", r"\bno time\b", r"\bquickly\b"]),
    "secrecy": (0.2, [r"\bdon'?t tell\b", r"\bnot tell\b", r"\bkeep (this|it) (secret|between)\b", r"\bconfidential\b"]),
    "threat": (0.15, [r"\barrest", r"\bfine\b", r"\bfrozen\b", r"\bblocked\b", r"\bprison\b", r"\bjail\b"]),
    "payment_request": (0.3, [r"\bsafe account\b", r"\btransfer\b", r"\bgift card", r"\bbitcoin\b", r"\bcrypto", r"\bcash\b", r"\bvaluables\b", r"\bjewel"]),
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
    if score >= 0.9:
        return "red"
    if score >= 0.5:
        return "yellow"
    return "green"


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


def run(path, offline=False):
    load_env()
    use_claude = not offline and bool(os.environ.get("ANTHROPIC_API_KEY"))
    so_far, best = [], 0.0
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
        best = max(best, combined)
        result.update({"line": f"{speaker}: {text}", "score": round(best, 2), "tier": tier(best)})
        print(json.dumps(result, ensure_ascii=False))
    return best


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    run(sys.argv[1], offline="--offline" in sys.argv)
