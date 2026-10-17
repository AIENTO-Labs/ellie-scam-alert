# Ellie call screen: UI spec

The call demo in this folder is the reference for the call screen. This file explains how it is put together, so the app shell and any other screens can match it. Open `index.html` to see every state; press → to jump between beats.

## Canvas

- One fixed stage of **1200 × 750** (16:10), scaled to fit its box and letterboxed. Design at this size; never reflow.
- Three rows: header (72 px), body, pipeline footer (52 px). The body is two columns: transcript (flexible) and a 440 px side column.
- Corner radius 14 on the stage and on every card. Cards are white on a pale green-grey ground with a 1 px border.

## Rebranding

The brand comes from the official kit (the repo's `brand/` folder). **`brand/brand.css`** maps its tokens (`brand/ellie-tokens.css`) onto the demo, and the logo is **`brand/logo.png`** (the navy badge, used in the header and the waiting screen) plus **`brand/icon.png`** (the full-bleed square, cropped round as Ellie's avatar on Anna's phone). Tints, glows, highlight fills and the sparkline are mixed from the base colours, so nothing else needs editing. The phone screen keeps iPhone's own colours on purpose.

## Colour

Current values (the names are the variables in `brand/brand.css`):

| Token | Value | Use |
|---|---|---|
| `--ground` | `#EEF2F5` | cool navy-tinted grey: stage ground (the brand's parchment read too warm on screen) |
| `--surface` | `#FFFFFF` | cards |
| `--ink` | `#0E2A3B` | text (navy) |
| `--muted` | `#4C5D66` | labels, secondary text |
| `--line` | `#DCE3E8` | borders |
| `--bubble` | `#E9EEF2` | caller's bubbles |
| `--brand` | `#0E2A3B` | navy: Ellie's bubble, done actions, wordmark |
| `--brand-tint` | `#F4ECD8` | brass wash: Hilde's bubbles, brand pills |
| `--brass` | `#C9A24A` | the dot on the i in the wordmark |
| `--low` | `#155C37` | risk under 30 (brand "safe") |
| `--watch` | `#E3A21A` | risk 30 to 59 (brand "careful" mark) |
| `--high` | `#C0601A` | risk 60 to 79 |
| `--scam` | `#8E1B12` | risk 80 and over (seal red); Ellie acts at 80 |

Highlight fills for flagged phrases are mixed from the risk colours. Ellie's outline gradient is `--ellie-a` → `--ellie-b` → `--ellie-c` (cream `#FDD9B5` → brass `#C9A24A` → deep brass `#8A6A22`); brass is also the glow.

## Type

- **Atkinson Hyperlegible** for everything you read (transcript 17 px, Ellie 18 px, UI 14 to 16 px).
- **Bricolage Grotesque** bold for the big numbers, and ExtraBold for the wordmark ("Ellie" with a brass dot on the i; markup in `brand/brand.css`) (risk score 64 px, summary title 30 px).
- **JetBrains Mono** for small uppercase labels (12 px, 0.08em tracking), timers and timestamps.

## Components and states

**Header.** Logo badge and the "Ellie" wordmark, elder's name and protected number, a status pill and the call timer. Pill states: Protected (navy), Incoming call (amber), Announcing / Live (green, dot blinks), Scam detected / Intervening (red, dot blinks), Call ended (grey).

**Transcript.** Chat bubbles: caller on the left in grey with "Caller · number" above; Hilde on the right in a light brass wash. Words stream in with a 0.35 s speech-to-text lag and a blinking cursor. The announcement is a dashed, centred system line. Newest line stays at the bottom.

**Flagged phrases.** When Claude flags a tactic, its phrase gets a highlight band centred on the letters that sweeps in left to right (0.5 s), and a small mono tag (AUTHORITY, URGENCY, SECRECY, GIFT CARDS) fades in floating just above the phrase. The tag never takes space in the sentence, so the text does not jump. Trailing punctuation stays outside the highlight.

**Scam risk card.** Big score with "/100", level name in the level colour, and "Last check mm:ss". A segmented bar (green, amber, orange, red) with a black tick at 80. A sparkline of the score over the call with a dashed red "ACTS AT 80" line. One line from Claude explaining the latest score; while a check runs it reads "Checking the conversation…". Each new score counts up over 0.7 s. Crossing 80 flashes the card red once.

**Tactics detected.** Every tactic Ellie looks for is always listed, greyed out, so viewers see what it watches for. A flagged tactic gets a coloured dot (with a ping) and its quote underneath, one line, truncated.

**Actions.** Three tiles: Warn Hilde privately, Text Anna (daughter), End the call. States: Ready at 80 (grey), Triggering… (red tint), Done mm:ss (navy).

**Pipeline footer.** Call audio → Speech to text → Scam check → Action, each node lights green while it is working, plus "Simulated call" on the right so nobody thinks it is live.

## Key moments

| Moment | What happens |
|---|---|
| Incoming call | Card over the transcript: phone icon with pulsing rings, the number, "Unknown number · Berlin". Ring tone plays. |
| Ellie speaks | The whole stage dims and blurs slightly (0.6 s). Ellie's bubble pops in at full size (navy, white text) with a glow, and a gradient outline draws around it in 1.5 s, then shimmers slowly. A white pill above it reads "Ellie · only Hilde hears this". Her words type in. The dim lifts about 1 s after she finishes. |
| Family alert | Anna's phone slides up over the right column (above the dim): a Messages-style screen with Ellie as the contact, "Text Message · Today 14:07" and a grey incoming bubble with the alert and Hilde's number. |
| Call ended | A summary replaces the transcript: "Scam call stopped", call length, peak risk, €0 lost, and a timeline of what happened with times and coloured dots. |
| Report | 4.5 s later the final screen covers the whole stage: "Report the scam call", the incident report Ellie drafted. Six fact tiles (type, what the caller said, money lost, when, number, demand), the statement for the police typing in, evidence chips popping in, and on the right where to send it (Berlin Police with the main "Review and send" button, which pulses twice in brass; Bundesnetzagentur; the bank, not needed) and who sends it (in Hilde's name, Anna checks it first). Its wording lives in `script.js` under `report`. |

## How it is driven

- `script.js` holds the whole call: speakers and voices, every line, the phrases to highlight, the scam checks (when each fires, the score, the tactics, Claude's reason, the summary line), Anna's text and the final report.
- `audio/durations.js` (generated) holds each clip's length; the timeline is built from it, so changing a line re-times everything.
- The screen is a pure function of time: `render(t)` draws the exact state for any second, which is why scrubbing, beat jumps and the frame-perfect video export work.

## Embedding in the app shell

```html
<iframe src="call-demo/index.html?controls=0&bg=transparent" style="width:100%;aspect-ratio:16/10;border:0" allow="autoplay; fullscreen"></iframe>
```

Control it with `postMessage({ type: 'ellie:play' | 'ellie:pause' | 'ellie:toggle' | 'ellie:reset' | 'ellie:seek', t })`. It posts `{ type: 'ellie:phase', phase }` back as the call moves through idle, ringing, announcing, live, detected, intervening, ended and report. Browsers only allow sound after a click inside the frame.
