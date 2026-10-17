// Warning signs Ellie looks for. Single source of truth for the backend.
// Keywords (EN + DE) power the instant/offline detector; Claude uses the
// descriptions. Weights are points out of 100 (score = points / 100, max 1.0).
export const SIGNALS = {
  impersonation: {
    label: 'Bank, police or authority impersonation', points: 20,
    describe: 'Caller claims to be from a bank, police, public prosecutor, tax office or a well-known company (e.g. Microsoft).',
    keywords: [/\b(fraud|security) (department|team)\b/i, /\bsparkasse\b|\bvolksbank\b|\bpostbank\b/i, /\bpolice\b|\bpolizei\b|\bkripo\b|\bkriminalpolizei\b/i,
      /\bstaatsanwalt/i, /\btax office\b|\bfinanzamt\b/i, /\bmicrosoft\b/i, /\bsicherheitsabteilung\b/i],
  },
  family_emergency: {
    label: 'Relative in an emergency', points: 20,
    describe: 'Caller pretends to be or speak for a relative in trouble: accident, arrest, hospital, bail ("Enkeltrick", "Schockanruf").',
    keywords: [/\b(grandma|granny|oma|opa)\b.*\b(it'?s me|ich bin'?s)\b/i, /\baccident\b|\bunfall\b/i, /\barrested\b|\bverhaftet\b|\bfestgenommen\b/i, /\bbail\b|\bkaution\b/i],
  },
  urgency: {
    label: 'Time pressure', points: 15,
    describe: 'Artificial deadline or rush: "right now", "today", "before the bank closes".',
    keywords: [/\bright now\b/i, /\bimmediately\b/i, /\burgent/i, /\bbefore \d/i, /\bsofort\b/i, /\bdringend\b/i, /\bheute noch\b/i],
  },
  secrecy: {
    label: 'Secrecy request', points: 20,
    describe: 'Asks to keep the call secret from family, bank staff or anyone else.',
    keywords: [/don'?t (tell|discuss|mention)/i, /\bconfidential\b/i, /\bkeep (it|this) (secret|between)/i, /niemandem (erzählen|sagen)/i, /\bvertraulich\b/i, /\bgeheim\b/i],
  },
  credentials_request: {
    label: 'Asks for PIN, TAN or passwords', points: 25,
    describe: 'Asks for a PIN, TAN, password, card number, online-banking login or a code received by SMS.',
    keywords: [/\btan\b/i, /\bpin\b/i, /\bpassword\b|\bpasswort\b/i, /\bcard number\b|\bkartennummer\b/i, /\bcode\b.*\b(sms|text)\b/i],
  },
  payment_request: {
    label: 'Money transfer or cash handover', points: 25,
    describe: 'Asks to transfer money, move savings to a "safe account", or hand over cash, gold or jewellery to a courier.',
    keywords: [/\bsafe account\b|\bsicheres konto\b/i, /\btransfer\b|\büberweis/i, /\bcash\b|\bbargeld\b/i, /\bcourier\b|\babholer\b|\bbote\b/i, /\bjewel+ery\b|\bschmuck\b|\bgold\b/i],
  },
  gift_cards: {
    label: 'Gift cards or crypto', points: 25,
    describe: 'Asks for payment by gift cards, vouchers or cryptocurrency.',
    keywords: [/\bgift ?cards?\b|\bgutschein/i, /\bgoogle play\b|\bitunes\b|\bpaysafe/i, /\bbitcoin\b|\bcrypto\b|\bkrypto/i],
  },
  remote_access: {
    label: 'Remote-access app', points: 25,
    describe: 'Asks to install or open AnyDesk, TeamViewer, QuickSupport or similar.',
    keywords: [/\banydesk\b/i, /\bteamviewer\b/i, /\bquick ?support\b/i, /\bfernwartung\b/i, /\bremote access\b/i],
  },
  // Enrichment signals: from call metadata, not from words.
  unknown_number: { label: 'Unknown number', points: 5, describe: 'Number is not in the trusted contacts.', keywords: [] },
  foreign_origin: { label: 'Foreign or hidden number', points: 10, describe: 'Call from abroad or with a hidden number.', keywords: [] },
  first_contact: { label: 'First call from this number', points: 5, describe: 'This number has never called before.', keywords: [] },
}

export const SPEECH_SIGNALS = Object.keys(SIGNALS).filter(id => SIGNALS[id].keywords.length)
export const MONEY = ['credentials_request', 'payment_request', 'gift_cards', 'remote_access']
export const PRESSURE = ['secrecy', 'impersonation', 'family_emergency']

// Score bands (0..1) and what Ellie does in each.
export const LEVELS = [
  { level: 'SAFE',      zone: 'GREEN',  min: 0,    action: 'none' },
  { level: 'CAUTION',   zone: 'YELLOW', min: 0.3,  action: 'watch' },
  { level: 'WARN',      zone: 'RED',    min: 0.6,  action: 'warn_and_alert_family' },
  { level: 'INTERCEPT', zone: 'RED',    min: 0.8,  action: 'intercept' },
]
