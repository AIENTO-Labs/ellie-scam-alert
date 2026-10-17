// After-call companion: "Was that real?"
import { nextSteps } from './advisor.js'
import { SIGNALS } from './signals.js'
import { prompt } from './llm.js'

function fallbackAnswer(bundle, language) {
  const last = bundle.risks.at(-1) || { signals: [] }
  const reasons = (last.signals || []).filter(s => s.source !== 'enrichment')
    .map(s => SIGNALS[s.type]?.label.toLowerCase()).filter(Boolean)
  const steps = nextSteps({ signals: last.signals || [] }, language)
  const de = language === 'de'
  if (!reasons.length) return de
    ? 'Ich habe in diesem Anruf keine Warnzeichen gefunden. Wenn Sie unsicher sind, rufen Sie unter einer Nummer zurück, die Sie kennen.'
    : 'I did not find warning signs in this call. If you are unsure, call them back on a number you know.'
  return de
    ? `Das sah sehr nach Betrug aus. Mir ist aufgefallen: ${reasons.join(', ')}. Was Sie jetzt tun können: ${steps.join(' ')}`
    : `That looked very much like a scam. I noticed: ${reasons.join(', ')}. What you can do now: ${steps.join(' ')}`
}

export function createCompanion(cfg, llm) {
  return async function answer(question, bundle, person) {
    const language = person.language || 'en'
    if (!llm.enabled) return { answer: fallbackAnswer(bundle, language), engine: 'template' }
    try {
      const transcript = bundle.segments.map(s => `${s.speaker === 'caller' ? 'Caller' : person.name}: ${s.text}`).join('\n')
      const last = bundle.risks.at(-1) || {}
      const text = await llm.complete({
        model: cfg.chatModel, maxTokens: 400,
        system: prompt('companion', { name: person.name, language: language === 'de' ? 'German' : 'English' }),
        user: `Call transcript:\n${transcript}\n\nRisk check: score ${last.score ?? 0} (${last.level || 'SAFE'}), signs: ${(last.signals || []).map(s => s.type).join(', ') || 'none'}.\n\nQuestion: ${question.slice(0, 500)}`,
      })
      return { answer: text, engine: 'claude' }
    } catch (e) {
      console.warn('[companion] fell back to template:', e.message)
      return { answer: fallbackAnswer(bundle, language), engine: 'template' }
    }
  }
}
