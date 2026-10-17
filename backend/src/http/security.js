// Small, dependency-free security layer: tokens, CORS allowlist, rate limit, headers.
import { timingSafeEqual, createHmac } from 'node:crypto'

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

export function tokenFrom(req) {
  const h = req.headers.authorization || ''
  if (h.startsWith('Bearer ')) return h.slice(7)
  return req.headers['x-api-key'] || new URL(req.url, 'http://x').searchParams.get('token') || ''
}

/** Accepts any of the given tokens. If none is configured, the route is open (dev mode). */
export function requireToken(...tokens) {
  const valid = tokens.filter(Boolean)
  return (req, res, next) => {
    if (!valid.length) return next()
    const t = tokenFrom(req)
    if (t && valid.some(v => safeEqual(t, v))) return next()
    res.status(401).json({ error: 'Missing or invalid token' })
  }
}
export const checkToken = (req, ...tokens) => {
  const valid = tokens.filter(Boolean)
  if (!valid.length) return true
  const t = tokenFrom(req)
  return Boolean(t) && valid.some(v => safeEqual(t, v))
}

export function cors(origins) {
  return (req, res, next) => {
    const origin = req.headers.origin
    if (origin && (!origins.length || origins.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origins.length ? origin : '*')
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    } else if (origin && origins.length) {
      return res.status(403).json({ error: 'Origin not allowed' })
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  }
}

export function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Cache-Control', 'no-store')
  next()
}

/** Fixed-window limiter per IP. Good enough for one instance; use AWS WAF / API Gateway at scale. */
export function rateLimit(perMinute) {
  const hits = new Map()
  setInterval(() => hits.clear(), 60_000).unref()
  return (req, res, next) => {
    if (!perMinute) return next()
    const key = req.ip || req.socket.remoteAddress
    const n = (hits.get(key) || 0) + 1
    hits.set(key, n)
    if (n > perMinute) return res.status(429).json({ error: 'Too many requests, slow down' })
    next()
  }
}

/** Short-lived signed token for the Twilio media stream (Twilio passes it back as a stream parameter). */
export const streamToken = (secret, callSid) => createHmac('sha256', secret || 'ellie-dev').update(callSid).digest('hex').slice(0, 32)
export const verifyStreamToken = (secret, callSid, token) => Boolean(token) && safeEqual(streamToken(secret, callSid), token)
