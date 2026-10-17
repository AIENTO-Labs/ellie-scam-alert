import { loadConfig } from '../src/config.js'
import { createApp } from '../src/app.js'

process.env.TRUSTED_NUMBERS = '+49304442210'
for (const k of ['ANTHROPIC_API_KEY', 'DDB_TABLE', 'ELLIE_API_TOKEN', 'ELLIE_DASHBOARD_TOKEN', 'CORS_ORIGINS', 'TWILIO_AUTH_TOKEN', 'PUBLIC_URL']) delete process.env[k]

export async function startApp(overrides = {}, deps = {}) {
  const cfg = loadConfig({ scoreIntervalMs: 0, rateLimitPerMin: 0, ...overrides })
  const ellie = await createApp(cfg, deps)
  await new Promise(r => ellie.server.listen(0, r))
  const base = `http://localhost:${ellie.server.address().port}`
  const req = (method, path, body, token) => fetch(base + path, {
    method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async r => ({ status: r.status, body: await r.json().catch(() => null), text: null }))
  return { ...ellie, cfg, base,
    post: (p, b, t) => req('POST', p, b, t),
    get: (p, t) => req('GET', p, null, t) }
}

export const fakeLlm = json => ({ messages: { create: async () => ({ content: [{ text: JSON.stringify(json) }] }) } })
export const wait = ms => new Promise(r => setTimeout(r, ms))
