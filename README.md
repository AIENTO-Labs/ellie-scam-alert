# Ellie

**One line:** Ellie (from "elderly ally") is an AI companion that listens to calls with older adults and other people vulnerable to scams, scores the scam risk live, cuts in with a warning before money moves, alerts the family and prepares a report for the authorities.

**Ellie answers first. Warns only you. Tells your family.**

- Try it: [Ask Ellie](https://claude.ai/artifact/FhAiZYWzYGdkVUK1qzXKMR) (paste a message, Claude answers)
- Watch it: [2-minute demo video](https://drive.google.com/file/d/12LQO1TQQdEMnXaLGRYHTciPo-H4UdPCD/view?usp=sharing)
- Run it: see "How to run it" below

## Audience, problem, demo (one sentence each)

1. **Who:** older adults (65+) and anyone vulnerable to phone scams, plus the protectors who look out for them: family, carers or a trusted organisation.
2. **Their problem with AI today:** AI is used against them (cloned voices, scripted scam calls) while they have no AI on their side, and phone calls leave them the least time to think.
3. **What the demo lets them do:** take a call with Ellie listening in, which spots a scam call as it happens, warns them in plain speech, and tells their family.

## The problem

Scam calls aimed at older people use urgency, authority and secrecy: a fake bank fraud department, police or tax office, or a relative "arrested" and needing money. Consumers in 42 countries lost roughly $442 billion to scams in the past year, and 57% of adults surveyed were targeted ([GASA Global State of Scams 2025](https://www.feedzai.com/blog/gasa-global-state-of-scams-report/)). In Germany the fake-police call (falsche Polizeibeamte), the grandchild trick (Enkeltrick) and the shock call (Schockanruf) are the patterns police warn about most, and they are aimed at exactly the people with the least time to think on the phone.

## What it does

- **Prevents:** announces at the start of the call that it is protected and may be recorded, which serves as the recording notice in Germany and also deters scammers (exact legal wording to be confirmed with counsel).
- **Detects:** transcribes the call live, enriches it (unknown number, origin, first contact) and scores scam risk from 0 to 100.
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
- **Live call (`app/live.html`):** the laptop microphone is the phone line. Open it in Chrome, click "Answer the call", let someone play the caller or put a phone on speaker. Speech to text runs in the browser, each line is scored by the backend, and Ellie speaks the warning out loud at 80. Browsers without speech recognition get a typed fallback.

The product backend is `backend/` (Node): Twilio call flow, Deepgram transcripts, scoring, family alerts, reports, 21 tests. `npm install && npm start` in `backend/`, then the live page scores through it. See `backend/README.md`.

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
| João Diogo | Builder: scoring model, repo, README |
| Jonno Hill | Product or design: call screen, demo video |
| Gamei Chin | Domain Expert: Market Positioning, GTM |
| Anna Son | Domain Expert: Branding, Story Telling |
| Ekaterina | Builder: infrastructure, call flow, backend |

## Credits

- [Anthropic Claude](https://www.anthropic.com) (Haiku for live scoring, Sonnet for post-call reports) through the `anthropic` Python SDK
- [ElevenLabs](https://elevenlabs.io) voices for Ellie, Hilde and the caller in the simulated call
- [Twilio](https://www.twilio.com) and [Deepgram](https://deepgram.com) in the production design (not used in today's build)
- [Figtree](https://fonts.google.com/specimen/Figtree) and [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) from Google Fonts
- Claude Code and Claude.ai helped write code and docs; the team made every product decision
- Figures: [GASA Global State of Scams 2025](https://www.feedzai.com/blog/gasa-global-state-of-scams-report/)
