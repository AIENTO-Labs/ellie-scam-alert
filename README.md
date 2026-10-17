<p align="center">
  <img src="brand/logo/ellie-logo-on-navy.png" alt="Ellie logo" width="128" height="128">
</p>

<h1 align="center">Ellie</h1>

<p align="center">
  <strong>Ellie answers first. Warns only you. Tells your family.</strong><br>
  An AI ally that protects older adults from scam calls, live.
</p>

<p align="center">
  <a href="https://claude.ai/artifact/FhAiZYWzYGdkVUK1qzXKMR"><img alt="Try Ask Ellie" src="https://img.shields.io/badge/Try_it-Ask_Ellie-1F2F45?style=for-the-badge"></a>
  <a href="https://drive.google.com/file/d/12LQO1TQQdEMnXaLGRYHTciPo-H4UdPCD/view?usp=sharing"><img alt="Watch the 2-minute demo" src="https://img.shields.io/badge/Watch-2--min_demo-C9A15B?style=for-the-badge"></a>
  <a href="#-run-it"><img alt="Run it" src="https://img.shields.io/badge/Run_it-locally-F3DEC4?style=for-the-badge"></a>
</p>

<p align="center">
  <img alt="Claude Haiku" src="https://img.shields.io/badge/Claude-Haiku_·_Sonnet-D97757">
  <img alt="Node.js" src="https://img.shields.io/badge/backend-Node.js-339933">
  <img alt="Python" src="https://img.shields.io/badge/scorer-Python-3776AB">
  <img alt="Tests" src="https://img.shields.io/badge/tests-21_passing-2EA44F">
  <img alt="Privacy" src="https://img.shields.io/badge/privacy-no_audio_stored-555">
</p>

---

**Ellie** (from *elderly ally*) is an AI companion that listens to calls with older adults and other people vulnerable to scams. It scores the scam risk live, cuts in with a warning before money moves, alerts the family, and prepares a report for the authorities.

| | |
|---|---|
| 👵 **Who** | Older adults (65+) and anyone vulnerable to phone scams, plus the people who look out for them: family, carers or a trusted organisation. |
| ⚠️ **Their problem with AI today** | AI is used *against* them (cloned voices, scripted scam calls) while they have no AI on their side, and a phone call leaves them the least time to think. |
| 🛡️ **What the demo shows** | A call with Ellie listening in: it spots the scam as it happens, warns the user in plain speech, and tells their family. |

## 📉 The problem

Scam calls aimed at older people use **urgency, authority and secrecy**: a fake bank fraud department, police or tax office, or a relative "arrested" and needing money.

<table>
  <tr>
    <td align="center" width="25%"><h2>$1.03&nbsp;T</h2>stolen by scammers worldwide in one year; only <b>4%</b> of victims get their money back</td>
    <td align="center" width="25%"><h2>€12&nbsp;B</h2>lost by households in Germany in one year; only <b>41%</b> of victims report it</td>
    <td align="center" width="25%"><h2>+64%</h2>losses to fake police officers in Germany: <b>€49.5&nbsp;M</b> in 2025, over €10,000 per case</td>
    <td align="center" width="25%"><h2>60+</h2>the age police call the "ideal victims" of shock calls</td>
  </tr>
</table>

