// Thin Claude wrapper: one place for the client, timeouts and prompt files.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const PROMPTS_DIR = new URL('../../prompts/', import.meta.url)
const cache = new Map()

/** Load prompts/<name>.md and fill {{placeholders}}. */
export function prompt(name, vars = {}) {
  if (!cache.has(name)) cache.set(name, readFileSync(fileURLToPath(new URL(`${name}.md`, PROMPTS_DIR)), 'utf8'))
  return cache.get(name).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''))
}

/**
 * @param cfg.anthropicKey, cfg.llmTimeoutMs
 * @param client optional injected client (tests)
 */
export function createLlm(cfg, client = null) {
  let c = client
  const get = async () => {
    if (!c) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      c = new Anthropic({ apiKey: cfg.anthropicKey })
    }
    return c
  }
  const enabled = Boolean(client || cfg.anthropicKey)

  async function complete({ model, system, user, maxTokens = 500 }) {
    const api = await get()
    const req = api.messages.create({ model, max_tokens: maxTokens, ...(system ? { system } : {}),
      messages: [{ role: 'user', content: user }] })
    let timer
    const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('Claude timeout')), cfg.llmTimeoutMs) })
    try {
      const msg = await Promise.race([req, timeout])
      return msg.content.map(b => b.text || '').join('').trim()
    } finally { clearTimeout(timer) }
  }

  async function json(opts) {
    const raw = await complete(opts)
    const start = raw.indexOf('{'), end = raw.lastIndexOf('}')
    if (start < 0 || end < start) throw new Error('Claude did not return JSON')
    return JSON.parse(raw.slice(start, end + 1))
  }

  return { enabled, complete, json }
}
