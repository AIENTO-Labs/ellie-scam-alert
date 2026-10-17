# Ellie backend

Listens to a phone call, scores the scam risk from 0 to 1 while people talk, steps in when money or codes are at stake, alerts the family, and feeds the family dashboard over REST and WebSocket.

## Quick start

```bash
cd backend
cp .env.example .env      # optional: add ANTHROPIC_API_KEY
npm install
npm start                 # http://localhost:8080 · data in memory
npm test                  # 21 tests: scoring, API, security, Twilio flow, Claude path
```
Try it without a phone: `curl -X POST localhost:8080/api/dev/simulate -H 'content-type: application/json' -d '{"kind":"scam"}'`, or point the dashboard at `http://localhost:8080`.

Needs Node 20.12+. Every external service is optional: without keys Ellie runs with keyword scoring, in memory, without phone.

## How it works

```
Caller ─► Twilio number ─► POST /twilio/voice ─► TwiML: "This call is protected by Ellie"
                                                  + stream both audio tracks + conference
                              └─► Twilio REST: dial the elder into the same conference

WS /twilio/media ─► Deepgram (caller track, elder track) ─► monitor.hear(text)
                                                               │
                  keywords (instant) ─ Claude Haiku (every 10 s, or at once on money/codes) ─ number check
                                                               │
                                          combine() ─► score 0..1 ─► SAFE · CAUTION · WARN · INTERCEPT
                                                               │
                         pipeline: save (memory / DynamoDB) + push (WS /live) ─► dashboard
                         actions:  WARN      ─► whisper to the elder only + SMS to family
                                   INTERCEPT ─► mute the caller + whisper "please hang up"
```

| Folder | What |
|---|---|
| `src/index.js`, `src/app.js` | start-up and wiring |
| `src/config.js` | every setting, from environment variables |
| `src/scoring/` | signals, scorer, number check, live monitor, warnings, reports, companion chat |
| `src/telephony/` | Twilio webhooks + TwiML, media stream, Deepgram, actions back into the call |
| `src/http/` | REST routes, tokens, CORS, rate limit |
| `src/live/pipeline.js` | the single write path: store + broadcast |
| `src/store/store.js` | DynamoDB or in-memory storage |
| `prompts/` | Claude prompts (edit without touching code) |
| `data/demo-calls.json` | fictional demo calls |
| `docs/scoring.md` | scoring model in detail |

## Scoring model

Details and rationale: [`docs/scoring.md`](docs/scoring.md). In short: Claude finds warning signs and quotes them; a fixed formula turns them into a score, so the same call always gets the same score and every point can be explained. A Claude quote that is not really in the transcript is dropped. If Claude is slow (8 s) or down, keywords keep working.

| Score | Level | Ellie does |
|---|---|---|
| < 0.3 | SAFE | nothing |
| 0.3–0.59 | CAUTION | listens closely |
| 0.6–0.79 | WARN | whispers a warning to the elder only, texts the family (once) |
| ≥ 0.8 | INTERCEPT | mutes the caller, tells the elder to hang up |

## API

Three access levels. Tokens are optional in development and required in production.

| Access | Header | Endpoints |
|---|---|---|
| public | none | `GET /health` |
| dashboard | `Authorization: Bearer $ELLIE_DASHBOARD_TOKEN` | `GET /api/bootstrap`, `GET /api/calls/:id`, `GET /api/calls/:id/report?kind=police\|bnetza\|bank`, `POST /api/calls/:id/ask {question}`, `POST /api/calls/:id/actions {action}`, `POST /api/score {text, channel, sender}`, `GET /api/config`, `POST /api/dev/simulate {kind}`, WS `/live?token=` |
| ingest | `Authorization: Bearer $ELLIE_API_TOKEN` | `POST /api/calls {caller_number}`, `POST /api/calls/:id/segments {speaker, text}`, `POST /api/calls/:id/end` |
| Twilio | Twilio signature + signed stream token | `POST /twilio/voice`, `POST /twilio/conference-status`, `POST /twilio/say/:id`, WS `/twilio/media` |

The ingest API lets any other source (a mobile app, a different phone provider, a recorded call) use Ellie without Twilio.

WS `/live` pushes `{ type: "call" | "segment" | "risk" | "alert", row }`.

## Connecting a real phone (Twilio + Deepgram)

1. Expose the backend over HTTPS, no account needed: `cloudflared tunnel --url http://localhost:8080`. Put the `https://….trycloudflare.com` address in `PUBLIC_URL`.
2. In `.env` set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_NUMBER`, `DEEPGRAM_API_KEY`, `PERSON_PHONE` (the elder's phone), `GUARDIAN_PHONE`.
3. In the Twilio console, set the number's **A call comes in** webhook to `POST {PUBLIC_URL}/twilio/voice`.
4. Call the Twilio number. Ellie announces itself, rings `PERSON_PHONE`, and listens.

Real deployment: forward the elder's line to the Twilio number. A forwarding loop is avoided by porting the elder's public number to Twilio, or by giving the elder's phone a second private line that only the bridge dials.

## Data model

Single DynamoDB table (`PK`, `SK`), region `eu-central-1`. Create it with `DDB_TABLE=Ellie npm run setup-aws`.

| PK | SK | Holds |
|---|---|---|
| `PERSON#id` | `PROFILE` / `GUARDIAN#id` | protected person, family contact |
| `PERSON#id` | `CALL#startedAt#callId` | history index, newest first |
| `CALL#id` | `META` | caller, number check, status, max risk, level, summary, next steps |
| `CALL#id` | `SEG#…` · `RISK#…` · `ALERT#…` | transcript lines · every score · every action |

Call data carries `expires_at` and is deleted by DynamoDB after `RETENTION_DAYS` (30). No audio is ever stored. Without `DDB_TABLE` the same interface runs in memory (capped at 500 calls).

## Deploy

- **Anywhere with Docker**, from this folder: `docker build -t ellie-backend .` then `docker run -p 8080:8080 --env-file .env ellie-backend`.
- **AWS:** EC2, ECS Fargate or Elastic Beanstalk behind HTTPS, with an IAM role limited to the one table and secrets in Secrets Manager. Not Lambda: calls need long-lived WebSockets.
- **Hackathon:** laptop + `cloudflared` (above).

## Security and privacy

**In place**
- Separate tokens for dashboard and ingest, compared in constant time; dashboard WebSocket checks the token.
- Twilio webhooks verified with `X-Twilio-Signature` (on by default in production); media stream needs an HMAC token tied to the CallSid.
- CORS allowlist, rate limit per IP, request size limits, input validation, security headers, no stack traces in responses.
- The elder's phone number is never sent to the browser.
- AI safeguards: invented quotes dropped, unknown signal ids ignored, prompts tell Claude to ignore instructions inside the transcript, timeouts with keyword fallback.
- Privacy: no audio stored, data in the EU, auto-delete after 30 days, DynamoDB encryption at rest. Ellie prepares reports; a person sends them.
- Start-up warnings when a production setting is missing.

**Before real users**
- Real user accounts (e.g. Amazon Cognito) so each family sees only its own calls; today one deployment protects one person.
- Secrets in AWS Secrets Manager, HTTPS only, WAF in front for rate limiting at scale.
- Mask IBANs and card numbers in transcripts before saving.
- Legal: recording or transcribing calls in Germany needs consent (§201 StGB), and an announcement alone may not be enough. GDPR needs consent from the protected person, data processing agreements with Twilio, Deepgram and Anthropic, and a data protection impact assessment (vulnerable users).
- Audit log of who viewed which call.
