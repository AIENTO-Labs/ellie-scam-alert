# Demo script (2:00, pure demo)

Round one is judged on the 2-minute video only, then the README. No pitch inside the video, so the story has to be told by the demo itself.

## Screen

- Waveform showing the live call
- Transcript underneath, highlighting word by word
- Heuristics panel on the right, signals firing as the model judges the call
- Status moves green → yellow → red
- On crossing the top threshold: full-width banner and the companion voice cuts in

## Beats (Jonno's current version)

1. Idle: screen says the line is protected.
2. Phone rings. Announcement: "This call is protected by Ellie."
3. Connected, transcript starts, status green.
4. Caller: "Hi, this is Officer Weber, Berlin Police..." Tactics light up as they are heard: authority impersonation, urgency, secrecy.
5. Score passes 80, status red, actions fire: Ellie's voice cuts in for Rose ("Police never ask for gift cards or codes. You can hang up.").
6. Final shot: text message preview going out to Rose's daughter Anna.

Built version: `app/call-demo` (Rose Miller, Detective Weber, €2,000 in Google Play cards, Ellie acts at 80). Rendered: `demo/call-demo.mp4`. This file's beats are the plan; `app/call-demo/script.js` is the truth.

## Earlier timed version

| Time | What happens |
|---|---|
| 0:00 to 0:20 | An older woman at home, unknown number rings. The companion announces the call is protected. Caller: "Sparkasse security team". |
| 0:20 to 0:55 | Caller claims a suspicious transfer and asks for her TAN. Transcript streams, signals light up, score passes 0.5, soft prompt appears. |
| 0:55 to 1:25 | Caller pushes a transfer to a "safe account" and says not to tell anyone. Score passes 0.9, caller audio drops, companion voice tells her to hang up. |
| 1:25 to 1:45 | She hangs up. Her son's phone shows the alert with the transcript. |
| 1:45 to 2:00 | She asks the companion "was that real?" and gets a two-sentence answer. End card: name, repo, and a line that email, SMS and WhatsApp use the same model. |

## Cast

- Elder: Rose Miller, daughter Anna (fictional)
- Caller: "Detective Weber"
- All three voices: ElevenLabs

Dialogue: `app/call-demo/script.js`, mirrored in [data/scam-transcripts/fake-police-rose.md](../data/scam-transcripts/fake-police-rose.md) for the scorer. The scorer crosses 80 on the gift card line, same as the demo.
