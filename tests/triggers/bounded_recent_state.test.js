import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  BoundedRecentMap,
  BoundedRecentSet,
} from '../../lib/triggers/BoundedRecentState.js'

test('recent status map evicts the oldest execution at the 1024 boundary', () => {
  const statuses = new BoundedRecentMap()
  for (let index = 0; index < 1024; index++) {
    statuses.set(`execution-${index}`, 'queued')
  }
  statuses.set('execution-0', 'running')
  statuses.set('execution-1024', 'queued')

  assert.equal(statuses.size, 1024)
  assert.equal(statuses.has('execution-0'), false)
  assert.equal(statuses.get('execution-1'), 'queued')
  assert.equal(statuses.get('execution-1024'), 'queued')
})

test('early wake callback refreshes its eviction position after delete and set', () => {
  const callbacks = new BoundedRecentMap()
  for (let index = 0; index < 1024; index++) {
    callbacks.set(`execution-${index}`, { status: 'queued' })
  }
  callbacks.delete('execution-0')
  callbacks.set('execution-0', { status: 'running' })
  callbacks.set('execution-1024', { status: 'queued' })

  assert.equal(callbacks.size, 1024)
  assert.equal(callbacks.get('execution-0').status, 'running')
  assert.equal(callbacks.has('execution-1'), false)
})

test('started execution set evicts oldest and can release completed executions', () => {
  const started = new BoundedRecentSet()
  for (let index = 0; index < 1025; index++) {
    started.add(`execution-${index}`)
  }

  assert.equal(started.size, 1024)
  assert.equal(started.has('execution-0'), false)
  assert.equal(started.has('execution-1024'), true)
  started.delete('execution-1024')
  assert.equal(started.has('execution-1024'), false)
})

test('recent caches require a positive integer capacity', () => {
  assert.throws(() => new BoundedRecentMap(0), RangeError)
  assert.throws(() => new BoundedRecentSet(1.5), RangeError)
})
