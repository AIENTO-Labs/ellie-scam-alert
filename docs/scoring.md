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

## Action tiers (0 to 100, matches the call demo)

| Score | Band | Colour | Action |
|---|---|---|---|
| under 30 | low | green | log only |
| 30 to 59 | watch | amber | pay-attention state on screen; call not interrupted |
| 60 to 79 | high | orange | stronger on-screen warning; call not interrupted |
| 80 and over | scam | red | **Ellie acts:** private warning to the user (coach mode), text to the protector, call ends |

Agreed with Jonno's call demo (`app/call-demo`, `docs/decisions.md`). Replaces the earlier 0.5 / 0.9 tiers.

## How we analyse the transcript (owner: João)

Two layers run on every new transcript chunk:

1. **Rules layer** (`backend/scoring/score.py`): regex signals per tactic with weights. Instant, offline, explainable, drives the tactic labels on screen even if the API is slow.
2. **Claude layer** (`prompts/scam-scorer.md`): Claude reads the transcript so far and returns JSON: probability, tactics with a quoted piece of evidence, a one-line reason and one-line advice for the user. This catches phrasing the rules miss and writes Ellie's warning.

Final score = running max of `0.4 × rules + 0.6 × Claude`, shown 0 to 100. Running max keeps a call red once it turns red. If the API fails, rules alone keep the demo working.

Run it:

```
python backend/scoring/score.py data/scam-transcripts/fake-police.md --offline   # rules only
python backend/scoring/score.py data/scam-transcripts/fake-police.md             # rules + Claude
```

Each line prints JSON with the score, tier and tactics so the call screen can read it.

Run on Jonno's demo script (`data/scam-transcripts/fake-police-rose.md`), rules only:

| Caller line | Demo (hand-set) | Scorer (real) |
|---|---|---|
| c1 greeting | 6 | 0 |
| c2 "Detective Weber, Berlin police" | 35 | 25 |
| c3 gang, bank details at risk | 52 | 40 |
| c4 act today, don't tell your family | 76 | 75 |
| c5 €2,000 in Google Play cards | 94 | 100 |

Both cross 80 on the same line. `--checks` prints this as a `checks` array in the shape `app/call-demo/script.js` uses, so the demo can run on real scorer output; with an API key, Claude writes the `reason` lines too.

## Which model

| Job | Model | Why |
|---|---|---|
| Per-chunk scoring during the call | `claude-haiku-5-5` | Fastest and cheapest, runs every few seconds |
| Post-call summary, family text, authority report | `claude-sonnet-5-5` | Better writing, latency does not matter after the call |

Model ids from the current Claude lineup; check docs.claude.com before the README is final. [NEEDS CONFIRMATION] Override with `ELLIE_MODEL`.

## Demo case

The demo uses Jonno's script: Rose Miller, "Detective Weber", €2,000 in Google Play cards (`data/scam-transcripts/fake-police-rose.md`, same lines as `app/call-demo/script.js`). Lower-confidence cases are explained in the README and slides, not demoed.
