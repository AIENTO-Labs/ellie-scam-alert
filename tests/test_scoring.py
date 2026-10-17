"""Scorer tests. Run: python -m pytest tests/ -q   (or: python tests/test_scoring.py)

These run offline (rules layer only), so they pass without an API key.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend" / "scoring"))
import score  # noqa: E402


def final_score(path):
    best = 0.0
    so_far = []
    for speaker, text in score.caller_lines(path):
        if speaker == "Caller":
            so_far.append(text)
            r, _ = score.rule_score("\n".join(so_far))
            best = max(best, r)
    return round(best * 100)


def test_fake_police_demo_crosses_80():
    assert final_score(ROOT / "data/scam-transcripts/fake-police-rose.md") >= 80


def test_greeting_alone_is_low():
    r, hits = score.rule_score("Good afternoon. Is this Mrs. Miller?")
    assert round(r * 100) < 30
    assert hits == {}


def test_authority_alone_does_not_trigger():
    r, _ = score.rule_score("This is Detective Weber, Berlin police.")
    assert round(r * 100) < 80


def test_gift_cards_plus_authority_triggers():
    r, hits = score.rule_score("This is the police. Buy 2,000 euros in Google Play cards and read me the codes.")
    assert round(r * 100) >= 80
    assert "payment_request" in hits and "authority_impersonation" in hits


def test_tiers():
    assert score.tier(10) == "low"
    assert score.tier(45) == "watch"
    assert score.tier(70) == "high"
    assert score.tier(80) == "scam"


if __name__ == "__main__":
    import inspect
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and inspect.isfunction(fn):
            try:
                fn()
                print("ok  ", name)
            except AssertionError as e:
                fails += 1
                print("FAIL", name, e)
    sys.exit(1 if fails else 0)
