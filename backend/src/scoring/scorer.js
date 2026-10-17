// Text -> warning signs -> 0..1 score.
//   detectKeywords(text)                 instant, offline (EN + DE)
//   createScorer(cfg, llm).detect(text)  Claude; evidence must appear verbatim
//   combine(signals)                     deterministic score, level, reasons
import { SIGNALS, SPEECH_SIGNALS, MONEY, PRESSURE, LEVELS } from './signals.js'
import { prompt } from './llm.js'

export function detectKeywords(text) {
  const out = []
  for (const id of SPEECH_SIGNALS) {
    for (const re of SIGNALS[id].keywords) {
      const m = text.match(re)
      if (m) { out.push({ type: id, evidence: m[0], source: 'keywords' }); break }
    }
  }
  return out
}

export function mergeSignals(existing, incoming) {
  const seen = new Set(existing.map(s => s.type))
  const out = [...existing]
  for (const s of incoming) if (!seen.has(s.type)) { seen.add(s.type); out.push(s) }
  return out
}

export function combine(signals) {
  const types = [...new Set(signals.map(s => s.type))].filter(t => SIGNALS[t])
  let points = Math.min(100, types.reduce((sum, t) => sum + SIGNALS[t].points, 0))
  const critical = types.some(t => MONEY.includes(t)) && types.some(t => PRESSURE.includes(t))
  if (critical) points = Math.max(points, 60) // money/codes + pressure is always at least WARN
  const score = points / 100
  const band = [...LEVELS].reverse().find(l => score >= l.min)
  const reasons = types.sort((a, b) => SIGNALS[b].points - SIGNALS[a].points).map(t => SIGNALS[t].label)
  return { score, risk: points, level: band.level, zone: band.zone, action: band.action, critical, reasons }
}

const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim()

export function createScorer(cfg, llm) {
  async function detect(text, { channel = 'call', language = 'en' } = {}) {
    const data = await llm.json({
      model: cfg.scoringModel,
      user: prompt('scoring', {
        channel,
        channel_note: channel === 'call' ? ' (live transcript, may contain speech-to-text errors)' : '',
        signals: SPEECH_SIGNALS.map(id => `- ${id}: ${SIGNALS[id].describe}`).join('\n'),
        language: language === 'de' ? 'German' : 'English',
        text,
      }),
    })
    const hay = norm(text)
    // Guard against hallucinated evidence: keep a sign only if its quote is really in the text.
    const signals = (Array.isArray(data.signals) ? data.signals : [])
      .filter(s => SPEECH_SIGNALS.includes(s?.type) && typeof s.evidence === 'string' && norm(s.evidence) && hay.includes(norm(s.evidence)))
      .map(s => ({ type: s.type, evidence: s.evidence.slice(0, 200), source: 'claude' }))
    const p = Number(data.scam_probability)
    return { signals, model_probability: Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : null,
      summary: typeof data.summary === 'string' ? data.summary.slice(0, 400) : null }
  }

  /** One-shot scoring for SMS, email, WhatsApp. */
  async function scoreText(text, { channel = 'sms', language = 'en', enrichment = [] } = {}) {
    let signals = detectKeywords(text)
    let model = { model_probability: null, summary: null }, engine = 'keywords'
    if (llm.enabled) {
      try {
        model = await detect(text, { channel, language })
        signals = mergeSignals(model.signals, signals)
        engine = 'claude'
      } catch (e) { console.warn('[scorer] Claude failed, keywords only:', e.message) }
    }
    signals = mergeSignals(signals, enrichment)
    return { ...combine(signals), signals, engine, model_probability: model.model_probability, summary: model.summary }
  }

  return { enabled: llm.enabled, detect, scoreText }
}
