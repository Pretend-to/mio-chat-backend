import assert from 'node:assert/strict'
import test from 'node:test'

import {
  findMissingPersistenceTables,
  REQUIRED_PERSISTENCE_TABLES,
} from '../../lib/initialization/index.js'

test('schema guard detects actual missing persistence tables even when a hash could match', () => {
  assert.deepEqual(findMissingPersistenceTables(REQUIRED_PERSISTENCE_TABLES), [])
  assert.deepEqual(
    findMissingPersistenceTables(REQUIRED_PERSISTENCE_TABLES.filter(table => table !== 'messages')),
    ['messages'],
  )
})
