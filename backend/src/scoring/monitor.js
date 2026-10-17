// Live call brain. Feed it transcript lines; it scores, explains and decides on actions.
//
//   const call = await monitor.start({ person, caller_number, twilio_call_sid })
//   await monitor.hear(call.id, 'caller', 'text')
//   await monitor.end(call.id)
//
// Every caller line: instant keyword check. Claude re-checks the rolling transcript every
// cfg.scoreIntervalMs, and immediately when money or codes come up.
// Actions fire once per level and are emitted on pipeline.actions:
//   'warn'      -> play the warning to the elder only, SMS the guardian
//   'intercept' -> mute the caller, play the warning
import { detectKeywords, mergeSignals, combine } from './scorer.js'
import { enrichNumber } from './enrich.js'
import { spokenWarning, familySms, nextSteps } from './advisor.js'
import { MONEY } from './signals.js'

const WINDOW_LINES = 40

export function createMonitor({ cfg, pipeline, store, scorer }) {
  const sessions = new Map()

  async function publish(s, reason) {
    const r = combine(s.signals)
    const changed = r.score !== s.result?.score || r.level !== s.result?.level
    s.result = { ...r, signals: s.signals }
    if (changed || reason) {
      await pipeline.risk(s.callId, { risk: r.risk, zone: r.zone, score: r.score, level: r.level,
        signals: s.signals, reason: reason || s.summary || null, model_probability: s.modelProbability ?? null })
    }
    await act(s)
    return s.result
  }

  async function act(s) {
    const r = s.result
    const lang = s.person.language || 'en'
    if ((r.level === 'WARN' || r.level === 'INTERCEPT') && !s.fired.has('WARN')) {
      s.fired.add('WARN')
      const warning = spokenWarning(r, lang)
      await pipeline.alert(s.callId, 'coach', s.person.name, warning)
      const g = s.person.guardian
      const sms = familySms(r, { personName: s.person.name, callerNumber: s.callerNumber, language: lang })
      if (g) await pipeline.alert(s.callId, 'sms_guardian', `${g.name}${g.relation ? ` (${g.relation})` : ''}`, sms)
      pipeline.actions.emit('action', { callId: s.callId, action: 'warn', warning, sms, result: r, telephony: s.telephony })
    }
    if (r.level === 'INTERCEPT' && !s.fired.has('INTERCEPT')) {
      s.fired.add('INTERCEPT')
      const warning = spokenWarning(r, lang)
      await pipeline.alert(s.callId, 'intercept', s.person.name, warning)
      pipeline.actions.emit('action', { callId: s.callId, action: 'intercept', warning, result: r, telephony: s.telephony })
    }
  }

  async function askClaude(s) {
    if (!scorer.enabled || s.inflight) return
    s.inflight = true
    s.lastLlm = Date.now()
    try {
      const transcript = s.lines.slice(-WINDOW_LINES).map(([sp, t]) => `${sp}: ${t}`).join('\n')
      const out = await scorer.detect(transcript, { channel: 'call', language: s.person.language })
      if (!sessions.has(s.callId)) return
      s.signals = mergeSignals(s.signals, out.signals)
      s.summary = out.summary || s.summary
      s.modelProbability = out.model_probability
      await publish(s, out.summary)
    } catch (e) {
      console.warn('[monitor] Claude check failed, keywords only:', e.message)
    } finally { s.inflight = false }
  }

  return {
    async start({ person, caller_number, caller_claimed, twilio_call_sid, telephony = null }) {
      const previous = (await store.listCalls(person.id, 200)).filter(c => c.caller_number === caller_number).length
      const { info, signals } = enrichNumber(caller_number, { home: person.home_country_code || '+49',
        trusted: person.trusted_numbers || [], previousCalls: previous })
      const call = await pipeline.startCall({ person_id: person.id, caller_number: caller_number || 'hidden',
        caller_claimed: caller_claimed || null, twilio_call_sid: twilio_call_sid || null, caller_info: info })
      const s = { callId: call.id, person, callerNumber: caller_number || 'hidden', lines: [], signals, telephony,
        result: null, summary: null, modelProbability: null, fired: new Set(), lastLlm: 0, inflight: false }
      sessions.set(call.id, s)
      await publish(s, 'Call started.')
      return call
    },

    async hear(callId, speaker, text) {
      const s = sessions.get(callId)
      if (!s || !text?.trim()) return null
      text = text.trim().slice(0, 2000)
      s.lines.push([speaker, text])
      await pipeline.segment(callId, speaker, text)
      if (speaker !== 'caller') return s.result
      const hits = detectKeywords(text)
      if (hits.length) {
        s.signals = mergeSignals(s.signals, hits)
        await publish(s)
      }
      const urgent = hits.some(h => MONEY.includes(h.type))
      if (urgent || Date.now() - s.lastLlm >= cfg.scoreIntervalMs) {
        const p = askClaude(s)         // runs in the background ...
        if (urgent) await p             // ... except when money or codes are at stake
      }
      return s.result
    },

    async end(callId, { status = 'ended' } = {}) {
      const s = sessions.get(callId)
      if (!s) return null
      while (s.inflight) await new Promise(r => setTimeout(r, 50))
      if (scorer.enabled && s.lines.length) await askClaude(s)
      sessions.delete(callId)
      const r = s.result || combine(s.signals)
      const summary = s.summary || (r.reasons.length ? `Warning signs: ${r.reasons.slice(0, 4).join(', ')}.` : 'No warning signs.')
      return pipeline.endCall(callId, { status, summary,
        next_steps: r.level === 'SAFE' ? [] : nextSteps(r, s.person.language) })
    },

    isLive: callId => sessions.has(callId),
    session: callId => sessions.get(callId),
    liveCount: () => sessions.size,
  }
}