- **Worldwide:** scammers took **$1.03 trillion** in one year. Phone calls and text messages are their main way in, and only **4%** of victims get their money back ([GASA & Feedzai, Global State of Scams 2024](https://gasa.org/knowledge-base/blog/global-state-of-scams-report-2024-1-trillion-stolen-in-12-months-gasa-feedzai)).
- **Germany:** households lost an estimated **€12 billion** in one year. 66% of adults met a scam, only **41%** of victims report it, and 56% are scammed more than once ([GASA & Worldline, State of Scams in Germany 2026](https://gasa.org/knowledge-base/blog/scams-continue-to-rise-in-germany-two-in-three-adults-encountered-a-scam-in-the-past-year)).
- **The fake-police call:** fake police officers took **€49.5 million** in Germany in 2025, up **64%** from €30.1 million in 2024, across 4,646 cases. Shock calls and the grandchild trick took another €49.0 million ([BKA via Tagesspiegel](https://www.tagesspiegel.de/gesellschaft/panorama/kriminalitat-schaden-durch-falsche-polizisten-stark-gestiegen-15918285.html)).
- **Who is targeted:** police classify shock calls as crimes aimed at seniors and call people over 60 "ideal victims" ([LKA Hessen via hessenschau](https://www.hessenschau.de/panorama/erfolgreiche-praevention-schockanrufer-in-hessen-finden-weniger-opfer-v1,schockanrufe-hessen-102.html)). Scammers search phone books for old-fashioned first names and short landline numbers ([Polizei NRW](https://polizei.nrw/sites/default/files/2023-09/formular_aenderung_loeschung-des-telefonbucheintrages.pdf)) and fake the caller ID, even 110.

## ✨ What Ellie does

| | Step | What happens |
|---|---|---|
| 🔔 | **Prevents** | Announces at the start of the call that it is protected and may be recorded. This is the recording notice in Germany and also deters scammers *(exact legal wording to be confirmed with counsel)*. |
| 🔍 | **Detects** | Transcribes the call live, enriches it (unknown number, origin, first contact) and scores the scam risk from 0 to 100. |
| ✋ | **Intercepts** | Above the top threshold it lowers the caller's audio, cuts in with a spoken warning that only the user hears, starts recording and alerts a family member. |
| 💬 | **Advises** | Tells the user what to do next (hang up, call the bank on the number on the card) and answers *"was that real?"* after the call. |
| 📝 | **Reports** | Texts the family what happened and prepares a report for the police, the Bundesnetzagentur or the bank. See [docs/reporting.md](docs/reporting.md). |
| 📱 | **Covers more than calls** | SMS, WhatsApp and email go through the same Claude scorer in the Ask Ellie box. Desktop, mobile and landline are in scope. |

Scoring model and thresholds: **[docs/scoring.md](docs/scoring.md)**

## 🧠 How Claude is used

```
 Call audio ─► speech to text ─► Claude Haiku: scam probability + tactics + quoted evidence
                                        │            ▲
                                        │     rules layer runs alongside (demo never depends on one API call)
                                        ▼
                       score 0 to 100 ─► warning to the user only ─► text to the family
                                        │
                                        ▼
                       Claude Sonnet: family message · authority report · "was that real?" chat
```

- **Live scoring (Claude Haiku):** reads the transcript chunk by chunk and returns a scam probability, the tactics it sees with quoted evidence, and a one-line warning. A rules layer runs alongside so the demo never depends on one API call. See [docs/scoring.md](docs/scoring.md).
- **After the call (Claude Sonnet):** writes the family text and the authority report.
- **Plain language:** writes the spoken warning and the next-step advice for an older user.
- **Companion chat:** answers *"was that real?"* after the call.

All prompts live in [`prompts/`](prompts/).

## ⚡ Try it in 60 seconds, nothing to install

| | Link | What you see |
|---|---|---|
| ▶️ | [Demo video, 1:24](https://drive.google.com/file/d/12LQO1TQQdEMnXaLGRYHTciPo-H4UdPCD/view?usp=sharing) | Ellie stops a fake police call to Hildegard Müller |
| 🧪 | [Ask Ellie](https://claude.ai/artifact/FhAiZYWzYGdkVUK1qzXKMR) | Paste a message, Claude scores it live |
| 📞 | [Call demo](https://aiento-labs.github.io/ellie-scam-alert/app/call-demo/) | The simulated call, with audio, in the browser |
| 🎙️ | [Live call](https://aiento-labs.github.io/ellie-scam-alert/app/live.html) | Your microphone is the phone line: speak as the caller, watch the score, hear Ellie step in at 80 |
| 📊 | [Pitch deck](slides/ellie-pitch-deck.pdf) | 11 slides: problem, Ellie, demo, how Claude is used |

The two GitHub Pages links run on built-in rules (a static site holds no API key). To put Claude behind the public pages, import this repo in Vercel and set `ANTHROPIC_API_KEY`: `vercel.json` serves `app/` at the root and `api/check.py` as the scoring endpoint, so `https://<project>.vercel.app/live.html` scores through Claude. The Pages copies can use it too with `?api=https://<project>.vercel.app/api/check`. An n8n alternative is in [backend/n8n/](backend/n8n/). Or run it locally below.

## ✅ What is real and what is simulated

| Piece | Status |
|---|---|
| Scoring: rules layer plus Claude Haiku, 0 to 100, Ellie acts at 80 | **Real.** `backend/scoring/score.py`, `prompts/scam-scorer.md`, offline tests in `tests/` |
| Ask Ellie: paste an SMS, WhatsApp or email, get a verdict | **Real.** Claude through `backend/server.py` or the claude.ai page; rules fallback without a key |
| Live call page: browser speech to text, scoring, spoken warning | **Real.** `app/live.html` |
| Node backend: Twilio call flow, Deepgram, scoring, alerts, reports | **Real, tested with simulated calls** (21 tests). Not yet connected to a phone number |
| The call in the video | **Simulated.** Scripted lines with ElevenLabs voices; the scores shown match what the real scorer produces on the same lines (`docs/scoring.md`) |
| Synthetic-voice detection | **Designed.** A scoring input exists (`--voice`); the detector is a vendor on the roadmap |

## 🚀 Run it

**Web app + Python scorer**

```bash
cp .env.example .env              # paste your ANTHROPIC_API_KEY into .env
pip install anthropic
python backend/server.py          # open http://localhost:8000
```

The web app (`app/index.html`) has three parts:

| Part | What you can do |
|---|---|
| **Ask Ellie** | Paste an SMS, WhatsApp or email and get a 0 to 100 scam score, the tactics found, a plain-language reason and what to do next. Uses Claude when the server has a key and falls back to built-in rules otherwise, so it always works. |
| **Call protection** (`app/call-demo`) | Jonno's simulated scam call: live transcript, score, Ellie's private warning at 80, text to the family. |
| **Live call** (`app/live.html`) | The laptop microphone is the phone line. Open it in Chrome, click *Answer the call*, and let someone play the caller or put a phone on speaker. Speech to text runs in the browser, the backend scores each line, and Ellie speaks the warning out loud at 80. Browsers without speech recognition get a typed fallback. |

**Score a transcript from the command line**

```bash
python backend/scoring/score.py data/scam-transcripts/fake-police-rose.md --offline
```

**Product backend (Node):** Twilio call flow, Deepgram transcripts, Claude scoring, family alerts, reports, security and 21 tests.

```bash
cd backend && npm install && npm start
```

The live page then scores through it. Details in [backend/README.md](backend/README.md).

**Tests**

```bash
python tests/test_scoring.py        # scorer: bands, combination rule, demo transcript crosses 80
cd backend && npm test              # 21 tests: scoring, API, security, Twilio flow, Claude path
```

## 🏗️ Architecture

- [docs/architecture.md](docs/architecture.md): the call flow (Twilio number, Media Streams, Deepgram, Claude every 10 to 15 s, coach mode that only the user hears), gotchas and the demo path.
- [docs/aws-architecture.md](docs/aws-architecture.md): the production design on AWS eu-central-1 (Fargate call bridge, Bedrock for Claude, DynamoDB, S3 with 30-day retention, Cognito) with GDPR and recording-law notes. The MVP does not run on it; it shows where the product goes once a bank, carrier or care provider asks for data residency.
- [docs/scoring.md](docs/scoring.md): signals, weights, thresholds, which model does what and why.

## 🗺️ Roadmap

1. **Silent "Hallo" calls:** a common probe in Germany where the caller says nothing and waits. Ellie answers unknown numbers first, so the user never speaks until the caller does; silence after the greeting ends the call and logs the number.
2. **Shared blocklist** built from every Ellie user's reports.
3. **Synthetic-voice check** as one more scoring input.
4. **Bank partnership:** a cooling-off delay on large transfers within an hour of a flagged call.
5. **Teach after every call:** Ellie explains the trick in two sentences, so the user recognises it next time.
6. **Family code word**, set during onboarding, so a real grandchild can prove who they are.

## 🎬 Demo script and decisions

- Demo script and beats: [docs/demo-script.md](docs/demo-script.md)
- Decisions log and open items: [docs/decisions.md](docs/decisions.md)
- How the day went, for context: [notes/session-context.md](notes/session-context.md)

## 🗂️ Repo layout

```
app/         web app: Ask Ellie, call screen, live call
backend/     Node backend (call flow, scoring, alerts, reports), Python scorer, n8n endpoint
tests/       offline scorer tests
prompts/     Claude prompts
data/        sample scam transcripts (fake data)
docs/        scoring, architecture, demo script, decisions, tasks, reporting
notes/       team notes and raw transcripts of our planning
demo/        demo video
slides/      pitch deck (PDF)
```

## 🔒 Privacy and safety

- No audio is stored, only text and scores, and call data is deleted automatically after 30 days.
- Data stays in the EU in the production design.
- Ellie never moves money or contacts the police by itself; it prepares, a person decides.
- Claude's evidence is checked against the transcript, so it cannot invent quotes.
- Recording and transcription need consent in Germany (§201 StGB); the legal setup will be reviewed with counsel before real use.

## 👥 Team

| Name | Role |
|---|---|
| **João Diogo** | Founder: scoring model, repo, README |
| **Jonno** | Product and design: call screen, demo video |
| **Gamei Chin** | Pitch, storytelling, Ellie avatar |
| **Anna Son** | Pitch, storytelling, Ellie avatar |
| **Ekaterina** | Builder: infrastructure, call flow, backend |

## 🙏 Credits

- [Anthropic Claude](https://www.anthropic.com): Haiku for live scoring, Sonnet for post-call reports, through the `anthropic` Python SDK
- [ElevenLabs](https://elevenlabs.io): voices for Ellie, Hilde and the caller in the simulated call
- [Twilio](https://www.twilio.com) and [Deepgram](https://deepgram.com): built into the production backend, not used in today's demo
- [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) and [Atkinson Hyperlegible](https://fonts.google.com/specimen/Atkinson+Hyperlegible) from Google Fonts; brand kit in `brand/`
- Claude Code and Claude.ai helped write code and docs; the team made every product decision
- Figures: GASA & Feedzai, Global State of Scams 2024; GASA & Worldline, State of Scams in Germany 2026; BKA Polizeiliche Kriminalstatistik 2025; LKA Hessen; Polizei NRW (links in [The problem](#-the-problem))

<p align="center"><sub>Made with care for everyone who has ever picked up a call they shouldn't have trusted.</sub></p>
