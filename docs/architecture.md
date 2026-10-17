# Architecture

Source: Jonno's flow, posted in the team chat at 14:14 and 14:37. Owner of the build: Ekaterina.

## Real call flow

```
Caller → Elder's number → (forwarded) → Twilio number
       → webhook returns TwiML:
           1. <Say> "This call is protected by Ellie"
           2. <Start><Stream> call audio → our WebSocket server
           3. <Dial><Conference> joins the elder's phone
WebSocket server → Deepgram streaming STT → Claude scam check → actions
```

## The pieces

- **Twilio number:** German numbers need a regulatory bundle (an address in that area code plus ID). Any Twilio number works for the demo.
- **Webhook:** when a call hits the number, Twilio asks our server what to do. We reply with TwiML: `<Say>` for the announcement, `<Start><Stream>` to stream audio, then `<Dial><Conference>` to connect the elder.
- **Media Streams:** Twilio sends raw call audio (8 kHz μ-law) over a WebSocket, with both sides on separate tracks, so we know which words are the caller's.
- **Server (Node, deployed anywhere):**
  - pipes the audio into Deepgram streaming for live transcripts, roughly 300 ms lag;
  - every 10 to 15 seconds, sends the rolling transcript to Claude Haiku for a score and reason (prompt: [prompts/scam-scorer.md](../prompts/scam-scorer.md));
  - runs the rules layer on every transcript chunk for instant tactic labels (see [scoring.md](scoring.md));
  - acts on a high score.
- **Actions through the Twilio REST API:**
  - **Coach mode:** a bot joins the conference and warns only the elder, so the scammer cannot hear it. This is Ellie's interception.
  - SMS or call a family member or other protector.
  - Hang up.

## Gotchas

- **Forwarding loop:** if all calls to the elder's number forward to Twilio, Twilio cannot dial that same number back. Fixes: port the elder's public number to Twilio and give the phone a new private SIM, or add a second eSIM line that only our bridge dials.
- **Caller ID:** pass the original caller's number through on `<Dial>` so the elder still sees who is calling. Check the German caller ID display rules (Rufnummernanzeige). [NEEDS CONFIRMATION]
- **Latency:** detection runs about 1 to 2 seconds behind speech. Fine, since scams take minutes to unfold.
- **Cost:** a few cents per minute in total (Twilio inbound, the outbound leg to the mobile, STT). [NEEDS DATA: check current Twilio DE pricing]

## Stack

Node + `twilio` + `ws` + `@deepgram/sdk` + `@anthropic-ai/sdk` + Claude Haiku.

```
pnpm add twilio ws @deepgram/sdk @anthropic-ai/sdk
```

The scorer in `backend/scoring/score.py` is Python so João can test scoring on scripts now. The prompt and the rule weights are the contract: port them into the Node server as is, so live and demo score the same way.

## Demo path (what the video shows)

The video does not need a live phone call. The call screen plays the scripted transcript with timed lines and the real scorer running on it, so the score, tactics and red banner are genuine output.

```
data/scam-transcripts/fake-police.md → scorer → call screen (app/)
```

If the live Twilio path works by 15:00, record it instead. If not, the scripted path is the demo and this document explains how it runs in production.

## Owners

| Piece | Owner |
|---|---|
| Twilio, WebSocket, Deepgram, conference and coach mode | Ekaterina |
| Scorer, prompts, rule weights | João |
| Call screen and video | Jonno |
| Ellie voice, avatar, story | Gamei, Anna |
