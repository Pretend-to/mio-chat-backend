import { test } from 'node:test'
import assert from 'node:assert'
import '../adapters/mock-env.js'

import { MioFunction } from '../../lib/function.js'
import LLMMessageEvent from '../../lib/server/socket.io/utils/LLMMessageEvent.js'
import streamCache from '../../lib/server/socket.io/services/streamCache.js'

test('MioFunction - requestUserApproval', async (t) => {
  const myFunc = new MioFunction({
    name: 'test_func',
    func: async () => 'result',
    description: 'test description',
    parameters: { type: 'object', properties: {} }
  })

  await t.test('should send REQUEST_APPROVAL update and register interaction without timeout', async () => {
    let updateCalled = false
    let registeredInteractionId = null
    let registeredCallback = null

    const mockEvent = {
      update(chunk) {
        updateCalled = true
        assert.strictEqual(chunk.type, 'action')
        assert.strictEqual(chunk.content.actionType, 'REQUEST_APPROVAL')
      },
      registerInteraction(id, cb) {
        registeredInteractionId = id
        registeredCallback = cb
      }
    }

    const approvalPromise = myFunc.requestUserApproval(mockEvent, 'Approve this?')

    assert.ok(updateCalled)
    assert.ok(registeredInteractionId)
    assert.ok(registeredCallback)

    // Simulate user approving
    registeredCallback({ approved: true, reason: 'ok' })

    const result = await approvalPromise
    assert.strictEqual(result.approved, true)
    assert.strictEqual(result.reason, 'ok')
  })
})

test('LLMMessageEvent - update caching rules', async (t) => {
  const mockClient = {
    id: 'user_1',
    ip: '127.0.0.1',
    isAdmin: true,
    origin: 'http://localhost',
    sendOpenaiMessage(type, data, requestId) {},
    popEvent(id) {}
  }
  const req = {
    request_id: 'req_123',
    data: {},
    metaData: {
      contactorId: 'contactor_123'
    }
  }

  const event = new LLMMessageEvent(req, mockClient)

  // Clear stream cache first
  streamCache.delete('user_1', 'contactor_123')

  // 1. Send normal content chunk -> should cache
  event.update({ type: 'content', content: 'hello' })
  let cached = streamCache.cache.get('user_1:contactor_123')
  assert.ok(cached)
  assert.strictEqual(cached[0].chunks[0].type, 'content')
  assert.strictEqual(cached[0].chunks[0].content, 'hello')

  // 2. Send standard action chunk -> should NOT cache
  event.update({ type: 'action', content: { actionType: 'SHOW_SELECT_OVERLAY' } })
  cached = streamCache.cache.get('user_1:contactor_123')
  // The action chunk should not be added to the cache array
  assert.strictEqual(cached[0].chunks.length, 1)

  // 3. Send REQUEST_APPROVAL action chunk -> should cache
  event.update({ type: 'action', content: { actionType: 'REQUEST_APPROVAL', interactionId: 'int_1' } })
  cached = streamCache.cache.get('user_1:contactor_123')
  assert.strictEqual(cached[0].chunks.length, 2)
  assert.strictEqual(cached[0].chunks[1].type, 'action')
  assert.strictEqual(cached[0].chunks[1].content.actionType, 'REQUEST_APPROVAL')

  // Clean up
  streamCache.delete('user_1', 'contactor_123')
})

test('LLMMessageEvent - triggerType behavior', async (t) => {
  const mockClient = {
    id: 'user_1',
    ip: '127.0.0.1',
    isAdmin: true,
    origin: 'http://localhost',
    sendOpenaiMessage(type, data, requestId) {},
    popEvent(id) {}
  }

  // 1. Standard chat event (default fallback)
  const reqChat = {
    request_id: 'req_123',
    data: {},
    metaData: {
      contactorId: 'contactor_123'
    }
  }
  const eventChat = new LLMMessageEvent(reqChat, mockClient)
  assert.strictEqual(eventChat.metaData.triggerType, 'chat')

  // 2. Task event (isTask: true)
  const reqTask = {
    request_id: 'req_456',
    data: {},
    metaData: {
      contactorId: 'contactor_123',
      isTask: true
    }
  }
  const eventTask = new LLMMessageEvent(reqTask, mockClient)
  assert.strictEqual(eventTask.metaData.triggerType, 'task')

  // 3. Pre-defined triggerType should be preserved
  const reqPreserved = {
    request_id: 'req_789',
    data: {},
    metaData: {
      contactorId: 'contactor_123',
      triggerType: 'custom_trigger'
    }
  }
  const eventPreserved = new LLMMessageEvent(reqPreserved, mockClient)
  assert.strictEqual(eventPreserved.metaData.triggerType, 'custom_trigger')
})
