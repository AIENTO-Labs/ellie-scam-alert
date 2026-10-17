// TwiML builders (Twilio's XML instructions). No Twilio SDK needed for these.
const x = s => String(s ?? '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))
const lang = l => (l === 'de' ? 'de-DE' : 'en-US')

/**
 * Incoming call to the bridge number:
 *   1. announce that the call is protected (legal notice + deterrent)
 *   2. stream both audio tracks to our WebSocket
 *   3. put the caller into a conference; the elder is dialled into the same conference
 */
export function incomingCall({ announcement, language, streamUrl, params = {}, conferenceName, statusCallback }) {
  const p = Object.entries(params).map(([k, v]) => `<Parameter name="${x(k)}" value="${x(v)}"/>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${lang(language)}">${x(announcement)}</Say>
  <Start><Stream url="${x(streamUrl)}" track="both_tracks">${p}</Stream></Start>
  <Dial><Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true" participantLabel="caller"${statusCallback ? ` statusCallback="${x(statusCallback)}" statusCallbackEvent="end leave"` : ''}>${x(conferenceName)}</Conference></Dial>
</Response>`
}

/** Spoken message (used as announceUrl for one participant, or for a call to the guardian). */
export function say(text, language) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response><Say language="${lang(language)}">${x(text)}</Say></Response>`
}

export const reject = () => `<?xml version="1.0" encoding="UTF-8"?>
<Response><Reject/></Response>`
