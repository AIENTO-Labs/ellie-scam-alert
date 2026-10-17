import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { startApp, wait } from '../support/helpers.js'

let calls = 0
const llmClient = { messages: { create: async ({ model }) => {
  calls++
  if (model === 'claude-sonnet-5-5') return { content: [{ text: 'Yes, that was very likely a scam. Please call Katja.' }] }
  return { content: [{ text: JSON.stringify({
    signals: [{ type: 'family_emergency', evidence: 'your grandson had a car crash' }, { type: 'payment_request', evidence: 'we need 8000 euros' }],
    scam_probability: 0.95, summary: 'Caller claims the grandson crashed and asks for money.' }) }] }
} } }

const ellie = await startApp({ anthropicKey: 'test' }, { llmClient })
after(() => ellie.close())

test('Claude catches what keywords miss; summary and chat use Claude', async () => {
  const { body: { call } } = await ellie.post('/api/calls', { caller_number: '+49 30 1111111' })
  // "car crash" / "8000 euros" match no keyword: only Claude can catch this
  await ellie.post(`/api/calls/${call.id}/segments`, { text: 'This is officer Weber, your grandson had a car crash and we need 8000 euros.' })
  await wait(50)
  const ended = (await ellie.post(`/api/calls/${call.id}/end`, {})).body
  assert.equal(ended.final_zone, 'RED')
  assert.match(ended.summary, /grandson/)
  const b = (await ellie.get(`/api/calls/${call.id}`)).body
  assert.ok(b.risks.at(-1).signals.some(s => s.source === 'claude'))
  assert.equal(b.risks.at(-1).model_probability, 0.95)
  const chat = (await ellie.post(`/api/calls/${call.id}/ask`, { question: 'Was that real?' })).body
  assert.equal(chat.engine, 'claude')
  assert.ok(calls >= 2)
})
