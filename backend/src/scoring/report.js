// Pre-filled reports the family can send. Ellie prepares, a human submits.
//   police  -> Strafanzeige (online: Onlinewache of the federal state, or call 110 in an emergency)
//   bnetza  -> Bundesnetzagentur, Rufnummernmissbrauch (number misuse)
//   bank    -> the person's bank, if codes were given or money moved
import { SIGNALS } from './signals.js'

const fmt = iso => iso ? new Date(iso).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) : 'unknown'

export function buildReport(kind, { call, segments = [], risks = [], alerts = [] }, person = {}) {
  const last = risks[risks.length - 1] || {}
  const signals = last.signals || []
  const quotes = signals.filter(s => s.source !== 'enrichment' && s.evidence)
    .map(s => `- ${SIGNALS[s.type]?.label || s.type}: "${s.evidence}"`)
  const transcript = segments.map(s => `${s.speaker === 'caller' ? 'Caller' : person.name || 'Person'}: ${s.text}`).join('\n')
  const asked = signals.filter(s => ['credentials_request', 'payment_request', 'gift_cards', 'remote_access'].includes(s.type))
    .map(s => SIGNALS[s.type].label.toLowerCase())

  const facts = [
    `Date and time: ${fmt(call.started_at)} (Europe/Berlin)`,
    `Caller number shown: ${call.caller_number || 'hidden'}`,
    `Caller claimed to be: ${call.caller_claimed || 'unknown'}`,
    `Called person: ${person.name || ''}${person.phone ? `, ${person.phone}` : ''}`,
    `Ellie risk score: ${(call.max_risk ?? 0) / 100} (${call.final_zone || ''})`,
  ]

  const heads = {
    police: {
      title: 'Report of attempted fraud by phone (Strafanzeige)',
      to: 'Police: the online police station (Onlinewache) of your federal state, or your local police station. In an emergency call 110.',
      ask: 'I would like to report an attempted fraud by telephone. The details are below.',
    },
    bnetza: {
      title: 'Complaint about phone number misuse (Rufnummernmissbrauch)',
      to: 'Bundesnetzagentur: complaint form for number misuse on bundesnetzagentur.de.',
      ask: 'The number below was used for a fraudulent call. Please check it and take action against the number.',
    },
    bank: {
      title: 'Urgent: possible fraud on my account',
      to: 'Your bank, by phone on the number on the back of your card. To block a card any time: 116 116.',
      ask: asked.length
        ? `A caller posing as bank staff asked for: ${asked.join(', ')}. Please check my account, stop any pending transfers and block cards or online banking if needed.`
        : 'A caller posed as staff of your bank. Please note this on my account and check for unusual activity.',
    },
  }
  const h = heads[kind]
  if (!h) throw new Error('kind must be police, bnetza or bank')

  const text = [
    h.title, '', `Send to: ${h.to}`, '', h.ask, '',
    'Facts', ...facts.map(f => `- ${f}`), '',
    quotes.length ? 'What the caller said (exact quotes)' : '', ...quotes, quotes.length ? '' : '',
    alerts.length ? 'What happened during the call' : '', ...alerts.map(a => `- ${fmt(a.created_at)}: ${a.action} ${a.target || ''}`.trim()),
    alerts.length ? '' : '',
    transcript ? 'Transcript (automatic, may contain errors)' : '', transcript,
    '', 'Prepared by Ellie. Please check the details before sending.',
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n')

  return { kind, title: h.title, send_to: h.to, text }
}
