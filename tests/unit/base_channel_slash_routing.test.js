import assert from 'node:assert'
import { test } from 'node:test'

import { BaseChannel } from '../../channels/common/BaseChannel.js'

function subject() {
  const calls = []
  const channel = {
    _enqueueSession: async (...args) => {
      calls.push(['enqueue', ...args])
      return 'queued'
    },
    _route: async (...args) => {
      calls.push(['route', ...args])
      return 'routed'
    },
    id: 'agent:a1',
    latestContextToken: null,
    log: { info() {} },
    masterId: 'system',
    memory: { getActiveSession: async () => 's_default' },
  }
  return { calls, channel }
}

test('exact-session Web slash commands use the common command router', async () => {
  const { calls, channel } = subject()

  const result = await BaseChannel.prototype.appendUserMessage.call(
    channel,
    's_selected',
    '  /yolo on  ',
    {
      allowSlashCommands: true,
      from: 'web-user',
      isWeb: true,
      sessionId: 's_selected',
      source: 'web',
    },
  )

  assert.equal(result, 'routed')
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 'route')
  assert.equal(calls[0][1], '/yolo on')
  assert.equal(calls[0][2].sid, 's_selected')
  assert.equal(calls[0][2].sessionId, 's_selected')
})

test('system turns keep slash-prefixed payloads as ordinary conversation text', async () => {
  const { calls, channel } = subject()

  const result = await BaseChannel.prototype.appendUserMessage.call(
    channel,
    's_task',
    '/daily report',
    { source: 'system' },
  )

  assert.equal(result, 'queued')
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 'enqueue')
  assert.equal(calls[0][1], 's_task')
  assert.equal(calls[0][2], '/daily report')
})
