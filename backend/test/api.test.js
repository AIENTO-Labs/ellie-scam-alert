import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { startApp, wait } from '../support/helpers.js'

const ellie = await startApp()
after(() => ellie.close())
const { post, get } = ellie

test('live call: escalates, actions fire once, report and chat work', async () => {
  const { status, body: { call, announcement } } = await post('/api/calls', { caller_number: '+49 30 555 0199' })
  assert.equal(status, 201); assert.match(announcement, /protected by Ellie/)
  const lines = [
    ['caller', 'Good afternoon, this is the Sparkasse security department.'],
    ['caller', "We need to act right now. Please don't tell anyone."],
    ['elder', 'Oh no. What should I do?'],
    ['caller', 'Read me the TAN code you just received by SMS.'],
    ['caller', 'Then we move your savings to a safe account.'],
  ]
  const levels = []
  for (const [speaker, text] of lines) levels.push((await post(`/api/calls/${call.id}/segments`, { speaker, text })).body.level)
  assert.deepEqual(levels, ['CAUTION', 'WARN', 'WARN', 'INTERCEPT', 'INTERCEPT'])
  const ended = (await post(`/api/calls/${call.id}/end`, {})).body
  assert.equal(ended.final_zone, 'RED'); assert.ok(ended.next_steps.some(s => s.includes('116 116')))
  const b = (await get(`/api/calls/${call.id}`)).body
  assert.deepEqual(b.alerts.map(a => a.action), ['coach', 'sms_guardian', 'intercept'])
  assert.match((await get(`/api/calls/${call.id}/report?kind=bank`)).body.text, /116 116/)
  assert.match((await post(`/api/calls/${call.id}/ask`, { question: 'Was that real?' })).body.answer, /scam/i)
})

test('trusted doctor call stays SAFE and triggers nothing', async () => {
  const { body: { call } } = await post('/api/calls', { caller_number: '+49 30 444 2210' })
  const r = (await post(`/api/calls/${call.id}/segments`, { text: 'Reminder: your appointment is on Tuesday at 10.' })).body
  assert.equal(r.level, 'SAFE'); assert.equal(r.score, 0)
  await post(`/api/calls/${call.id}/end`, {})
  assert.equal((await get(`/api/calls/${call.id}`)).body.alerts.length, 0)
})

test('dashboard hang-up ends the call as blocked', async () => {
  const { body: { call } } = await post('/api/calls', { caller_number: '+44 20 0000 0000' })
  await post(`/api/calls/${call.id}/actions`, { action: 'hang_up' })
  assert.equal((await get(`/api/calls/${call.id}`)).body.call.status, 'blocked')
})

test('demo simulation runs through the real pipeline', async () => {
  const { body } = await post('/api/dev/simulate', { kind: 'grandson', speed: 20 })
  await wait(2500)
  const b = (await get(`/api/calls/${body.call_id}`)).body
  assert.equal(b.call.status, 'ended'); assert.equal(b.call.final_zone, 'RED')
})

test('SMS scoring and validation', async () => {
  const sms = (await post('/api/score', { channel: 'sms', sender: '+44 7700 900123', text: 'Pay the customs fee now with a gift card' })).body
  assert.ok(sms.signals.some(s => s.type === 'gift_cards')); assert.ok(sms.signals.some(s => s.type === 'foreign_origin'))
  assert.equal((await post('/api/score', { text: '' })).status, 400)
  assert.equal((await post('/api/calls/../segments', { text: 'hi' })).status, 404)
  assert.equal((await post('/api/calls/abc/segments', { text: 'hi' })).status, 400)
  assert.equal((await get('/api/bootstrap')).body.person.phone, undefined)
})
