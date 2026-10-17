#!/usr/bin/env node
// Builds audio/ from script.js: one mp3 per line, the ring / hang-up / SMS tones, and audio/durations.js
// (which the demo reads to time the transcript and scores).
//
//   node build-audio.mjs            per voice: ElevenLabs if it has an `eleven` id, else Fish Audio if it has a `fish` id
//                                   (keys from ELEVEN_API_KEY / FISH_API_KEY or the Keychain items orch-eleven / orch-fish)
//   node build-audio.mjs --say      free macOS voices, for rehearsing
//   node build-audio.mjs --force    regenerate every line, even unchanged ones
//   node build-audio.mjs --say-for caller,rose   free macOS voices for just those speakers
//
// Fish Audio costs a little per character, so unchanged lines are reused (audio/.cache.json).

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'audio');
const TMP = path.join(OUT, '.tmp');
const argv = process.argv.slice(2);
const args = new Set(argv);
const SAY_FOR = new Set((argv[argv.indexOf('--say-for') + 1] ?? '').split(',').filter(() => argv.includes('--say-for')));
const FISH_MODEL = process.env.FISH_MODEL || 's2.1-pro';

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8'), ctx);
const S = ctx.window.ELLIE_SCRIPT;

fs.mkdirSync(TMP, { recursive: true });
const cachePath = path.join(OUT, '.cache.json');
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};

function keyFor(env, item) {
  if (args.has('--say')) return null;
  if (process.env[env]) return process.env[env];
  try { return execFileSync('security', ['find-generic-password', '-a', 'orch', '-s', item, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; }
  catch { return null; }
}
const KEY = keyFor('FISH_API_KEY', 'orch-fish');
const ELEVEN_KEY = keyFor('ELEVEN_API_KEY', 'orch-eleven');
const ELEVEN_MODEL = process.env.ELEVEN_MODEL || 'eleven_v3';

const ffmpeg = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);
const duration = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }));

// Call audio is band-limited like a real phone line; Ellie's voice stays a little clearer so it stands apart.
const EQ = {
  phone: 'highpass=f=280,lowpass=f=3400,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,loudnorm=I=-18:TP=-2',
  ellie: 'highpass=f=160,lowpass=f=7000,loudnorm=I=-17:TP=-2',
};

async function fishTTS(text, voice, file) {
  const body = { text, reference_id: voice.fish, format: 'wav', sample_rate: 44100, latency: 'normal', normalize: true,
                 prosody: { speed: voice.speed ?? 1, volume: 0 } };
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST', body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', model: FISH_MODEL },
    });
    if (res.ok) { fs.writeFileSync(file, Buffer.from(await res.arrayBuffer())); return; }
    const detail = (await res.text()).slice(0, 300);
    if (![429, 500, 502, 503].includes(res.status) || attempt === 2) throw new Error(`Fish Audio said ${res.status}: ${detail}`);
  }
}

