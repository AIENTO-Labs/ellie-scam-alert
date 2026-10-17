// Streaming speech-to-text with Deepgram over a raw WebSocket.
// Twilio sends 8 kHz mu-law audio; Deepgram accepts it directly.
import WebSocket from 'ws'

/**
 * @returns {{ send(buf: Buffer): void, close(): void }}
 * @param opts.onFinal(text) called for each finished phrase
 */
export function createDeepgramStream({ apiKey, model = 'nova-3', language = 'multi', onFinal, onError = () => {} }) {
  const qs = new URLSearchParams({ model, language, encoding: 'mulaw', sample_rate: '8000', channels: '1',
    punctuate: 'true', smart_format: 'true', interim_results: 'false', endpointing: '300' })
  const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${qs}`, { headers: { Authorization: `Token ${apiKey}` } })
  const queue = []
  let closed = false

  const keepAlive = setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ type: 'KeepAlive' })), 8000)
  ws.on('open', () => { while (queue.length) ws.send(queue.shift()) })
  ws.on('message', raw => {
    try {
      const m = JSON.parse(raw)
      const text = m?.channel?.alternatives?.[0]?.transcript
      if (m.type === 'Results' && m.is_final && text?.trim()) onFinal(text.trim())
    } catch (e) { onError(e) }
  })
  ws.on('error', onError)
  ws.on('close', () => clearInterval(keepAlive))

  return {
    send(buf) {
      if (closed) return
      if (ws.readyState === 1) ws.send(buf)
      else if (queue.length < 500) queue.push(buf) // ~10 s of audio while connecting
    },
    close() {
      if (closed) return
      closed = true
      clearInterval(keepAlive)
      try { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'CloseStream' })) } catch {}
      setTimeout(() => ws.close(), 1500).unref()
    },
  }
}
