import assert from 'node:assert/strict'
import test from 'node:test'

import '../adapters/mock-env.js'

import { ChatEventFactory } from '../../lib/chat/llm/events/ChatEventFactory.js'
import BaseLLMAdapter from '../../lib/chat/llm/adapters/base.js'

function createAdjustment(overrides = {}) {
  return ChatEventFactory.createMock({
    eventId: 'work-1',
    idempotencyKey: 'work-key-1',
    instruction: 'Inspect the latest deployment result.',
    kind: 'cron',
    originRef: { taskExecutionId: 'task-run-1' },
    wakeKind: 'cron',
    ...overrides,
  })
}

function createRunningEvent(overrides = {}) {
  const event = ChatEventFactory.createMock({
    eventId: 'active-1',
    sessionId: 'session-1',
    conversationKey: 'agent:agent-1:session:session-1',
    ...overrides,
  })
  event.markRunning()
  return event
}

test('ChatEvent.adjust queues, deduplicates, and rejects incompatible work', () => {
  const active = createRunningEvent()
  const incoming = createAdjustment({
    conversationKey: active.conversationKey,
    sessionId: active.sessionId,
  })

  assert.deepEqual(active.adjust(incoming), {
    status: 'accepted_for_checkpoint',
  })
  assert.equal(incoming.deliveryStatus, 'queued')
  assert.deepEqual(active.adjust(incoming), { status: 'duplicate' })

  const wrongSession = createAdjustment({
    eventId: 'work-other-session',
    idempotencyKey: 'work-other-session-key',
    sessionId: 'session-2',
  })
  assert.deepEqual(active.adjust(wrongSession), { status: 'incompatible' })

  const beforeStart = ChatEventFactory.createMock({ eventId: 'not-running' })
  assert.deepEqual(beforeStart.adjust(createAdjustment()), {
    status: 'defer_to_next_turn',
  })
})

test('ChatEvent bounds pending adjustment count and instruction size', () => {
  const active = createRunningEvent()
  for (let index = 0; index < 16; index += 1) {
    assert.equal(
      active.adjust(
        createAdjustment({
          conversationKey: active.conversationKey,
          eventId: `work-${index}`,
          idempotencyKey: `key-${index}`,
          sessionId: active.sessionId,
        }),
      ).status,
      'accepted_for_checkpoint',
    )
  }
  const overflow = createAdjustment({
    conversationKey: active.conversationKey,
    eventId: 'work-overflow',
    idempotencyKey: 'key-overflow',
    sessionId: active.sessionId,
  })
  assert.equal(active.adjust(overflow).status, 'defer_to_next_turn')
  assert.equal(overflow.deliveryStatus, 'deferred')

  const oversizedOwner = createRunningEvent()
  const oversized = createAdjustment({
    conversationKey: oversizedOwner.conversationKey,
    eventId: 'work-oversized',
    idempotencyKey: 'key-oversized',
    instruction: 'x'.repeat(16001),
    sessionId: oversizedOwner.sessionId,
  })
  assert.equal(
    oversizedOwner.adjust(oversized).status,
    'defer_to_next_turn',
  )
  assert.equal(oversized.deliveryStatus, 'deferred')
})

test('ChatEvent checkpoint hook retains work on failure and consumes on success', async () => {
  const active = createRunningEvent()
  const incoming = createAdjustment({
    conversationKey: active.conversationKey,
    sessionId: active.sessionId,
  })
  active.adjust(incoming)

  active.setAdjustmentCheckpointHook(async () => {
    throw new Error('persistence unavailable')
  })
  await assert.rejects(active.consumeAdjustmentsAtCheckpoint(), {
    message: 'persistence unavailable',
  })
  assert.equal(incoming.deliveryStatus, 'queued')

  let persistedBatch
  active.setAdjustmentCheckpointHook(async (batch, owner) => {
    persistedBatch = { batch, owner }
  })
  const consumed = await active.consumeAdjustmentsAtCheckpoint()
  assert.equal(consumed.length, 1)
  assert.equal(persistedBatch.owner, active)
  assert.equal(persistedBatch.batch[0].event, incoming)
  assert.equal(incoming.deliveryStatus, 'absorbed')
  assert.equal(incoming.absorbedByEventId, active.eventId)

  const statuses = []
  active.onAdjustmentStatus((status) => statuses.push(status))
  active.notifyAdjustmentsInjected(consumed, {
    afterToolCallId: 'call-1',
    afterToolResults: true,
    messageIndex: 4,
  })
  assert.equal(statuses[0].status, 'absorbed')
  assert.equal(statuses[0].eventId, incoming.eventId)
  assert.equal(statuses[0].workEventId, incoming.eventId)
  assert.deepEqual(statuses[0].anchor, {
    afterToolCallId: 'call-1',
    afterToolResults: true,
    messageIndex: 4,
  })
})

