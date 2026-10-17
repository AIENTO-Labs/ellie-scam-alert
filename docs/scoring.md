# Scoring model

The call transcript is scored continuously. The output is a probability from 0 to 1 that the call is a scam, and the probability decides the action. Scoring exists to keep false positives down, so a call from a real relative or the real bank does not trigger an intercept.

## Pipeline

Call audio → live transcript → enrichment → scoring → probability (0 to 1) → action tier

## Inputs (starting set, roughly 10 to 20 signals; weights to be tuned by the build team)

| Group | Signals |
|---|---|
| Caller | unknown number, foreign or spoofed origin, claims an institution (bank, police, tax office, immigration), no prior contact |
| Request | asks for TAN, OTP or PIN, asks for a transfer, "safe account", gift cards or crypto, cash or valuables pickup |
| Pressure | urgency ("right now", "today"), threat (arrest, fine, account frozen), secrecy ("don't tell your bank or family") |
| Voice | raised tone or stress, scripted cadence, refuses a callback |
| Context | claims to be a relative in trouble, mismatch with known contacts |

## Action tiers

| Score | Colour | Action |
|---|---|---|
| under 0.5 | green | log only |
| 0.5 to 0.89 | yellow | "pay attention" state on screen only; the call is **not** interrupted |
| 0.9 and above | red | lower caller audio, companion voice cuts in with a warning, recording starts, family member alerted, guidance says hang up |

The team agreed 50% for a small alert and 90% for full action. Yellow never interrupts the call; only red does. Exact cut-offs and colours (yellow vs orange) are a design decision to test with fake data. [NEEDS CONFIRMATION]

## How we analyse the transcript (owner: João)

Two layers run on every new transcript chunk:

1. **Rules layer** (`backend/scoring/score.py`): regex signals per tactic with weights. Instant, offline, explainable, drives the tactic labels on screen even if the API is slow.
2. **Claude layer** (`prompts/scam-scorer.md`): Claude reads the transcript so far and returns JSON: probability, tactics with a quoted piece of evidence, a one-line reason and one-line advice for the user. This catches phrasing the rules miss and writes Ellie's warning.

Final score = running max of `0.4 × rules + 0.6 × Claude`. Running max keeps a call red once it turns red. If the API fails, rules alone keep the demo working.

Run it:

```
python backend/scoring/score.py data/scam-transcripts/fake-police.md --offline   # rules only
python backend/scoring/score.py data/scam-transcripts/fake-police.md             # rules + Claude
```

Each line prints JSON with the score, tier and tactics so the call screen can read it.

Offline result on the fake police script: green through the opening, yellow at 0.75 when secrecy appears ("You must not tell your bank or your family"), red at 1.0 when the cash pickup is requested.

## Which model

| Job | Model | Why |
|---|---|---|
| Per-chunk scoring during the call | `claude-haiku-5-5` | Fastest and cheapest, runs every few seconds |
| Post-call summary, family text, authority report | `claude-sonnet-5-5` | Better writing, latency does not matter after the call |

Model ids from the current Claude lineup; check docs.claude.com before the README is final. [NEEDS CONFIRMATION] Override with `ELLIE_MODEL`.

## Demo case

The demo uses the fake police script in `data/scam-transcripts/fake-police.md`. Lower-confidence cases are explained in the README and slides, not demoed.
