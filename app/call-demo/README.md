# Ellie call demo

The UI details (layout, colours, type, components, key moments) are in [UI-SPEC.md](UI-SPEC.md). The rendered video is [demo/call-demo.mp4](../../demo/call-demo.mp4).

A scripted scam call that plays through the Ellie UI: live transcript, scam-risk score, tactics, and the actions Ellie takes. No real phone call, speech-to-text or LLM runs; everything is driven by `script.js` and the pre-generated voices in `audio/`.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 5178 --directory app/call-demo
```

then go to http://localhost:5178.

| Key | Does |
|---|---|
| Space or click | Play / pause |
| ← / → | Previous / next beat |
| R | Restart |
| M | Mute |
| F | Full screen |

The control bar hides itself after 2.5 s without mouse movement.

## Embed it in the web app

The demo fills whatever box it is given and keeps a 1200×750 (16:10) layout, letterboxed.

```html
<iframe src="call-demo/index.html?controls=0&bg=transparent" style="width:100%;aspect-ratio:16/10;border:0" allow="autoplay; fullscreen"></iframe>
```

- `?controls=0` hides the presenter bar. Keyboard shortcuts and click-to-play still work.
- `?bg=transparent` removes the grey letterbox.

Drive it from the parent page:

```js
frame.contentWindow.postMessage({ type: 'ellie:play' }, '*');   // also ellie:pause, ellie:toggle, ellie:reset, ellie:seek (with t in seconds)
```

It posts `{ type: 'ellie:phase', phase, t }` to the parent when the phase changes. The phases are `idle`, `ringing`, `announcing`, `live`, `detected`, `intervening` and `ended`.

Browsers only play sound after a click or key press on the page, so start the demo with a click.

## Change the call

1. Edit `script.js`: lines, highlighted phrases, scam checks (score, tactics, Claude's reason) and voices.
2. Regenerate the voices:
   ```bash
   node build-audio.mjs
   ```
   Only changed lines are re-generated. ElevenLabs charges per character. Keys are read from the Keychain (`orch-eleven`, `orch-fish`) or from `ELEVEN_API_KEY` / `FISH_API_KEY`. Use `--say` for free macOS voices while drafting.
3. Reload the page. The timings follow the new audio automatically.

`audio/full-call.mp3` is the whole call as one file, to review or to use as a backup.

## Export a video

```bash
node render-video.mjs
```

This writes `exports/ellie-demo.mp4` (1920×1200, 30 fps, with the call audio). The demo must be served on localhost:5178 while it runs. Each frame is rendered at its exact time, so the video never drops frames. Use `--fps` and `--width` to change the output. It uses Google Chrome and the `playwright-core` library (it currently loads it from `~/Glidecast/node_modules`; change that path or `npm i playwright-core` on another machine).
