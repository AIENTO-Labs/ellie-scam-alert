import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import WebSocket from 'ws'
import { startApp } from '../support/helpers.js'

const ellie = await startApp({ apiToken: 'ingest-secret', dashboardToken: 'dash-secret',
  corsOrigins: ['https://ellie.example'], enableDevRoutes: false, rateLimitPerMin: 1000 })
after(() => ellie.close())

test('tokens: ingest and dashboard routes are protected, health is public', async () => {
  assert.equal((await ellie.get('/health')).status, 200)
  assert.equal((await ellie.get('/api/bootstrap')).status, 401)
  assert.equal((await ellie.get('/api/bootstrap', 'wrong')).status, 401)
  assert.equal((await ellie.get('/api/bootstrap', 'dash-secret')).status, 200)
  assert.equal((await ellie.post('/api/calls', { caller_number: '+1' }, 'dash-secret')).status, 401)
  assert.equal((await ellie.post('/api/calls', { caller_number: '+1' }, 'ingest-secret')).status, 201)
})

test('dev routes are off when disabled', async () => {
  assert.equal((await ellie.post('/api/dev/simulate', {}, 'dash-secret')).status, 404)
})

test('CORS rejects unknown origins', async () => {
  const r = await fetch(ellie.base + '/health', { headers: { origin: 'https://evil.example' } })
  assert.equal(r.status, 403)
  const ok = await fetch(ellie.base + '/health', { headers: { origin: 'https://ellie.example' } })
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://ellie.example')
})

test('dashboard WebSocket needs the token', async () => {
  const url = ellie.base.replace('http', 'ws') + '/live'
  const refused = await new Promise(r => { const ws = new WebSocket(url); ws.on('open', () => r(false)); ws.on('error', () => r(true)) })
  assert.equal(refused, true)
  const opened = await new Promise(r => { const ws = new WebSocket(url + '?token=dash-secret'); ws.on('open', () => { ws.close(); r(true) }); ws.on('error', () => r(false)) })
  assert.equal(opened, true)
})

test('rate limit answers 429', async () => {
  const strict = await startApp({ rateLimitPerMin: 3 })
  const codes = []
  for (let i = 0; i < 5; i++) codes.push((await strict.get('/api/config')).status)
  await strict.close()
  assert.deepEqual(codes, [200, 200, 200, 429, 429])
})
