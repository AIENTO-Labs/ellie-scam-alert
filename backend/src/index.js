// Entry point: npm start
import { loadConfig, warnings } from './config.js'
import { createApp } from './app.js'

const cfg = loadConfig()
const ellie = await createApp(cfg)

ellie.server.listen(cfg.port, () => {
  console.log(`Ellie backend on http://localhost:${cfg.port}`)
  console.log(`  store: ${ellie.store.kind} · scoring: ${cfg.features.claude ? cfg.scoringModel : 'keywords'} · telephony: ${cfg.features.telephony ? 'on' : 'off'}`)
  for (const w of warnings(cfg)) console.warn(`  ! ${w}`)
})

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    console.log(`${sig}: shutting down`)
    await ellie.close()
    process.exit(0)
  })
}
