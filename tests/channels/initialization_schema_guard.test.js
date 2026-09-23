import assert from 'node:assert/strict'
import test from 'node:test'

import {
  findMissingPersistenceTables,
  REQUIRED_PERSISTENCE_TABLES,
  SCHEMA_PUSH_COMMAND,
} from '../../lib/initialization/index.js'

test('schema guard detects actual missing persistence tables even when a hash could match', () => {
  assert.deepEqual(findMissingPersistenceTables(REQUIRED_PERSISTENCE_TABLES), [])
  assert.deepEqual(
    findMissingPersistenceTables(REQUIRED_PERSISTENCE_TABLES.filter(table => table !== 'messages')),
    ['messages'],
  )
})

test('startup schema sync never uses a whole-database reset', () => {
  assert.equal(SCHEMA_PUSH_COMMAND, 'npx prisma db push --accept-data-loss')
  assert.doesNotMatch(SCHEMA_PUSH_COMMAND, /--force-reset/)
})
