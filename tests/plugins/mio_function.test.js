import { test } from 'node:test'
import assert from 'node:assert'
import '../adapters/mock-env.js'

import { MioFunction } from '../../lib/function.js'
import LLMMessageEvent from '../../lib/server/socket.io/utils/LLMMessageEvent.js'
import streamCache from '../../lib/server/socket.io/services/streamCache.js'

test('MioFunction - requestUserApproval', async (t) => {
  const myFunc = new MioFunction({
    description: 'test description',
    func: async () => 'result',
    name: 'test_func',
    parameters: { properties: {}, type: 'object' }
  })

  await t.test('should send REQUEST_APPROVAL update and register interaction without timeout', async () => {
    let updateCalled = false
    let registeredInteractionId = null
    let registeredCallback = null

    const mockEvent = {
      registerInteraction(id, cb) {
        registeredInteractionId = id
        registeredCallback = cb
      },
      update(chunk) {
        updateCalled = true
        assert.strictEqual(chunk.type, 'action')
        assert.strictEqual(chunk.content.actionType, 'REQUEST_APPROVAL')
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

  await t.test('should expose only first two command words to approval UI', async () => {
    let action
    let callback
    const event = {
      registerInteraction(id, cb) { callback = cb; return id },
      update(chunk) { action = chunk.content },
    }

    const approvalPromise = myFunc.requestUserApproval(event, '请确认命令', {
      command: 'okx list --limit 100 --cursor dynamic-token',
      rememberable: true,
    })
    assert.equal(action.meta.command, 'okx list')
    assert.equal(action.meta.commandPreview, 'okx list')
    assert.equal(action.meta.commandPrefix1, 'okx')
    assert.equal(action.meta.commandPrefix2, 'okx list')
    assert.doesNotMatch(JSON.stringify(action.meta), /dynamic-token/)
    callback({ approved: true, rememberType: 'prefix2' })
    const result = await approvalPromise
    assert.equal(result.rememberType, 'prefix2')
  })

  await t.test('should expose the complete non-rememberable command to approval UI', async () => {
    let action
    let callback
    const event = {
      registerInteraction(id, cb) { callback = cb; return id },
      update(chunk) { action = chunk.content },
    }

    const approvalPromise = myFunc.requestUserApproval(event, '请确认危险命令', {
      command: 'okx list\nrm -rf /tmp/important',
      rememberable: false,
    })
    assert.equal(action.meta.command, 'okx list\nrm -rf /tmp/important')
    assert.equal(action.meta.commandPreview, 'okx list\nrm -rf /tmp/important')
    assert.equal(action.meta.commandPrefix1, undefined)
    callback({ approved: true })
    assert.equal((await approvalPromise).approved, true)
  })
})

test('LLMMessageEvent - update caching rules', async (_t) => {
  const mockClient = {
    id: 'user_1',
    ip: '127.0.0.1',
    isAdmin: true,
    origin: 'http://localhost',
    popEvent(_id) {},
    sendOpenaiMessage(_type, _data, _requestId) {}
  }
  const req = {
    data: {},
    metaData: {
      contactorId: 'contactor_123'
    },
    request_id: 'req_123'
  }

  const event = new LLMMessageEvent(req, mockClient)

  // Clear stream cache first
  streamCache.delete('user_1', 'contactor_123')

  // 1. Send normal content chunk -> should cache
  event.update({ content: 'hello', type: 'content' })
  let cached = streamCache.cache.get('user_1:contactor_123')
  assert.ok(cached)
  assert.strictEqual(cached[0].chunks[0].type, 'content')
  assert.strictEqual(cached[0].chunks[0].content, 'hello')

  // 2. Send standard action chunk -> should NOT cache
  event.update({ content: { actionType: 'SHOW_SELECT_OVERLAY' }, type: 'action' })
  cached = streamCache.cache.get('user_1:contactor_123')
  // The action chunk should not be added to the cache array
  assert.strictEqual(cached[0].chunks.length, 1)

  // 3. Send REQUEST_APPROVAL action chunk -> should cache
  event.update({ content: { actionType: 'REQUEST_APPROVAL', interactionId: 'int_1' }, type: 'action' })
  cached = streamCache.cache.get('user_1:contactor_123')
  assert.strictEqual(cached[0].chunks.length, 2)
  assert.strictEqual(cached[0].chunks[1].type, 'action')
  assert.strictEqual(cached[0].chunks[1].content.actionType, 'REQUEST_APPROVAL')

  // Clean up
  streamCache.delete('user_1', 'contactor_123')
})

test('LLMMessageEvent - triggerType behavior', async (_t) => {
  const mockClient = {
    id: 'user_1',
    ip: '127.0.0.1',
    isAdmin: true,
    origin: 'http://localhost',
    popEvent(_id) {},
    sendOpenaiMessage(_type, _data, _requestId) {}
  }

  // 1. Standard chat event (default fallback)
  const reqChat = {
    data: {},
    metaData: {
      contactorId: 'contactor_123'
    },
    request_id: 'req_123'
  }
  const eventChat = new LLMMessageEvent(reqChat, mockClient)
  assert.strictEqual(eventChat.metaData.triggerType, 'chat')

  // 2. Task event (isTask: true)
  const reqTask = {
    data: {},
    metaData: {
      contactorId: 'contactor_123',
      isTask: true
    },
    request_id: 'req_456'
  }
  const eventTask = new LLMMessageEvent(reqTask, mockClient)
  assert.strictEqual(eventTask.metaData.triggerType, 'task')

  // 3. Pre-defined triggerType should be preserved
  const reqPreserved = {
    data: {},
    metaData: {
      contactorId: 'contactor_123',
      triggerType: 'custom_trigger'
    },
    request_id: 'req_789'
  }
  const eventPreserved = new LLMMessageEvent(reqPreserved, mockClient)
  assert.strictEqual(eventPreserved.metaData.triggerType, 'custom_trigger')
})
