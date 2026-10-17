# Ellie

**One line:** Ellie (from "elderly ally") is an AI companion that listens to calls with older adults, scores the scam risk live, cuts in with a warning before money moves, alerts the family and prepares a report for the authorities.

> Repo name `scamalert` is the working name. Teammates: start with [TEAM.md](TEAM.md).

## Audience, problem, demo (one sentence each)

1. **Who:** older adults (65+) living independently, and the adult children who worry about them.
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
- **Covers more than calls:** email, SMS and WhatsApp run through the same scoring model. Desktop, mobile and landline are in scope; the demo shows a call on the web app.

Scoring model and thresholds: [docs/scoring.md](docs/scoring.md)

## How Claude is used

- Reads the live transcript and scores it against the scam signals in [docs/scoring.md](docs/scoring.md). [NEEDS CONFIRMATION: model name, check docs.claude.com]
- Writes the spoken warning and the next-step advice in plain language for an older user.
- Powers the companion chat after the call ("was that real?").

Prompts live in [`prompts/`](prompts/).

## How to run it

```bash
cp .env.example .env    # paste your ANTHROPIC_API_KEY into .env
# start commands: to be added by the build team
```

**Live link (if any):** to be added

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
docs/        scoring model, demo script, decisions, architecture
notes/       team notes and raw transcripts of our planning
demo/        demo video
slides/      slide images and PDF for the finals
```

## Team

| Name | Role / background |
|---|---|
| João Diogo | Founder: repo, story, positioning, README, slides |
| John [NEEDS CONFIRMATION: surname] | Product or design: wireframes, call screen, demo video |
| Gamei Chin | Builder: Ellie avatar |
| [NEEDS CONFIRMATION] | Domain expert: impact data, reporting |
| [NEEDS CONFIRMATION] | Builder: app shell, scoring |

## Credits

To be added: libraries, APIs and assets used.
