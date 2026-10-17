// All settings in one place, read from environment variables (and backend/.env if present).
import { fileURLToPath } from 'node:url'

try { process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url))) } catch { /* no .env file */ }

const env = process.env
const bool = (v, d = false) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v))
const num = (v, d) => (v === undefined || v === '' ? d : Number(v))
const list = v => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : [])

export function loadConfig(overrides = {}) {
  const production = env.NODE_ENV === 'production'
  const cfg = {
    production,
    port: num(env.PORT, 8080),
    publicUrl: (env.PUBLIC_URL || '').replace(/\/$/, ''),     // https://… as seen by Twilio

    // Security
    apiToken: env.ELLIE_API_TOKEN || '',                      // protects write/ingest endpoints
    dashboardToken: env.ELLIE_DASHBOARD_TOKEN || '',          // protects read endpoints + /live (optional)
    corsOrigins: list(env.CORS_ORIGINS),                      // empty = allow all (dev only)
    enableDevRoutes: bool(env.ELLIE_ENABLE_DEV, !production), // /api/dev/simulate
    rateLimitPerMin: num(env.RATE_LIMIT_PER_MIN, 120),

    // AI
    anthropicKey: env.ANTHROPIC_API_KEY || '',
    scoringModel: env.ELLIE_SCORING_MODEL || 'claude-haiku-5-5',
    chatModel: env.ELLIE_CHAT_MODEL || 'claude-sonnet-5-5',
    llmTimeoutMs: num(env.ELLIE_LLM_TIMEOUT_MS, 8000),
    scoreIntervalMs: num(env.SCORE_INTERVAL_MS, 10000),

    // Person being protected (single-tenant demo; move to the store for multi-tenant)
    person: {
      id: env.PERSON_ID || 'p-demo',
      name: env.PERSON_NAME || 'Helga Becker',
      phone: env.PERSON_PHONE || '',                          // elder's real phone (Twilio dials it)
      language: env.ELLIE_LANGUAGE || 'en',
      home_country_code: env.HOME_COUNTRY_CODE || '+49',
      trusted_numbers: list(env.TRUSTED_NUMBERS),
      guardian: env.GUARDIAN_PHONE ? { name: env.GUARDIAN_NAME || 'Family', relation: env.GUARDIAN_RELATION || '', phone: env.GUARDIAN_PHONE }
                                   : { name: 'Katja Becker', relation: 'Daughter', phone: '' },
    },

    // Telephony
    twilio: {
      accountSid: env.TWILIO_ACCOUNT_SID || '',
      authToken: env.TWILIO_AUTH_TOKEN || '',
      number: env.TWILIO_NUMBER || '',                        // the bridge number calls arrive on
      validateSignature: bool(env.TWILIO_VALIDATE_SIGNATURE, production),
    },
    deepgram: {
      apiKey: env.DEEPGRAM_API_KEY || '',
      model: env.DEEPGRAM_MODEL || 'nova-3',
      language: env.DEEPGRAM_LANGUAGE || 'multi',
    },

    // Storage
    ddbTable: env.DDB_TABLE || '',
    awsRegion: env.AWS_REGION || 'eu-central-1',
    retentionDays: num(env.RETENTION_DAYS, 30),
    ...overrides,
  }
  cfg.features = {
    claude: Boolean(cfg.anthropicKey),
    telephony: Boolean(cfg.twilio.accountSid && cfg.twilio.authToken && cfg.twilio.number && cfg.deepgram.apiKey),
    dynamodb: Boolean(cfg.ddbTable),
  }
  return cfg
}

export function warnings(cfg) {
  const w = []
  if (cfg.production && !cfg.apiToken) w.push('ELLIE_API_TOKEN is not set: write endpoints are open.')
  if (cfg.production && !cfg.corsOrigins.length) w.push('CORS_ORIGINS is not set: any website can call the API.')
  if (cfg.production && cfg.enableDevRoutes) w.push('ELLIE_ENABLE_DEV is on in production.')
  if (cfg.features.telephony && !cfg.publicUrl) w.push('PUBLIC_URL is not set: Twilio cannot reach the media stream.')
  if (!cfg.features.claude) w.push('ANTHROPIC_API_KEY is not set: scoring uses keywords only.')
  return w
}
