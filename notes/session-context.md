# Session context (João's Claude session, 12:30 to 14:35)

Summary of how the plan evolved, so every teammate's Claude has the same background. Decisions are binding only once they are in [docs/decisions.md](../docs/decisions.md).

## Timeline

| Time | What happened |
|---|---|
| 12:30 | Idea settled: protect older adults from scams. Web app, no download. Voice call is the demo; email, SMS and WhatsApp are product scope only. |
| 12:44 | Rules clarified by the team: the 2-minute video is pure demo, no pitch. Only the top six pitch live (6 min plus 4 min Q&A). Scenarios listed: relative arrested, fake police or tax office, fake bank fraud. Scoring model agreed (0 to 1 probability, about 10 to 20 signals). Interception idea: lower the caller's audio and cut in with a warning voice. Recording needs an announcement in Germany, which also deters scammers. |
| 12:48 | Build split: web app front end, the call screen as an inset frame, backend for transcript and scoring. Landline is a capability, not built. Repo is the only judged artefact. |
| 12:52 | Event repo read. Theme is "AI education for everyone": help a real audience learn or use AI. Judging: Impact 40, Working demo 20, Technical 20, Creativity 20. Submission is a new public repo from the starter template plus the Tally form; no folders or PRs in the event repo. |
| 13:00 | Name **Ellie** ("elderly ally"), female voice, faceless avatar. Positioning: prevent, intercept, advise, report. Reporting to German authorities added. Jonno's demo beats: Officer Weber, Berlin Police, calls Helga; tactics light up; red at 90; text to her daughter or son. |
| 13:07 | Yellow never interrupts the call, it only shows a pay-attention state. Red interrupts. Demo shows the red case. |
| 14:14, 14:37 | Jonno posted the real call flow: Twilio forwarding, Media Streams, Deepgram STT, Claude Haiku every 10 to 15 s, coach mode, forwarding loop and caller ID gotchas. See [docs/architecture.md](../docs/architecture.md). |
| 14:20 | Repo created as `AIENTO-Labs/ellie-scam-alert` (private until João flips it public), all teammates invited. |
| 14:33 | Final roles set (below). Scoring approach and model choice written up in [docs/scoring.md](../docs/scoring.md). |
| 14:45 | Jonno pushed `app/call-demo` and `demo/call-demo.mp4`: Rose Miller, Detective Weber, €2,000 Google Play cards, 0 to 100 score, Ellie acts at 80, ElevenLabs voices. Scorer and docs aligned to it; real scorer crosses 80 on the same line as the demo. |
| 14:35 | Audience widened: older adults and anyone vulnerable to phone scams, with protectors (family, carers, a trusted organisation) getting the alerts. |

## Roles

| Person | Owns |
|---|---|
| Jonno | Demo screen and the 2-minute video |
| Gamei | Pitch, storytelling, Ellie avatar |
| Anna | Pitch, storytelling, Ellie avatar |
| Ekaterina | Infrastructure and backend (call flow, streaming, speech to text) |
| João | Scoring model for the demo, repo, README, submission form |

## Open at 14:35

- Source for the annual loss figure (README still says 160 billion, unsourced).
- Repo must be made public before 16:00 (João).
- Demo video link (Google Drive, set to anyone with the link) goes into the Tally form, which is filled but not submitted.
