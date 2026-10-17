// Storage for calls, transcripts, risk checks and alerts.
// DynamoDB when cfg.ddbTable is set, otherwise in memory (local dev / demo).
// Memory store keeps at most 500 calls so a long demo cannot exhaust RAM.
//
// DynamoDB single-table design (table: PK + SK, both strings, TTL on "expires_at"):
//   PERSON#<personId>  PROFILE                     protected person
//   PERSON#<personId>  GUARDIAN#<id>               family member
//   PERSON#<personId>  CALL#<startedAt>#<callId>   index item for call history
//   CALL#<callId>      META                        the call itself
//   CALL#<callId>      SEG#<ts>#<id>               transcript segment
//   CALL#<callId>      RISK#<ts>#<id>              risk check
//   CALL#<callId>      ALERT#<ts>#<id>             action taken
// Everything under CALL# expires after cfg.retentionDays (GDPR: no audio, short retention).
import { randomUUID } from 'node:crypto'

const now = () => new Date().toISOString()

/** @param cfg { ddbTable, awsRegion, retentionDays } */
export async function createStore(cfg = {}) {
  return cfg.ddbTable ? dynamoStore(cfg) : memoryStore()
}

/* ------------------------------------------------------------ memory */
function memoryStore() {
  const persons = new Map()
  const calls = new Map()
  const rows = new Map() // callId -> {segments, risks, alerts}
  const bucket = id => rows.get(id) || rows.set(id, { segments: [], risks: [], alerts: [] }).get(id)

  return {
    kind: 'memory',
    async putPerson(person) { persons.set(person.id, person) },
    async getPerson(id) { return persons.get(id) || [...persons.values()][0] || null },
    async createCall(call) {
      const row = { id: randomUUID(), status: 'live', max_risk: 0, final_zone: 'GREEN', started_at: now(), ...call }
      calls.set(row.id, row)
      if (calls.size > 500) { const oldest = calls.keys().next().value; calls.delete(oldest); rows.delete(oldest) }
      return row
    },
    async updateCall(id, patch) {
      const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
      const row = { ...calls.get(id), ...clean, id }; calls.set(id, row); return row
    },
    async listCalls(personId, limit = 50) {
      return [...calls.values()].filter(c => !personId || c.person_id === personId)
        .sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, limit)
    },
    async getCall(id) {
      const call = calls.get(id); if (!call) return null
      const b = rows.get(id) || { segments: [], risks: [], alerts: [] }
      return { call, segments: [...b.segments], risks: [...b.risks], alerts: [...b.alerts] }
    },
    async add(kind, row) {
      const full = { id: randomUUID(), created_at: now(), ...row }
      bucket(row.call_id)[kind].push(full); return full
    },
  }
}

/* ------------------------------------------------------------ DynamoDB */
async function dynamoStore({ ddbTable: table, awsRegion, retentionDays = 30 }) {
  const expiresAt = () => Math.floor(Date.now() / 1000) + retentionDays * 86400
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
  const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, BatchGetCommand } =
    await import('@aws-sdk/lib-dynamodb')
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }),
    { marshallOptions: { removeUndefinedValues: true } })
  const strip = ({ PK, SK, expires_at, ...rest }) => rest
  const prefix = { segments: 'SEG', risks: 'RISK', alerts: 'ALERT' }

  return {
    kind: 'dynamodb',
    async putPerson(person) {
      const { guardian, ...p } = person
      await db.send(new PutCommand({ TableName: table, Item: { PK: `PERSON#${p.id}`, SK: 'PROFILE', ...p } }))
      if (guardian) await db.send(new PutCommand({ TableName: table,
        Item: { PK: `PERSON#${p.id}`, SK: `GUARDIAN#${guardian.id || 'main'}`, ...guardian } }))
    },
    async getPerson(id) {
      const { Items = [] } = await db.send(new QueryCommand({ TableName: table,
        KeyConditionExpression: 'PK = :pk', ExpressionAttributeValues: { ':pk': `PERSON#${id}` } }))
      const profile = Items.find(i => i.SK === 'PROFILE')
      if (!profile) return null
      const guardian = Items.find(i => i.SK.startsWith('GUARDIAN#'))
      return { ...strip(profile), guardian: guardian && strip(guardian) }
    },
    async createCall(call) {
      const row = { id: randomUUID(), status: 'live', max_risk: 0, final_zone: 'GREEN', started_at: now(), ...call }
      const exp = expiresAt()
      await db.send(new PutCommand({ TableName: table, Item: { PK: `CALL#${row.id}`, SK: 'META', expires_at: exp, ...row } }))
      await db.send(new PutCommand({ TableName: table, Item: {
        PK: `PERSON#${row.person_id}`, SK: `CALL#${row.started_at}#${row.id}`, call_id: row.id, expires_at: exp } }))
      return row
    },
    async updateCall(id, patch) {
      const keys = Object.keys(patch).filter(k => patch[k] !== undefined)
      const { Attributes } = await db.send(new UpdateCommand({ TableName: table, Key: { PK: `CALL#${id}`, SK: 'META' },
        UpdateExpression: 'SET ' + keys.map((k, i) => `#k${i} = :v${i}`).join(', '),
        ExpressionAttributeNames: Object.fromEntries(keys.map((k, i) => [`#k${i}`, k])),
        ExpressionAttributeValues: Object.fromEntries(keys.map((k, i) => [`:v${i}`, patch[k]])),
        ReturnValues: 'ALL_NEW' }))
      return strip(Attributes)
    },
    async listCalls(personId, limit = 50) {
      const { Items = [] } = await db.send(new QueryCommand({ TableName: table,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :c)',
        ExpressionAttributeValues: { ':pk': `PERSON#${personId}`, ':c': 'CALL#' },
        ScanIndexForward: false, Limit: limit }))
      if (!Items.length) return []
      const { Responses } = await db.send(new BatchGetCommand({ RequestItems: {
        [table]: { Keys: Items.map(i => ({ PK: `CALL#${i.call_id}`, SK: 'META' })) } } }))
      return (Responses[table] || []).map(strip).sort((a, b) => b.started_at.localeCompare(a.started_at))
    },
    async getCall(id) {
      const { Items = [] } = await db.send(new QueryCommand({ TableName: table,
        KeyConditionExpression: 'PK = :pk', ExpressionAttributeValues: { ':pk': `CALL#${id}` } }))
      const meta = Items.find(i => i.SK === 'META'); if (!meta) return null
      const pick = p => Items.filter(i => i.SK.startsWith(p + '#')).map(strip)
      return { call: strip(meta), segments: pick('SEG'), risks: pick('RISK'), alerts: pick('ALERT') }
    },
    async add(kind, row) {
      const full = { id: randomUUID(), created_at: now(), ...row }
      await db.send(new PutCommand({ TableName: table, Item: {
        PK: `CALL#${row.call_id}`, SK: `${prefix[kind]}#${full.created_at}#${full.id}`, expires_at: expiresAt(), ...full } }))
      return full
    },
  }
}
