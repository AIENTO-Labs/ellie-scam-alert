# Demo script (2:00, pure demo)

Round one is judged on the 2-minute video only, then the README. No pitch inside the video, so the story has to be told by the demo itself.

## Screen

- Waveform showing the live call
- Transcript underneath, highlighting word by word
- Heuristics panel on the right, signals firing as the model judges the call
- Status moves green → yellow → red
- On crossing the top threshold: full-width banner and the companion voice cuts in

## Beats (John's current version)

1. Idle: screen says the line is protected.
2. Phone rings. Announcement: "This call is protected by Ellie."
3. Connected, transcript starts, status green.
4. Caller: "Hi, this is Officer Weber, Berlin Police..." Tactics light up as they are heard: authority impersonation, urgency, secrecy.
5. Score passes 90, status red, actions fire: Ellie's voice cuts in for Helga ("Police never ask for gift cards or codes. You can hang up.").
6. Final shot: text message preview going out to Helga's daughter or son.

Scenario is open between fake police (John's beats) and fake bank fraud (earlier plan). [NEEDS CONFIRMATION]

## Earlier timed version

| Time | What happens |
|---|---|
| 0:00 to 0:20 | An older woman at home, unknown number rings. The companion announces the call is protected. Caller: "Sparkasse security team". |
| 0:20 to 0:55 | Caller claims a suspicious transfer and asks for her TAN. Transcript streams, signals light up, score passes 0.5, soft prompt appears. |
| 0:55 to 1:25 | Caller pushes a transfer to a "safe account" and says not to tell anyone. Score passes 0.9, caller audio drops, companion voice tells her to hang up. |
| 1:25 to 1:45 | She hangs up. Her son's phone shows the alert with the transcript. |
| 1:45 to 2:00 | She asks the companion "was that real?" and gets a two-sentence answer. End card: name, repo, and a line that email, SMS and WhatsApp use the same model. |

## Cast

- Older woman: Helga (fictional). Actor [NEEDS CONFIRMATION]
- Scammer: [NEEDS CONFIRMATION] (actor, or a generated voice)

Full dialogue: to be written.
