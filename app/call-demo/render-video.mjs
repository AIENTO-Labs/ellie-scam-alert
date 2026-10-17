#!/usr/bin/env node
// Renders the demo to an MP4 (exports/ellie-demo.mp4): steps the page through time frame by frame in headless
// Chrome, freezing every CSS animation at the exact frame time, then muxes audio/full-call.mp3 (same timeline).
//
//   node render-video.mjs [--fps 30] [--width 1920]
//
// Needs the demo served on http://localhost:5178 (see README) and ffmpeg. Uses the Playwright library from
// ~/Glidecast and the installed Google Chrome.

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? +argv[i + 1] : d; };
const FPS = opt('--fps', 30), W = opt('--width', 1920), H = Math.round(W * 750 / 1200);
const URL = process.env.ELLIE_URL || 'http://localhost:5178/';
const OUT = path.join(ROOT, 'exports', 'ellie-demo.mp4');

const { chromium } = createRequire(import.meta.url)(path.join(process.env.HOME, 'Glidecast/node_modules/playwright-core'));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(`${URL}?controls=0&render=1`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.ellie.duration);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const ff = spawn('ffmpeg', ['-v', 'error', '-y',
  '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-i', path.join(ROOT, 'audio', 'full-call.mp3'),
  '-map', '0:v', '-map', '1:a', '-af', 'apad', '-shortest',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', '192k', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });

const frames = Math.ceil(duration * FPS);
const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  const t = i / FPS;
  await page.evaluate(t => {
    window.ellie.renderAt(t);
    // freeze every CSS animation/transition at its own elapsed time (started = first frame we saw it)
    const seen = (window.__anim ??= new WeakMap());
    for (const a of document.getAnimations()) {
      if (!seen.has(a)) seen.set(a, t);
      a.pause();
      a.currentTime = (t - seen.get(a)) * 1000;
    }
    // SMIL (the shimmering gradient on Ellie's bubble outline)
    for (const svg of document.querySelectorAll('svg')) if (svg.querySelector('animateTransform')) { svg.pauseAnimations(); svg.setCurrentTime(t); }
  }, t);
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % (FPS * 5) === 0) process.stdout.write(`\r${(t).toFixed(0)}s / ${duration.toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => c ? rej(new Error(`ffmpeg exited ${c}`)) : res()));
await browser.close();
console.log(`\nWrote ${OUT} (${frames} frames, ${W}×${H} @ ${FPS} fps) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
