// Single write path: every change is stored, then pushed to all open dashboards.
import { EventEmitter } from 'node:events'

export function createPipeline(store, broadcast) {
  const actions = new EventEmitter() // 'action' events: warn, intercept, hang_up, call_guardian, …
  actions.on('error', e => console.error('[actions]', e))
  const peaks = new Map()
  const emit = (type, row) => { broadcast({ type, row }); return row }

  return {
    actions,
    async startCall(fields) {
      const call = await store.createCall(fields)
      peaks.set(call.id, 0)
      return emit('call', call)
    },
    async segment(callId, speaker, text) {
      return emit('segment', await store.add('segments', { call_id: callId, speaker, text }))
    },
    // fields: { risk 0-100, zone, score 0-1, level, signals, reason, model_probability }
    async risk(callId, { signals = [], reason = null, ...fields }) {
      const row = emit('risk', await store.add('risks', { call_id: callId, signals, reason, ...fields }))
      if (fields.risk >= (peaks.get(callId) ?? 0)) {
        peaks.set(callId, fields.risk)
        emit('call', await store.updateCall(callId, { max_risk: fields.risk, final_zone: fields.zone, final_level: fields.level }))
      }
      return row
    },
    async alert(callId, action, target, message = null) {
      return emit('alert', await store.add('alerts', { call_id: callId, action, target, message }))
    },
    async endCall(callId, { status = 'ended', summary = null, next_steps } = {}) {
      peaks.delete(callId)
      return emit('call', await store.updateCall(callId, { status, summary, next_steps, ended_at: new Date().toISOString() }))
    },
  }
}
