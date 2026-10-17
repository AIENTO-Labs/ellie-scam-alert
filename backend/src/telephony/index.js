// Phone integration: Twilio webhooks + Media Streams -> Deepgram -> monitor, and Ellie's actions back into the call.
//
//   Caller ──► Twilio number ──► POST /twilio/voice ──► TwiML: announce · stream audio · conference
//                                      └─► REST: dial the elder into the same conference
//   Twilio media (WS /twilio/media) ──► Deepgram (one stream per side) ──► monitor.hear()
//   monitor actions ──► warn: whisper to the elder only (announceUrl) + SMS guardian
//                       intercept: mute the caller + whisper · hang_up: end the caller's leg
import express from 'express'
import { randomUUID } from 'node:crypto'
import { incomingCall, say } from './twiml.js'
import { createDeepgramStream } from './deepgram.js'
import { streamToken, verifyStreamToken } from '../http/security.js'
import { introAnnouncement } from '../scoring/advisor.js'

export function createTelephony({ cfg, monitor, pipeline, person, twilioClient = null, deepgramFactory = createDeepgramStream }) {
  const calls = new Map()          // twilio CallSid -> { conferenceName, conferenceSid, elderCallSid, callId }
  const announcements = new Map()  // id -> { text, language, at }
  let twilioLib = null, client = twilioClient

  async function api() {
    if (!client) {
      twilioLib ??= (await import('twilio')).default
      client = twilioLib(cfg.twilio.accountSid, cfg.twilio.authToken)
    }
    return client
  }
  const secret = cfg.twilio.authToken || cfg.apiToken
  const wsUrl = path => cfg.publicUrl.replace(/^http/, 'ws') + path
  const announceUrl = (text, language) => {
    const id = randomUUID()
    announcements.set(id, { text, language, at: Date.now() })
    for (const [k, v] of announcements) if (Date.now() - v.at > 10 * 60_000) announcements.delete(k)
    return `${cfg.publicUrl}/twilio/say/${id}`
  }

  // ---------------------------------------------------------------- webhooks
  const router = express.Router()
  router.use(express.urlencoded({ extended: false, limit: '20kb' }))

  router.use(async (req, res, next) => {
    if (!cfg.twilio.validateSignature) return next()
    twilioLib ??= (await import('twilio')).default
    const ok = twilioLib.validateRequest(cfg.twilio.authToken, req.headers['x-twilio-signature'] || '',
      cfg.publicUrl + req.originalUrl, req.body || {})
    ok ? next() : res.status(403).type('text/plain').send('Invalid Twilio signature')
  })

  router.post('/voice', (req, res) => {
    const { CallSid, From } = req.body
    const conferenceName = `ellie-${CallSid}`
    calls.set(CallSid, { conferenceName, conferenceSid: null, elderCallSid: null, callId: null, from: From })
    res.type('text/xml').send(incomingCall({
      announcement: introAnnouncement(person.language),
      language: person.language,
      streamUrl: wsUrl('/twilio/media'),
      params: { from: From || '', token: streamToken(secret, CallSid) },
      conferenceName,
      statusCallback: `${cfg.publicUrl}/twilio/conference-status`,
    }))
    dialElder(CallSid).catch(e => console.error('[twilio] could not dial the elder:', e.message))
  })

  router.all('/say/:id', (req, res) => {
    const a = announcements.get(req.params.id)
    res.type('text/xml').send(say(a ? a.text : '', a?.language || person.language))
  })

  router.post('/conference-status', async (req, res) => {
    res.sendStatus(204)
    const event = req.body.StatusCallbackEvent
    const name = req.body.FriendlyName || ''
    const sid = name.replace(/^ellie-/, '')
    const c = calls.get(sid)
    if (c && (event === 'conference-end' || event === 'participant-leave') && c.callId && monitor.isLive(c.callId)) {
      await monitor.end(c.callId).catch(() => {})
    }
    if (event === 'conference-end') calls.delete(sid)
  })

  async function dialElder(callSid) {
    if (!person.phone) return console.warn('[twilio] PERSON_PHONE not set: caller waits alone in the conference')
    const c = calls.get(callSid)
    const p = await (await api()).conferences(c.conferenceName).participants.create({
      from: cfg.twilio.number, to: person.phone, label: 'elder', beep: 'false', earlyMedia: true,
      endConferenceOnExit: true, timeout: 30,
    })
    c.conferenceSid = p.conferenceSid
    c.elderCallSid = p.callSid
  }

  // ---------------------------------------------------------------- media stream
  function handleMediaSocket(ws) {
    let callSid = null, callId = null, closed = false
    const streams = {}
    const finish = async () => {
      if (closed) return
      closed = true
      Object.values(streams).forEach(s => s.close())
      if (callId && monitor.isLive(callId)) await monitor.end(callId).catch(e => console.error('[media] end failed', e))
    }
    ws.on('message', async raw => {
      let m
      try { m = JSON.parse(raw) } catch { return }
      if (m.event === 'start') {
        callSid = m.start.callSid
        const params = m.start.customParameters || {}
        if (!verifyStreamToken(secret, callSid, params.token)) { ws.close(1008, 'bad token'); return }
        const c = calls.get(callSid) || { conferenceName: `ellie-${callSid}` }
        calls.set(callSid, c)
        const call = await monitor.start({ person, caller_number: params.from || c.from || 'hidden',
          twilio_call_sid: callSid, telephony: { callSid } })
        callId = c.callId = call.id
        // inbound = what the caller says; outbound = what the caller hears (the elder's voice)
        for (const [track, speaker] of [['inbound', 'caller'], ['outbound', 'elder']]) {
          streams[track] = deepgramFactory({ apiKey: cfg.deepgram.apiKey, model: cfg.deepgram.model, language: cfg.deepgram.language,
            onFinal: text => monitor.hear(callId, speaker, text).catch(e => console.error('[media] hear failed', e)),
            onError: e => console.error(`[deepgram:${track}]`, e.message) })
        }
      } else if (m.event === 'media' && streams[m.media.track]) {
        streams[m.media.track].send(Buffer.from(m.media.payload, 'base64'))
      } else if (m.event === 'stop') {
        await finish()
      }
    })
    ws.on('close', finish)
    ws.on('error', finish)
  }

  // ---------------------------------------------------------------- actions back into the call
  const byCallId = callId => [...calls.entries()].find(([, c]) => c.callId === callId) || []

  async function whisperToElder(c, text) {
    if (!c?.conferenceSid || !c.elderCallSid) return console.warn('[twilio] no elder leg to whisper to')
    await (await api()).conferences(c.conferenceSid).participants(c.elderCallSid)
      .update({ announceUrl: announceUrl(text, person.language), announceMethod: 'POST' })
  }

  pipeline.actions.on('action', async ({ callId, action, warning, sms }) => {
    const [callerSid, c] = byCallId(callId)
    if (!callerSid) return // not a phone call (demo or API-fed)
    try {
      const tw = await api()
      if (action === 'warn') {
        await whisperToElder(c, warning)
        if (person.guardian?.phone && sms) await tw.messages.create({ from: cfg.twilio.number, to: person.guardian.phone, body: sms })
      } else if (action === 'intercept') {
        if (c.conferenceSid) await tw.conferences(c.conferenceSid).participants(callerSid).update({ muted: true })
        await whisperToElder(c, warning)
      } else if (action === 'hang_up') {
        await tw.calls(callerSid).update({ status: 'completed' })
      } else if (action === 'call_guardian' && person.guardian?.phone) {
        await tw.calls.create({ from: cfg.twilio.number, to: person.guardian.phone,
          twiml: say(`Ellie here. ${person.name} may be on a scam call right now. Please call ${person.name}.`, person.language) })
      }
    } catch (e) { console.error(`[twilio] action ${action} failed:`, e.message) }
  })

  return { router, handleMediaSocket, calls }
}
