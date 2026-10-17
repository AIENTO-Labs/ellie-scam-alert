// REST API. Three access levels:
//   public        GET /health
//   dashboard     reads, reports, companion chat, message check, dashboard buttons  (ELLIE_DASHBOARD_TOKEN)
//   ingest        start/feed/end a call from your own telephony code                (ELLIE_API_TOKEN)
import express from 'express'
import { requireToken } from './security.js'
import { enrichNumber } from '../scoring/enrich.js'
import { buildReport } from '../scoring/report.js'
import { introAnnouncement } from '../scoring/advisor.js'
import { SIGNALS, LEVELS } from '../scoring/signals.js'
import { playDemoCall, DEMO_CALLS } from '../demo/simulate.js'

const wrap = fn => (req, res, next) => fn(req, res).catch(next)
const bad = msg => Object.assign(new Error(msg), { status: 400 })
const need = (cond, msg) => { if (!cond) throw bad(msg) }
const str = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max
const ID = /^[A-Za-z0-9-]{1,64}$/

export function createRoutes({ cfg, store, pipeline, monitor, scorer, companion, person }) {
  const r = express.Router()
  const dashboard = requireToken(cfg.dashboardToken, cfg.apiToken)
  const ingest = requireToken(cfg.apiToken)
  const getCall = async id => { need(ID.test(id), 'invalid call id'); return store.getCall(id) }

  // ---------------------------------------------------------------- public
  r.get('/health', (_q, res) => res.json({
    ok: true, store: store.kind, live_calls: monitor.liveCount(),
    scoring: scorer.enabled ? `claude (${cfg.scoringModel})` : 'keywords', telephony: cfg.features.telephony,
  }))

  // ---------------------------------------------------------------- dashboard
  r.get('/api/config', dashboard, (_q, res) => res.json({
    levels: LEVELS, demos: Object.keys(DEMO_CALLS).filter(k => !k.startsWith('_')),
    signals: Object.fromEntries(Object.entries(SIGNALS).map(([id, s]) => [id, { label: s.label, points: s.points, describe: s.describe }])),
  }))

  r.get('/api/bootstrap', dashboard, wrap(async (_q, res) => {
    const { phone, ...safePerson } = person          // don't expose the elder's number to the browser
    res.json({ person: safePerson, calls: await store.listCalls(person.id) })
  }))

  r.get('/api/calls/:id', dashboard, wrap(async (req, res) => {
    const b = await getCall(req.params.id)
    b ? res.json(b) : res.status(404).json({ error: 'Call not found' })
  }))

  r.get('/api/calls/:id/report', dashboard, wrap(async (req, res) => {
    const kind = req.query.kind || 'police'
    need(['police', 'bnetza', 'bank'].includes(kind), 'kind must be police, bnetza or bank')
    const b = await getCall(req.params.id)
    if (!b) return res.status(404).json({ error: 'Call not found' })
    res.json(buildReport(kind, b, person))
  }))

  r.post('/api/calls/:id/ask', dashboard, wrap(async (req, res) => {
    need(str(req.body?.question, 500), 'question is required (max 500 characters)')
    const b = await getCall(req.params.id)
    if (!b) return res.status(404).json({ error: 'Call not found' })
    res.json(await companion(req.body.question, b, person))
  }))

  r.post('/api/calls/:id/actions', dashboard, wrap(async (req, res) => {
    const { action, target = null, message = null } = req.body || {}
    need(['hang_up', 'call_guardian', 'sms_guardian', 'coach'].includes(action), 'unknown action')
    need(ID.test(req.params.id), 'invalid call id')
    const row = await pipeline.alert(req.params.id, action, typeof target === 'string' ? target.slice(0, 100) : null,
      typeof message === 'string' ? message.slice(0, 500) : null)
    pipeline.actions.emit('action', { callId: req.params.id, action })
    if (action === 'hang_up' && monitor.isLive(req.params.id)) await monitor.end(req.params.id, { status: 'blocked' })
    res.json(row)
  }))

  r.post('/api/score', dashboard, wrap(async (req, res) => {
    const { text, channel = 'sms', sender } = req.body || {}
    need(str(text, 10_000), 'text is required (max 10,000 characters)')
    need(['sms', 'email', 'whatsapp', 'call'].includes(channel), 'channel must be sms, email, whatsapp or call')
    const enrichment = typeof sender === 'string' && /^[+\d\s()-]{3,25}$/.test(sender)
      ? enrichNumber(sender, { home: person.home_country_code, trusted: person.trusted_numbers, previousCalls: 1 }).signals : []
    res.json(await scorer.scoreText(text, { channel, language: person.language, enrichment }))
  }))

  if (cfg.enableDevRoutes) {
    r.post('/api/dev/simulate', dashboard, wrap(async (req, res) => {
      const kind = typeof req.body?.kind === 'string' ? req.body.kind : 'scam'
      const speed = Math.min(20, Math.max(0.5, Number(req.body?.speed) || 1))
      res.json({ call_id: await playDemoCall(monitor, person, kind, { speed }) })
    }))
  }

  // ---------------------------------------------------------------- ingest (your own telephony / tests)
  r.post('/api/calls', ingest, wrap(async (req, res) => {
    const { caller_number = '', caller_claimed = null, twilio_call_sid = null } = req.body || {}
    need(typeof caller_number === 'string' && caller_number.length <= 40, 'caller_number must be a string')
    const call = await monitor.start({ person, caller_number, caller_claimed: str(caller_claimed, 120) ? caller_claimed : null,
      twilio_call_sid: str(twilio_call_sid, 64) ? twilio_call_sid : null })
    res.status(201).json({ call, announcement: introAnnouncement(person.language) })
  }))

  r.post('/api/calls/:id/segments', ingest, wrap(async (req, res) => {
    const { speaker = 'caller', text } = req.body || {}
    need(str(text, 2000), 'text is required (max 2000 characters)')
    need(['caller', 'elder'].includes(speaker), 'speaker must be caller or elder')
    need(monitor.isLive(req.params.id), 'call is not live')
    res.json(await monitor.hear(req.params.id, speaker, text))
  }))

  r.post('/api/calls/:id/end', ingest, wrap(async (req, res) => {
    need(monitor.isLive(req.params.id), 'call is not live')
    const status = req.body?.status === 'blocked' ? 'blocked' : 'ended'
    res.json(await monitor.end(req.params.id, { status }))
  }))

  return r
}
