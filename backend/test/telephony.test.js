import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import WebSocket from 'ws'
import { startApp, wait } from '../support/helpers.js'
import { streamToken } from '../src/http/security.js'

// Fake Twilio REST client that records every call
const log = []
const participants = conf => Object.assign(
  sid => ({ update: async p => { log.push(['participant.update', conf, sid, p]) } }),
  { create: async p => { log.push(['participant.create', conf, p]); return { conferenceSid: 'CF123', callSid: 'CAelder' } } })
const twilioClient = {
  conferences: conf => ({ participants: participants(conf) }),
  messages: { create: async p => { log.push(['sms', p]) } },
  calls: Object.assign(sid => ({ update: async p => { log.push(['call.update', sid, p]) } }), { create: async p => { log.push(['call.create', p]) } }),
}
// Fake Deepgram: lets the test "speak" on each track
const tracks = {}
const deepgramFactory = ({ onFinal }) => { const s = { sent: 0, send() { s.sent++ }, close() {}, say: onFinal }; tracks[Object.keys(tracks).length ? 'outbound' : 'inbound'] = s; return s }

const ellie = await startApp({
  publicUrl: 'https://ellie.test',
  twilio: { accountSid: 'AC1', authToken: 'tw-secret', number: '+4930999', validateSignature: false },
  person: { id: 'p1', name: 'Helga', phone: '+4930123', language: 'en', home_country_code: '+49', trusted_numbers: [],
    guardian: { name: 'Katja', relation: 'Daughter', phone: '+49171555' } },
}, { twilioClient, deepgramFactory })
after(() => ellie.close())

test('incoming call: TwiML announces, streams both tracks, conferences; elder is dialled', async () => {
  const r = await fetch(ellie.base + '/twilio/voice', { method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'CallSid=CAcaller&From=%2B4930555' })
  const xml = await r.text()
  assert.match(xml, /<Say language="en-US">This call is protected by Ellie/)
  assert.match(xml, /<Stream url="wss:\/\/ellie.test\/twilio\/media" track="both_tracks">/)
  assert.match(xml, /<Conference [^>]*>ellie-CAcaller<\/Conference>/)
  await wait(50)
  assert.deepEqual(log.find(l => l[0] === 'participant.create').slice(1, 2), ['ellie-CAcaller'])
})

test('media stream: transcripts are scored live and Ellie acts inside the call', async () => {
  const ws = new WebSocket(ellie.base.replace('http', 'ws') + '/twilio/media')
  await new Promise(r => ws.on('open', r))
  ws.send(JSON.stringify({ event: 'start', start: { callSid: 'CAcaller', streamSid: 'MZ1',
    customParameters: { from: '+4930555', token: streamToken('tw-secret', 'CAcaller') } } }))
  await wait(100)
  ws.send(JSON.stringify({ event: 'media', media: { track: 'inbound', payload: Buffer.from('audio').toString('base64') } }))
  await wait(30)
  assert.equal(tracks.inbound.sent, 1)

  await tracks.inbound.say('Hello, this is the Sparkasse security department, we must act right now.')
  await tracks.outbound.say('Oh dear, what happened?')
  await tracks.inbound.say("Don't tell anyone. Read me the TAN code from the SMS.")
  await tracks.inbound.say('Now transfer your savings to a safe account.')
  await wait(100)

  const kinds = log.map(l => l[0])
  assert.ok(log.some(l => l[0] === 'participant.update' && l[2] === 'CAelder' && /\/twilio\/say\//.test(l[3].announceUrl)), 'whisper to elder')
  assert.ok(log.some(l => l[0] === 'sms' && l[1].to === '+49171555'), 'SMS to guardian')
  assert.ok(log.some(l => l[0] === 'participant.update' && l[2] === 'CAcaller' && l[3].muted === true), 'caller muted')

  // announceUrl serves the spoken warning
  const url = log.find(l => l[0] === 'participant.update' && l[3].announceUrl)[3].announceUrl.replace('https://ellie.test', ellie.base)
  assert.match(await (await fetch(url, { method: 'POST' })).text(), /<Say[^>]*>Helga|This call has warning signs/)

  ws.send(JSON.stringify({ event: 'stop' }))
  await wait(100)
  const calls = (await ellie.get('/api/bootstrap')).body.calls
  const c = calls.find(x => x.twilio_call_sid === 'CAcaller')
  assert.equal(c.status, 'ended'); assert.equal(c.final_level, 'INTERCEPT')
  const b = (await ellie.get(`/api/calls/${c.id}`)).body
  assert.deepEqual([...new Set(b.segments.map(s => s.speaker))].sort(), ['caller', 'elder'])
  assert.ok(kinds.length >= 3)
})

test('media stream with a forged token is rejected', async () => {
  const ws = new WebSocket(ellie.base.replace('http', 'ws') + '/twilio/media')
  await new Promise(r => ws.on('open', r))
  const closed = new Promise(r => ws.on('close', code => r(code)))
  ws.send(JSON.stringify({ event: 'start', start: { callSid: 'CAx', customParameters: { token: 'nope' } } }))
  assert.equal(await closed, 1008)
})
