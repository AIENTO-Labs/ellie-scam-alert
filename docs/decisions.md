# Decisions and open items

Log anything agreed in the WhatsApp group here, so the repo stays the source of truth.

## Agreed

- **Name: Ellie** ("elderly ally"), female voice, faceless avatar (blob or mascot, no human face).
- **Positioning:** end to end protection from scam calls: prevent, intercept, advise, report.
- **Reporting** is in scope: family text alert plus a report for German authorities. See docs/reporting.md.
- **Use case country:** Germany; demo in English.
- **Repo is the single source of truth.** Every teammate's Claude reads TEAM.md first.

- **Audience:** older adults (65+) and anyone vulnerable to phone scams. Protectors (family, carers, a trusted organisation) are the second user and receive the alerts.
- **Problem focus:** scams, with voice calls as the main attack on older people.
- **Demo:** voice only, one scam call that goes all the way to red. Scenario: **fake police** (locked 14:45).
- **Below 80 never interrupts the call;** it only shows warnings on screen. At 80 Ellie acts. The demo shows the 80+ case.
- **Other scenarios for README and slides:** relative arrested and needing money; fake police, tax office or immigration threatening arrest or fines.
- **Product:** web app, no download. A companion that prevents, intercepts and advises, with a chat for questions after the call. The chat is the fallback if the live pipeline is not ready.
- **Surfaces:** desktop, mobile, landline. Landline is a stated capability only; nothing is built for it.
- **Build scope:** web app front end, the demo call screen (as an inset frame in the web app), backend for transcript, enrichment and scoring.
- **Coordination:** WhatsApp group for talk, this repo as the source of truth.
- **Call demo (Jonno, 17 Oct):** the older woman is **Hildegard Müller**, called **Hilde** (replaces Helga); her daughter is Anna; the caller is "Detective Weber, Berlin police". Scenario is **fake police** asking for €2,000 in Google Play gift cards.
- **Call demo risk bands (Jonno, 17 Oct):** the score is shown 0 to 100 with four bands: green under 30, amber 30 to 59, orange 60 to 79, red 80 and over. **Ellie acts at 80** (private warning to Hilde, text to family, call ends). Scorer and docs updated to match (14:45).
- **Brand (design, 17 Oct 15:24):** the official kit is in `brand/` (start with `brand/brand-guide/ellie-brand-guide.html`). Elephant mark, navy `#0E2A3B`, brass `#C9A24A`, parchment `#F4F1E8`, seal red `#8E1B12` for scams; Bricolage Grotesque headlines, Atkinson Hyperlegible body. Applied to the web app and the call demo (Jonno). Risk band colours now use the brand verdicts: safe green, careful amber, an orange for high, seal red for scam.
- **Call demo voices:** ElevenLabs for all three speakers (Ellie, Hilde, caller). Ring tone and SMS chime are synthesised. See `app/call-demo/`.
- **Scoring (João, 14:45):** rules layer plus Claude Haiku every 10 to 15 s, Claude Sonnet for post-call texts and reports. Tactic keys match `script.js`. See docs/scoring.md.
- **Roles (14:33):** Jonno demo and video; Gamei and Anna pitch, storytelling, avatar; Ekaterina infrastructure and backend; João scoring, repo, submission.

## Submission format (from the event repo)

- Hard deadline 16:00: public repo, README, 2-minute demo video, plus the submission form (https://tally.so/r/1WPr9Q), one per team.
- Judges watch the demo first, then read the README.
- Six finalists pitch live at 16:40: 6 min demo plus 4 min Q&A.
- Judging: Impact 40, Working demo 20, Technical quality 20, Creativity 20.
- Theme: **AI education for everyone**, helping a real audience learn or use AI. Our framing: older adults using an AI companion on their side against AI-driven scams.

## Open

- Tagline under the name Ellie
- Demo scenario: fake police or fake bank fraud
- App shell around the call demo (companion chat, avatar): owner [NEEDS CONFIRMATION]
- Later idea, not for today: statistics dashboard and a database of scam transcripts
- Source for the annual loss figure
- How the app hears and cuts into a real call: speakerphone plus mic, call forwarding to a monitored line, or a landline adapter
- Recording law in Germany: wording of the opening announcement
