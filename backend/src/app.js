// Wires everything together. index.js starts it; tests create it with fakes.
import express from 'express'
import http from 'node:http'
import { WebSocketServer } from 'ws'
import { createStore } from './store/store.js'
import { createPipeline } from './live/pipeline.js'
import { createLlm } from './scoring/llm.js'
import { createScorer } from './scoring/scorer.js'
import { createMonitor } from './scoring/monitor.js'
import { createCompanion } from './scoring/companion.js'
import { createTelephony } from './telephony/index.js'
import { createRoutes } from './http/routes.js'
import { cors, securityHeaders, rateLimit, checkToken } from './http/security.js'

/**
 * @param cfg  from loadConfig()
 * @param deps optional fakes for tests: { store, llmClient, twilioClient, deepgramFactory }
 */
export async function createApp(cfg, deps = {}) {
  const store = deps.store || await createStore(cfg)
  const person = cfg.person
  if (store.kind === 'memory' || deps.seedPerson) await store.putPerson(person)

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1) // behind ngrok / cloudflared / a load balancer
  const server = http.createServer(app)

  // ---- live updates to dashboards (WS /live)
  const dashboards = new WebSocketServer({ noServer: true, maxPayload: 1024 })
  const broadcast = msg => {
    const data = JSON.stringify(msg)
    dashboards.clients.forEach(c => c.readyState === 1 && c.send(data))
  }

  const pipeline = createPipeline(store, broadcast)
  const llm = createLlm(cfg, deps.llmClient)
  const scorer = createScorer(cfg, llm)
  const monitor = createMonitor({ cfg, pipeline, store, scorer })
  const companion = createCompanion(cfg, llm)
  const telephony = createTelephony({ cfg, monitor, pipeline, person,
    twilioClient: deps.twilioClient, deepgramFactory: deps.deepgramFactory })

  app.use(securityHeaders)
  app.use(cors(cfg.corsOrigins))
  app.use('/twilio', telephony.router)
  app.use(rateLimit(cfg.rateLimitPerMin))
  app.use(express.json({ limit: '100kb' }))
  app.use(createRoutes({ cfg, store, pipeline, monitor, scorer, companion, person }))
  app.use((_q, res) => res.status(404).json({ error: 'Not found' }))
  // eslint-disable-next-line no-unused-vars
  app.use((err, _q, res, _n) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500)
    if (status >= 500) console.error('[http]', err)
    res.status(status).json({ error: status >= 500 ? 'Internal error' : err.message })
  })

  // ---- WebSocket routing: /live (dashboards) and /twilio/media (Twilio audio)
  const media = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 })
  media.on('connection', ws => telephony.handleMediaSocket(ws))
  server.on('upgrade', (req, socket, head) => {
    const path = new URL(req.url, 'http://x').pathname
    if (path === '/live') {
      if (cfg.corsOrigins.length && req.headers.origin && !cfg.corsOrigins.includes(req.headers.origin)) return socket.destroy()
      if (!checkToken(req, cfg.dashboardToken, cfg.apiToken)) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); return socket.destroy() }
      dashboards.handleUpgrade(req, socket, head, ws => dashboards.emit('connection', ws, req))
    } else if (path === '/twilio/media') {
      media.handleUpgrade(req, socket, head, ws => media.emit('connection', ws, req)) // authenticated by signed stream token
    } else socket.destroy()
  })

  const close = () => new Promise(res => {
    dashboards.clients.forEach(c => c.terminate()); media.clients.forEach(c => c.terminate())
    server.close(() => res())
  })

  return { app, server, store, pipeline, monitor, scorer, telephony, close }
}
