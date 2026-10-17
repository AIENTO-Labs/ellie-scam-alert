// What Ellie says: short, calm, plain sentences for an older person.
// Templates are instant and always work; the companion chat can use Claude.
const T = {
  en: {
    intro: 'This call is protected by Ellie.',
    warn: {
      credentials_request: 'Your bank will never ask for a PIN or TAN on the phone.',
      payment_request: 'No real bank or police officer will ask you to move money or hand over cash.',
      gift_cards: 'Nobody official asks to be paid with gift cards or crypto.',
      remote_access: 'Do not install any app the caller asks for.',
      family_emergency: 'This may not be your relative. Call them back on the number you know.',
      impersonation: 'This caller may not be who they say they are.',
      secrecy: 'Real officials never ask you to keep a call secret from your family.',
      urgency: 'There is no rush. You can hang up and think.',
    },
    generic: 'This call has warning signs of a scam.',
    intercept: 'Please hang up now. Do not give any numbers or money.',
    caution: 'Be careful. Do not give any codes or money until you have checked.',
    steps: {
      base: ['Hang up.', 'Call your bank on the number on the back of your card.', 'Tell a family member what happened.'],
      credentials_request: 'If you already gave a TAN or PIN, call the card blocking line 116 116 right away.',
      remote_access: 'If you installed an app, turn the computer off and ask someone you trust for help.',
      payment_request: 'If you already sent money, call your bank immediately and ask them to stop it.',
      family_emergency: 'Call your relative on the number you know.',
    },
    sms: (person, number, reasons) => `Ellie: possible scam call to ${person} from ${number}. Signs: ${reasons.slice(0, 3).join(', ')}. Please call ${person} now.`,
  },
  de: {
    intro: 'Dieses Gespräch wird von Ellie geschützt.',
    warn: {
      credentials_request: 'Ihre Bank fragt am Telefon niemals nach PIN oder TAN.',
      payment_request: 'Keine echte Bank und keine Polizei verlangt, dass Sie Geld überweisen oder Bargeld übergeben.',
      gift_cards: 'Niemand Offizielles will mit Gutscheinkarten oder Krypto bezahlt werden.',
      remote_access: 'Installieren Sie keine App, um die der Anrufer bittet.',
      family_emergency: 'Das ist vielleicht nicht Ihr Angehöriger. Rufen Sie ihn unter der bekannten Nummer zurück.',
      impersonation: 'Der Anrufer ist vielleicht nicht der, der er vorgibt zu sein.',
      secrecy: 'Echte Beamte verlangen nie, dass Sie ein Gespräch vor Ihrer Familie geheim halten.',
      urgency: 'Es gibt keine Eile. Sie dürfen auflegen und nachdenken.',
    },
    generic: 'Dieser Anruf hat Anzeichen von Betrug.',
    intercept: 'Bitte legen Sie jetzt auf. Geben Sie keine Nummern und kein Geld heraus.',
    caution: 'Seien Sie vorsichtig. Geben Sie keine Codes und kein Geld heraus, bevor Sie es geprüft haben.',
    steps: {
      base: ['Legen Sie auf.', 'Rufen Sie Ihre Bank unter der Nummer auf Ihrer Karte an.', 'Erzählen Sie einem Familienmitglied, was passiert ist.'],
      credentials_request: 'Wenn Sie schon eine TAN oder PIN genannt haben: Rufen Sie sofort den Sperr-Notruf 116 116 an.',
      remote_access: 'Wenn Sie eine App installiert haben: Schalten Sie den Computer aus und holen Sie Hilfe.',
      payment_request: 'Wenn Sie schon Geld überwiesen haben: Rufen Sie sofort Ihre Bank an.',
      family_emergency: 'Rufen Sie Ihren Angehörigen unter der bekannten Nummer an.',
    },
    sms: (person, number, reasons) => `Ellie: Möglicher Betrugsanruf bei ${person} von ${number}. Hinweise: ${reasons.slice(0, 3).join(', ')}. Bitte rufen Sie ${person} jetzt an.`,
  },
}

const ORDER = ['credentials_request', 'payment_request', 'gift_cards', 'remote_access', 'family_emergency', 'impersonation', 'secrecy', 'urgency']
const lang = l => (l === 'de' ? 'de' : 'en')

export const introAnnouncement = (language) => T[lang(language)].intro

/** Spoken warning: the most important sign first, then what to do. Max ~3 sentences. */
export function spokenWarning(result, language = 'en') {
  const t = T[lang(language)]
  const types = new Set(result.signals.map(s => s.type))
  const top = ORDER.find(id => types.has(id))
  if (result.level === 'CAUTION') return [top ? t.warn[top] : t.generic, t.caution].join(' ')
  return [t.generic, top ? t.warn[top] : '', result.level === 'INTERCEPT' ? t.intercept : t.caution].filter(Boolean).join(' ')
}

export function nextSteps(result, language = 'en') {
  const t = T[lang(language)].steps
  const types = new Set(result.signals.map(s => s.type))
  return [...t.base, ...ORDER.filter(id => types.has(id) && t[id]).map(id => t[id])]
}

export function familySms(result, { personName, callerNumber, language = 'en' }) {
  return T[lang(language)].sms(personName, callerNumber, result.reasons)
}