test('ChatEvent can return unconsumed work for the next turn', () => {
  const active = createRunningEvent()
  const incoming = createAdjustment({
    conversationKey: active.conversationKey,
    sessionId: active.sessionId,
  })
  const statuses = []
  active.onAdjustmentStatus((status) => statuses.push(status))

  active.adjust(incoming)
  active.complete()
  const pending = active.takePendingAdjustments()

  assert.equal(pending.length, 1)
  assert.equal(pending[0].event, incoming)
  assert.equal(incoming.deliveryStatus, 'deferred')
  assert.equal(statuses.at(-1).status, 'defer_to_next_turn')
  assert.equal(statuses.at(-1).workEventId, incoming.eventId)
  assert.equal(active.takePendingAdjustments().length, 0)
})

test('BaseLLMAdapter defers pending work on complete, error, and abort', async () => {
  for (const outcome of ['complete', 'error', 'abort']) {
    const active = createRunningEvent({
      eventId: `active-${outcome}`,
      sessionId: null,
    })
    const incoming = createAdjustment({
      conversationKey: active.conversationKey,
      eventId: `work-${outcome}`,
      idempotencyKey: `key-${outcome}`,
      sessionId: null,
    })
    const statuses = []
    active.onAdjustmentStatus((status) => statuses.push(status))

    const adapter = Object.create(BaseLLMAdapter.prototype)
    adapter._prepareChatBody = async () => ({})
    adapter._executeChatRequest = async () => {
      assert.equal(active.adjust(incoming).status, 'accepted_for_checkpoint')
      if (outcome === 'error') throw new Error('model failed')
      if (outcome === 'abort') active.aborted = true
      return {}
    }

    await adapter.handleChatRequest(active)

    assert.equal(incoming.deliveryStatus, 'deferred', outcome)
    assert.equal(
      statuses.at(-1).status,
      'defer_to_next_turn',
      `${outcome} should report unconsumed work`,
    )
    assert.equal(statuses.at(-1).workEventId, incoming.eventId)
  }
})

test('BaseLLMAdapter injects adjustments after ordered tool results', async (t) => {
  const originalRunTool = global.middleware.llm.runTool
  t.after(() => {
    global.middleware.llm.runTool = originalRunTool
  })
  global.middleware.llm.runTool = async (toolCallData) => {
    const wait = toolCallData.name === 'first_tool' ? 10 : 1
    await new Promise((resolve) => setTimeout(resolve, wait))
    return { result: `result:${toolCallData.name}` }
  }

  const active = createRunningEvent()
  const incoming = createAdjustment({
    conversationKey: active.conversationKey,
    sessionId: active.sessionId,
  })
  active.adjust(incoming)
  const statuses = []
  active.onAdjustmentStatus((status) => statuses.push(status))

  let checkpointSawResults = false
  active.setAdjustmentCheckpointHook(async () => {
    const tail = active.body.messages.slice(-2)
    checkpointSawResults =
      tail.length === 2 &&
      tail[0].content === 'result:first_tool' &&
      tail[1].content === 'result:second_tool'
  })

  const adapter = Object.create(BaseLLMAdapter.prototype)
  adapter.handleChatRequest = async () => {}
  await adapter._handleToolCalls(
    [
      {
        function: { arguments: '{}', name: 'first_tool' },
        id: 'call-1',
        type: 'function',
      },
      {
        function: { arguments: '{}', name: 'second_tool' },
        id: 'call-2',
        type: 'function',
      },
    ],
    active,
  )

  const messages = active.body.messages
  const continuation = messages.at(-1)
  assert.equal(checkpointSawResults, true)
  assert.equal(continuation.role, 'user')
  assert.equal(continuation.content, incoming.instruction)
  assert.equal(continuation._is_recursive_context, true)
  assert.equal(continuation._workEventId, incoming.eventId)
  assert.equal(continuation._wakeKind, incoming.wakeKind)
  assert.equal(Object.keys(continuation).includes('_workEventId'), false)
  assert.equal(incoming.completed, false)
  assert.equal(incoming.deliveryStatus, 'absorbed')

  const toolMessages = messages.filter((message) => message.role === 'tool')
  assert.deepEqual(
    toolMessages.map((message) => message.content),
    ['result:first_tool', 'result:second_tool'],
  )
  const injected = statuses.find((status) => status.status === 'absorbed')
  assert.equal(injected.eventId, incoming.eventId)
  assert.equal(injected.workEventId, incoming.eventId)
  assert.deepEqual(injected.anchor.afterToolCallIds, ['call-1', 'call-2'])
  assert.equal(injected.anchor.afterToolCallId, 'call-2')
  assert.equal(injected.anchor.afterToolResults, true)
  assert.equal(injected.anchor.messageIndex, messages.length - 1)
})
