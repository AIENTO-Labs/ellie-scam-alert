// Plays a fictional call (data/demo-calls.json) through the REAL scoring path,
// exactly as the phone integration feeds it. Only the words are scripted.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const DEMO_CALLS = JSON.parse(readFileSync(fileURLToPath(new URL('../../data/demo-calls.json', import.meta.url)), 'utf8'))
const sleep = ms => new Promise(r => setTimeout(r, ms))

export async function playDemoCall(monitor, person, kind = 'scam', { speed = 1 } = {}) {
  const script = DEMO_CALLS[kind]
  if (!script || kind.startsWith('_')) throw Object.assign(new Error(`Unknown demo "${kind}"`), { status: 400 })
  const call = await monitor.start({ person, caller_number: script.caller_number,
    caller_claimed: script.caller_claimed, twilio_call_sid: null })

  ;(async () => {
    for (const [speaker, text] of script.lines) {
      await sleep((1400 + text.length * 30) / speed)
      if (!monitor.isLive(call.id)) return // ended early from the dashboard
      await monitor.hear(call.id, speaker, text)
    }
    await sleep(1000 / speed)
    if (monitor.isLive(call.id)) await monitor.end(call.id)
  })().catch(e => console.error('[demo] simulation failed', e))

  return call.id
}
