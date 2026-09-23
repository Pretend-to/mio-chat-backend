import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildReplayMetadata,
  filterReplayChunks,
  hasPendingInteraction,
} from '../../lib/server/socket.io/services/streamReplay.js'

test('stream replay supports both ChatEvent and headless interaction registries', () => {
  assert.equal(
    hasPendingInteraction(
      { _interactions: new Map([['chat-action', () => {}]]) },
      'chat-action',
    ),
    true,
  )
  assert.equal(
    hasPendingInteraction(
      {
        _interactions: {},
        interactions: new Map([['headless-action', () => {}]]),
      },
      'headless-action',
    ),
    true,
  )
  assert.equal(
    hasPendingInteraction({ interactions: undefined }, 'missing'),
    false,
  )
  assert.equal(hasPendingInteraction(null, 'missing'), false)
})

test('stream replay drops stale actions without dropping normal chunks', () => {
  const chunks = [
    { content: 'before', type: 'content' },
    { content: { interactionId: 'active' }, type: 'action' },
    { content: { interactionId: 'stale' }, type: 'action' },
  ]
  const replay = filterReplayChunks(chunks, {
    interactions: new Map([['active', () => {}]]),
  })

  assert.deepEqual(replay, chunks.slice(0, 2))
  assert.deepEqual(filterReplayChunks(undefined, null), [])
})

test('stream replay preserves detached interaction metadata', () => {
  assert.deepEqual(
    buildReplayMetadata({
      interactionOnly: true,
      triggerType: 'subagent_approval',
    }),
    {
      interactionOnly: true,
      triggerType: 'subagent_approval',
    },
  )
  assert.equal(buildReplayMetadata({ isTask: true }).triggerType, 'task')
})
