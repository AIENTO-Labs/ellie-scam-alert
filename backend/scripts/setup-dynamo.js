// One-time AWS setup: DynamoDB table + 30-day auto-delete (TTL) + the protected person.
//   DDB_TABLE=Ellie AWS_REGION=eu-central-1 npm run setup-aws
// Needs AWS credentials (aws configure, an IAM role, or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY).
import { DynamoDBClient, CreateTableCommand, UpdateTimeToLiveCommand, waitUntilTableExists } from '@aws-sdk/client-dynamodb'
import { loadConfig } from '../src/config.js'
import { createStore } from '../src/store/store.js'

const cfg = loadConfig()
if (!cfg.ddbTable) { console.error('Set DDB_TABLE first, e.g. DDB_TABLE=Ellie'); process.exit(1) }
const TableName = cfg.ddbTable
const client = new DynamoDBClient({ region: cfg.awsRegion })

try {
  await client.send(new CreateTableCommand({ TableName, BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [{ AttributeName: 'PK', AttributeType: 'S' }, { AttributeName: 'SK', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'PK', KeyType: 'HASH' }, { AttributeName: 'SK', KeyType: 'RANGE' }],
    SSESpecification: { Enabled: true } }))
  console.log(`Creating table ${TableName} in ${cfg.awsRegion} …`)
} catch (e) {
  if (e.name !== 'ResourceInUseException') throw e
  console.log('Table already exists:', TableName)
}
await waitUntilTableExists({ client, maxWaitTime: 120 }, { TableName })
try {
  await client.send(new UpdateTimeToLiveCommand({ TableName, TimeToLiveSpecification: { Enabled: true, AttributeName: 'expires_at' } }))
  console.log(`Auto-delete after ${cfg.retentionDays} days: on`)
} catch (e) { if (!/already enabled/i.test(e.message)) throw e }

const store = await createStore(cfg)
await store.putPerson(cfg.person)
console.log('Protected person saved:', cfg.person.name)