// ElevenLabs v3 reads audio tags in the text, e.g. "[concerned] Rose, this is Ellie."
async function elevenTTS(text, voice, file) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.eleven}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: ELEVEN_MODEL, voice_settings: { stability: voice.stability ?? 0.5, similarity_boost: 0.75, speed: voice.speed ?? 1 } }),
  });
  if (!res.ok) throw new Error(`ElevenLabs said ${res.status}: ${(await res.text()).slice(0, 300)}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

function sayTTS(text, voice, file) {
  execFileSync('say', ['-v', voice.say, '-r', String(voice.rate ?? 175), '-o', file, text]);
}

async function buildLine(line) {
  const voice = S.voices[line.who];
  const text = (line.tags && ELEVEN_KEY && voice.eleven && !SAY_FOR.has(line.who) ? `${line.tags} ` : '') + (line.say ?? line.text);
  const engine = SAY_FOR.has(line.who) ? `say:${voice.say}:${voice.rate}`
               : ELEVEN_KEY && voice.eleven ? `eleven:${ELEVEN_MODEL}:${voice.eleven}:${voice.stability ?? 0.5}:${voice.speed ?? 1}`
               : KEY && voice.fish ? `fish:${FISH_MODEL}:${voice.fish}:${voice.speed ?? 1}`
               : `say:${voice.say}:${voice.rate}`;
  const hash = crypto.createHash('sha1').update(`${engine}|${text}`).digest('hex').slice(0, 12);
  const out = path.join(OUT, `${line.id}.mp3`);
  if (!args.has('--force') && cache[line.id] === hash && fs.existsSync(out)) return `${line.id.padEnd(6)} reused`;

  const kind = engine.split(':')[0];
  const raw = path.join(TMP, `${line.id}.${{ fish: 'wav', eleven: 'mp3', say: 'aiff' }[kind]}`);
  if (kind === 'eleven') await elevenTTS(text, voice, raw); else if (kind === 'fish') await fishTTS(text, voice, raw); else sayTTS(text, voice, raw);
  // trim leading/trailing silence so the timeline gaps in script.js are the real gaps
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse';
  ffmpeg('-i', raw, '-af', `${trim},${line.who === 'ellie' ? EQ.ellie : EQ.phone}`, '-ar', '44100', '-ac', '1', '-b:a', '96k', out);
  cache[line.id] = hash;
  return `${line.id.padEnd(6)} ${engine.split(':')[0]}`;
}

// Tones, synthesised: a standard double ring (400+450 Hz, 0.4 s on / 0.2 off / 0.4 on / 2.0 off, twice),
// German busy/hang-up tone (425 Hz, 480 ms on/off), and a two-note SMS chime.
const TONES = {
  ring:   { d: 4.2, e: '0.25*(sin(2*PI*400*t)+sin(2*PI*450*t))*(between(mod(t,3),0,0.4)+between(mod(t,3),0.6,1.0))',
            af: 'lowpass=f=2400,highpass=f=200,loudnorm=I=-21:TP=-3' },
  hangup: { d: 2.4, e: '0.22*sin(2*PI*425*t)*lt(mod(t,0.96),0.48)' },
  sms:    { d: 0.45, e: '0.18*sin(2*PI*1175*t)*lt(t,0.13)+0.18*sin(2*PI*1568*t)*gt(t,0.15)*lt(t,0.38)' },
};

// one request at a time: ElevenLabs rejects parallel requests that first-use the same library voice
const results = [];
for (const line of S.lines) results.push(await buildLine(line));
for (const [name, { d, e, af }] of Object.entries(TONES))
  ffmpeg('-f', 'lavfi', '-i', `aevalsrc=exprs='${e}':s=44100:d=${d}`, ...(af ? ['-af', af] : []), '-b:a', '96k', path.join(OUT, `${name}.mp3`));

const durations = {};
for (const id of [...S.lines.map(l => l.id), ...Object.keys(TONES)]) durations[id] = +duration(path.join(OUT, `${id}.mp3`)).toFixed(3);
fs.writeFileSync(path.join(OUT, 'durations.js'), `// Generated by build-audio.mjs. Do not edit.\nwindow.ELLIE_AUDIO = ${JSON.stringify(durations, null, 2)};\n`);
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
fs.rmSync(TMP, { recursive: true, force: true });

// Whole call as one file (audio/full-call.mp3): a backup for the stage and handy for review.
// Timing mirrors index.html: ring at 0.8 s, lines in order with their gaps, SMS chime 1.4 s into the coach line, hang-up 0.5 s after the last line.
{
  let t = 0.8 + durations.ring + 0.3;
  const at = { ring: 0.8 };
  for (const l of S.lines) { t += l.gap ?? 0; at[l.id] = t; t += durations[l.id]; }
  const coach = S.lines.find(l => l.kind === 'coach');
  at.sms = at[coach.id] + 1.4;
  at.hangup = t + 0.5;
  const ids = Object.keys(at);
  const inputs = ids.flatMap(id => ['-i', path.join(OUT, `${id}.mp3`)]);
  const graph = ids.map((id, i) => `[${i}:a]aresample=44100,aformat=channel_layouts=mono,adelay=${Math.round(at[id] * 1000)}[a${i}]`).join(';')
    + ';' + ids.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${ids.length}:normalize=0[out]`;
  ffmpeg(...inputs, '-filter_complex', graph, '-map', '[out]', '-b:a', '128k', path.join(OUT, 'full-call.mp3'));
}

console.log(results.join('\n'));
const total = S.lines.reduce((a, l) => a + durations[l.id] + (l.gap ?? 0), 0);
console.log(`\n${S.lines.length} lines, ~${total.toFixed(1)} s of call audio. Wrote audio/durations.js`);
