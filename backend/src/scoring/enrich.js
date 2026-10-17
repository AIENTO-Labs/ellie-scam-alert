// Facts about the caller's number that raise the risk a little on their own.
const COUNTRIES = { '+49': 'Germany', '+43': 'Austria', '+41': 'Switzerland', '+44': 'United Kingdom', '+1': 'USA/Canada',
  '+31': 'Netherlands', '+33': 'France', '+48': 'Poland', '+90': 'Turkey', '+357': 'Cyprus', '+234': 'Nigeria', '+91': 'India' }

const digits = n => (n || '').replace(/[^\d+]/g, '')

export function countryOf(number) {
  const n = digits(number)
  const code = Object.keys(COUNTRIES).sort((a, b) => b.length - a.length).find(c => n.startsWith(c))
  return code ? { code, name: COUNTRIES[code] } : null
}

/**
 * @param number      caller number as given by Twilio (E.164), '' or 'anonymous' if hidden
 * @param ctx.home    home country code of the protected person, default '+49'
 * @param ctx.trusted list of trusted numbers
 * @param ctx.previousCalls number of earlier calls from this number
 */
export function enrichNumber(number, { home = '+49', trusted = [], previousCalls = 0 } = {}) {
  const n = digits(number)
  const hidden = !n || /anonymous|unknown|private/i.test(number || '')
  const isTrusted = !hidden && trusted.map(digits).includes(n)
  const country = hidden ? null : countryOf(n)
  const info = { number: number || 'hidden', hidden, trusted: isTrusted, country: country?.name || null,
    foreign: !!country && country.code !== home, first_contact: !hidden && previousCalls === 0 }

  const signals = []
  if (isTrusted) return { info, signals }
  signals.push({ type: 'unknown_number', evidence: hidden ? 'hidden number' : number, source: 'enrichment' })
  if (hidden || info.foreign) signals.push({ type: 'foreign_origin', evidence: hidden ? 'hidden number' : `call from ${info.country}`, source: 'enrichment' })
  if (info.first_contact) signals.push({ type: 'first_contact', evidence: 'never called before', source: 'enrichment' })
  return { info, signals }
}
