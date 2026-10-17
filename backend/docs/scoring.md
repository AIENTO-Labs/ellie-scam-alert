# Ellie scoring model

Ellie gives every call, SMS, email or WhatsApp a **scam score from 0 to 1** and a level that decides what Ellie does. Code: `src/scoring/`.

## 1. Find warning signs

Three sources, merged (the first quote per sign is kept):

| Source | When | Why |
|---|---|---|
| Keywords, English and German | every caller sentence, instantly | works offline, no delay |
| Claude Haiku (`prompts/scoring.md`) | every 10 s, and at once when money or codes come up | understands paraphrases ("your grandson had a car crash") |
| Number check | at call start | facts about the number, not the words |

Claude must quote the exact words. A sign whose quote is not in the transcript is thrown away, so Claude cannot invent evidence. Claude's own overall estimate is stored as `model_probability`, for comparison only.

## 2. Weight them

Grounded in police and FBI red flags for phone fraud against older people and in Cialdini's principles of persuasion (authority, scarcity and urgency, secrecy).

| Sign | Points | What it means |
|---|---|---|
| `credentials_request` | 0.25 | asks for PIN, TAN, passwords, card number, SMS code |
| `payment_request` | 0.25 | transfer, "safe account", cash or gold handed to a courier |
| `gift_cards` | 0.25 | gift cards, vouchers, crypto |
| `remote_access` | 0.25 | AnyDesk, TeamViewer and similar |
| `impersonation` | 0.20 | bank, police, prosecutor, tax office, Microsoft |
| `family_emergency` | 0.20 | relative in an accident, arrested, in hospital (Enkeltrick / Schockanruf) |
| `secrecy` | 0.20 | "don't tell anyone" |
| `urgency` | 0.15 | "right now", "today" |
| `foreign_origin` | 0.10 | call from abroad or hidden number |
| `unknown_number` | 0.05 | not in trusted contacts |
| `first_contact` | 0.05 | never called before |

Score = sum of points of the signs found, capped at 1.0. A trusted number gets no number points.

**Critical combo:** a money or code request (`credentials_request`, `payment_request`, `gift_cards`, `remote_access`) together with pressure (`secrecy`, `impersonation`, `family_emergency`) always scores at least 0.6, because that pair is the core of nearly every phone scam.

## 3. Decide

| Score | Level | Zone | Ellie does |
|---|---|---|---|
| < 0.3 | SAFE | green | nothing |
| 0.3–0.59 | CAUTION | yellow | listens closely |
| 0.6–0.79 | WARN | red | whispers a warning to the elder only, texts the family |
| ≥ 0.8 | INTERCEPT | red | mutes the caller, tells the elder to hang up |

Each action fires once per call.

## Example: fake bank call

| Caller says | New sign | Score | Level |
|---|---|---|---|
| (unknown number, first call) | unknown number, first contact | 0.10 | SAFE |
| "…Sparkasse security department" | impersonation | 0.30 | CAUTION |
| "…act right now" | urgency | 0.45 | CAUTION |
| "Don't tell anyone…" | secrecy | 0.65 | WARN → warning + SMS |
| "Read me the TAN code" | credentials request | 0.90 | INTERCEPT → caller muted |
| "…to a safe account" | payment request | 1.00 | INTERCEPT |

A call from the doctor's practice (trusted number, no signs) stays at 0.00.

## Why fixed points instead of asking the AI for a number

- The same call always gets the same score.
- Every point can be explained to the user, the family and the judges.
- Thresholds can be tuned on data without retraining anything.
- If the AI is unavailable, the score still works.

## Next steps to improve

- Tune weights and thresholds on labelled transcripts (e.g. public scam-call datasets) and measure precision and recall.
- Add signs: voice-clone indicators, caller-ID spoofing data from the carrier, number reputation lists (e.g. Bundesnetzagentur blocklists).
- Per-person tuning: trusted contacts, typical callers, language.
