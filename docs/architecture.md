# Architecture

## Real call flow (Jonno, 14:14)

```
Caller → Elder's number → (forwarded) → Twilio number
       → webhook returns TwiML:
           1. <Say> "This call is protected by Ellie"
           2. <Start><Stream> call audio → our WebSocket server
           3. <Dial><Conference> joins the elder's phone
WebSocket server → streaming speech to text → scoring → actions
```

- **Twilio number:** German numbers need a regulatory bundle (an address in that area code plus ID). For the demo, any Twilio number works.
- **Media Streams:** Twilio sends raw call audio (8 kHz μ-law) over a WebSocket.
- **Speech to text:** streaming STT on that audio. [NEEDS CONFIRMATION: provider, owner Ekaterina]
- **Scoring:** see [scoring.md](scoring.md). Runs on each new transcript chunk.
- **Actions at red:** inject Ellie's warning into the conference (lower the caller leg, play TTS to the elder), start recording, send the family SMS, draft the report.

## Demo path (what the video shows)

The video does not need a live phone call. The call screen plays a scripted transcript with timed lines and the real scorer running on it, so the score, tactics and red banner are genuine output, not hard-coded.

```
scripted transcript (data/scam-transcripts/) → scorer (backend/scoring/) → call screen (app/)
```

If the live Twilio path works by 15:00, record it instead. If not, the scripted path is the demo and the Twilio flow goes in the README as how it runs in production.

## Owners

| Piece | Owner |
|---|---|
| Twilio, WebSocket, STT, conference control | Ekaterina |
| Scorer and prompts | João |
| Call screen and video | Jonno |
| Ellie voice, avatar, story | Gamei, Anna |
