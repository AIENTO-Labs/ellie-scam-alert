# TEAM.md · master file for every teammate's Claude

Read this file, then `CLAUDE.md`, then `docs/decisions.md` at the start of every session. If something you are about to build or write disagrees with these files, follow the files and tell your teammate. If a decision changes, update `docs/decisions.md` in the same commit.

## What we are building

**Ellie** (from "elderly ally"): an AI companion for older adults that protects them from scam calls end to end.

1. **Prevent:** announces at the start of a call that it is protected by Ellie.
2. **Intercept:** scores the live transcript; above 90 it lowers the caller's audio and cuts in with a spoken warning.
3. **Advise:** tells the user what to do now (hang up, call the bank on the number on the card) and answers "was that real?" afterwards.
4. **Report:** alerts the family by text and prepares a report for the authorities.

Audience: older adults (65+) and anyone vulnerable to phone scams, in Germany first. Protectors: family, carers or a trusted organisation get the alerts. Demo language: English. Never describe users by ability or intelligence; say "vulnerable to scams".

## Fixed choices (do not change without the team)

- Name: **Ellie**. Product line: "Ellie, your ally against scam calls" [NEEDS CONFIRMATION on tagline]
- Voice: **female**, calm and soft
- Avatar: **faceless**, a blob or mascot shape, never a human face
- Status colours: green (under 0.5), yellow (0.5 to 0.89), red (0.9 and above)
- Tactic labels shown on screen: authority impersonation, urgency, secrecy, payment request, credential request, threat
- Platform: web app, no download. Desktop and mobile shown; landline is a stated capability only
- Deadline: **16:00 hard**. Repo, README and `demo/demo.mp4`. Feature freeze 15:00

## Where things go

| Path | Owner | What |
|---|---|---|
| `app/` | Jonno | call screen and Ellie web app |
| `app/avatar/` | Gamei, Anna | Ellie avatar |
| `backend/` (call flow, streaming, STT) | Ekaterina | Twilio, WebSocket, speech to text |
| `backend/scoring/`, `prompts/` | João | scorer and Claude prompts |
| `data/scam-transcripts/` | João | demo scripts and scam phrases, fake data only |
| `docs/` | João | decisions, scoring, architecture, demo script, reporting, tasks |
| `demo/` | Jonno | `demo.mp4` |
| `slides/` | Gamei, Anna | pitch slides for the finals |

Background for everything above: `notes/session-context.md`.

Do not edit another owner's folder without telling them in WhatsApp.

## Rules for every Claude working in this repo

- `git pull` before you start, commit and push after each small step.
- No API keys in code. Read `ANTHROPIC_API_KEY` from `.env`.
- No real personal data or real phone numbers. Use fake names (Helga, Officer Weber) and fake numbers.
- Never invent statistics. Write `[NEEDS DATA]` and leave it for the research owner.
- Writing style: no em dashes or double dashes; plain English for a senior reader and an older user.
- Keep the demo path working above everything else. Cut scope before you miss 15:00.
