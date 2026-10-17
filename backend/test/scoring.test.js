import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectKeywords, combine, createScorer } from '../src/scoring/scorer.js'
import { createLlm } from '../src/scoring/llm.js'
import { enrichNumber } from '../src/scoring/enrich.js'
import { spokenWarning, nextSteps } from '../src/scoring/advisor.js'
import { fakeLlm } from '../support/helpers.js'

const cfg = { scoringModel: 'test', llmTimeoutMs: 1000 }

test('keywords find the classic fake-bank signs (EN + DE)', () => {
  const t = detectKeywords("Please read me the TAN code. Don't tell anyone. We need it right now.").map(s => s.type)
  assert.deepEqual(new Set(t), new Set(['credentials_request', 'secrecy', 'urgency']))
  const de = detectKeywords('Hier ist die Polizei. Überweisen Sie das Geld sofort auf ein sicheres Konto.').map(s => s.type)
  assert.ok(de.includes('impersonation') && de.includes('payment_request') && de.includes('urgency'))
})

test('harmless doctor call has no signs', () => {
  assert.equal(detectKeywords('Reminder of your appointment on Tuesday at 10, please bring your insurance card.').length, 0)
})

test('score bands 0..1: SAFE / CAUTION / WARN / INTERCEPT, critical combo', () => {
  assert.equal(combine([]).level, 'SAFE')
  assert.equal(combine([{ type: 'impersonation' }, { type: 'urgency' }]).level, 'CAUTION')
  const crit = combine([{ type: 'secrecy' }, { type: 'credentials_request' }])
  assert.equal(crit.critical, true); assert.equal(crit.level, 'WARN'); assert.equal(crit.score, 0.6)
  const all = combine(['impersonation', 'urgency', 'secrecy', 'credentials_request'].map(type => ({ type })))
  assert.equal(all.level, 'INTERCEPT'); assert.equal(all.score, 0.8)
})

test('Claude evidence not in the text, and unknown ids, are dropped', async () => {
  const scorer = createScorer(cfg, createLlm(cfg, fakeLlm({ signals: [
    { type: 'credentials_request', evidence: 'tell me the TAN' },
    { type: 'secrecy', evidence: 'keep this between us' },
    { type: 'made_up', evidence: 'TAN' },
  ], scam_probability: 0.9, summary: 'Asks for a TAN.' })))
  const out = await scorer.detect('Caller: please tell me the TAN you got by SMS')
  assert.deepEqual(out.signals.map(s => s.type), ['credentials_request'])
  assert.equal(out.model_probability, 0.9)
})

test('falls back to keywords when Claude fails or times out', async () => {
  const slow = { messages: { create: () => new Promise(() => {}) } }
  const scorer = createScorer({ ...cfg, llmTimeoutMs: 50 }, createLlm({ llmTimeoutMs: 50 }, slow))
  const r = await scorer.scoreText('Pay the fine with Google Play gift cards today.')
  assert.equal(r.engine, 'keywords')
  assert.ok(r.signals.some(s => s.type === 'gift_cards'))
})

test('number enrichment', () => {
  assert.equal(enrichNumber('+49 30 444 2210', { trusted: ['+49304442210'] }).signals.length, 0)
  assert.deepEqual(enrichNumber('anonymous').signals.map(s => s.type), ['unknown_number', 'foreign_origin'])
  const cy = enrichNumber('+357 22 000000').info
  assert.equal(cy.country, 'Cyprus'); assert.equal(cy.foreign, true); assert.equal(cy.first_contact, true)
})

test('spoken warning: most important sign first, EN and DE', () => {
  const sig = [{ type: 'secrecy' }, { type: 'credentials_request' }]
  const r = { ...combine(sig), signals: sig }
  assert.match(spokenWarning(r, 'en'), /never ask for a PIN or TAN/)
  assert.match(spokenWarning(r, 'de'), /niemals nach PIN oder TAN/)
  assert.ok(nextSteps({ signals: sig }).some(s => s.includes('116 116')))
})
