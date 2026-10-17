# Ellie

**One line:** Ellie (from "elderly ally") is an AI companion that listens to calls with older adults and other people vulnerable to scams, scores the scam risk live, cuts in with a warning before money moves, alerts the family and prepares a report for the authorities.

> Repo name `scamalert` is the working name. Teammates: start with [TEAM.md](TEAM.md).

## Audience, problem, demo (one sentence each)

1. **Who:** older adults (65+) and anyone vulnerable to phone scams, plus the protectors who look out for them: family, carers or a trusted organisation.
2. **Their problem with AI today:** AI is used against them (cloned voices, scripted scam calls) while they have no AI on their side, and phone calls leave them the least time to think.
3. **What the demo lets them do:** take a call with Ellie listening in, which spots a scam call as it happens, warns them in plain speech, and tells their family.

## The problem

Scam calls aimed at older people use urgency, authority and secrecy: a fake bank fraud department, police or tax office, or a relative "arrested" and needing money. Annual losses worldwide were put at 160 billion in team discussion. [NEEDS CONFIRMATION: figure and source]

## What it does

- **Prevents:** announces at the start of the call that it is protected and may be recorded, which is the legal notice in Germany and also deters scammers. [NEEDS CONFIRMATION on §201 StGB]
- **Detects:** transcribes the call live, enriches it (unknown number, origin, first contact) and scores scam probability from 0 to 1.
- **Intercepts:** above the top threshold it lowers the caller's audio, cuts in with a spoken warning, starts recording and alerts a family member.
- **Advises:** tells the user what to do next (hang up, call the bank on the number on the card) and answers "was that real?" after the call.
- **Reports:** texts the family with what happened and prepares a report for the police, the Bundesnetzagentur or the bank. See [docs/reporting.md](docs/reporting.md).
- **Covers more than calls:** SMS, WhatsApp and email go through the same Claude scorer in the Ask Ellie box. Desktop, mobile and landline are in scope.

Scoring model and thresholds: [docs/scoring.md](docs/scoring.md)

## How Claude is used

- Reads the live transcript chunk by chunk (Claude Haiku) and returns a scam probability, the tactics it sees with quoted evidence, and a one-line warning. A rules layer runs alongside so the demo never depends on one API call. See [docs/scoring.md](docs/scoring.md).
- Writes the post-call family text and the authority report (Claude Sonnet).
- Writes the spoken warning and the next-step advice in plain language for an older user.
- Powers the companion chat after the call ("was that real?").

Prompts live in [`prompts/`](prompts/).

## How to run it

```bash
cp .env.example .env              # paste your ANTHROPIC_API_KEY into .env
pip install anthropic
python backend/server.py          # open http://localhost:8000
```

The web app (`app/index.html`) has two parts:

- **Ask Ellie:** paste an SMS, WhatsApp or email and get a 0 to 100 scam score, the tactics found, a plain-language reason and what to do next. Uses Claude when the server has a key; falls back to built-in rules otherwise, so it always works.
- **Call protection:** Jonno's simulated scam call (`app/call-demo`), embedded. Live transcript, score, Ellie's private warning at 80, text to the family.

Score a call transcript from the command line:

```bash
python backend/scoring/score.py data/scam-transcripts/fake-police-rose.md --offline
```

**Demo video:** `demo/call-demo.mp4`

## Screenshots / demo

- Demo video (2 min): `demo/demo.mp4` [to be added]
- Slides: `slides/` [to be added]
- Demo script: [docs/demo-script.md](docs/demo-script.md)

## Repo layout

```
app/         web app front end (companion, call screen)
backend/     transcript, enrichment, scoring
prompts/     Claude prompts
data/        sample scam transcripts (fake data)
docs/        scoring, architecture, demo script, decisions, tasks, reporting
notes/       team notes and raw transcripts of our planning
demo/        demo video
slides/      slide images and PDF for the finals
```

## Team

| Name | Role / background |
|---|---|
| João Diogo | Founder: scoring model, repo, README |
| Jonno | Product or design: call screen, demo video |
| Gamei Chin | Pitch, storytelling, Ellie avatar |
| Anna Son | Pitch, storytelling, Ellie avatar |
| Ekaterina | Builder: infrastructure, call flow, backend |

## Credits

To be added: libraries, APIs and assets used.
