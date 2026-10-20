/**
 * Phase 2 bridge-removal guardrails. These exercise the public Channel LLM
 * adapter, so they continue to apply when its temporary bridge is deleted.
 */
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { test } from 'node:test'

global.logger = global.logger || console

import approvalNotificationBroker from '../../lib/approvals/ApprovalNotificationBroker.js'
import sessions from '../../lib/server/socket.io/services/sessions.js'
import streamCache from '../../lib/server/socket.io/services/streamCache.js'
import { createBackendLlm } from '../../channels/llm.js'

function context(overrides = {}) {
  const id = crypto.randomUUID()
  const agentId = `agent-bridge-${id}`
  return {
    agentId,
    channel: { channelType: 'session', log: { info() {}, error() {} } },
    chat: [],
    from: 'human-1',
    memory: { agentId, getAgentMeta: async () => 0 },
    messageId: `message-${id}`,
    onEmitTextBlock: async () => {},
    sessionId: `session-${id}`,
    text: 'test',
    toolNames: [],
    ...overrides,
  }
}

async function until(predicate) {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    if (predicate()) return
    await new Promise((resolve) => setImmediate(resolve))
  }
  assert.fail('Timed out waiting for the Channel LLM event')
}

test('Channel event uses prototype lifecycle and runs abort listeners', async () => {
  let observed
  let abortCount = 0
  let requestAbort
  const llm = createBackendLlm({
    llmService: {
      handleMessage: async (event) => {
        observed = event
        event.onAbort(() => { abortCount += 1 })
      },
    },
  })
  const run = llm.process(context({
    onRegisterAbort: (abort) => { requestAbort = abort },
  }))
  await until(() => observed && requestAbort)
  assert.equal(Object.hasOwn(observed, 'complete'), false)
  assert.equal(Object.hasOwn(observed, 'error'), false)
  assert.equal(Object.hasOwn(observed, 'update'), false)
  requestAbort()
  await run
  assert.equal(abortCount, 1)
  assert.equal(observed.aborted, true)
  assert.equal(observed.completed, true)
})

test('parent-window approval stays pending in broker until an explicit answer', async (t) => {
  t.after(() => approvalNotificationBroker.clear())
  const target = {
    agentId: 'agent-parent',
    approvalSource: 'subagent',
    label: 'child',
    parentSessionId: 'session-parent',
    requestId: `approval-${crypto.randomUUID()}`,
    sourceSessionId: 'session-child',
    subagentRunId: 'run-child',
  }
  let interactionResult
  const llm = createBackendLlm({
    llmService: {
      handleMessage: async (event) => {
        await event.update({
          type: 'action',
          content: {
            actionType: 'REQUEST_APPROVAL',
            interactionId: 'interaction-1',
            prompt: 'Run sensitive command?',
          },
        })
        interactionResult = await new Promise((resolve) => {
          event.registerInteraction('interaction-1', resolve)
        })
        await event.complete()
      },
    },
  })

  const run = llm.process(context({ approvalTarget: target }))
  await until(() => approvalNotificationBroker.pending.size === 1)
  const [item] = approvalNotificationBroker.pending.values()
  assert.equal(item.requestId, target.requestId)
  assert.equal(item.action.meta.subagentRunId, target.subagentRunId)
  assert.equal(item.action.meta.parentSessionId, target.parentSessionId)
  assert.equal(interactionResult, undefined, 'approval must not be auto-approved')
  assert.equal(
    approvalNotificationBroker.respond({
      interactionId: 'interaction-1',
      payload: { approved: false, reason: 'parent rejected' },
      requestId: target.requestId,
    }),
    true,
  )
  await run
  assert.deepEqual(interactionResult, {
    approved: false,
    reason: 'parent rejected',
  })
})

function addAdminClient(t) {
  const frames = []
  const client = {
    activeEvents: new Map(),
    id: `admin-bridge-${crypto.randomUUID()}`,
    initCacheMesageMethod() {},
    isAdmin: true,
    popEvent() {},
    sendOpenaiMessage(type, data, requestId) {
      frames.push({ data, requestId, type })
    },
    socket: {},
  }
  sessions.addSession(client)
  t.after(() => {
    sessions.removeSession(client)
    sessions.cache.delete(client.id)
  })
  return frames
}

test('Channel stream mirrors update and complete frames and forwards extraRender once', async (t) => {
  const frames = addAdminClient(t)
  const emitted = []
  const ctx = context({
    onEmitTextBlock: async (text, options) => emitted.push({ options, text }),
  })
  t.after(() => streamCache.delete('admin', ctx.agentId))
  const image = { type: 'image', url: 'https://example.test/guard.png' }
  const llm = createBackendLlm({
    llmService: {
      handleMessage: async (event) => {
        await event.update({ type: 'content', content: 'hello' })
        await event.update({
          type: 'toolCall',
          content: { name: 'image-tool', action: 'finished', extraRender: [image] },
        })
        await event.update({ type: 'extraRender', extraRender: [image] })
        await event.complete()
      },
    },
  })
  await llm.process(ctx)

  const updates = frames.filter((frame) => frame.type === 'update')
  const completed = frames.filter((frame) => frame.type === 'complete')
  assert.equal(updates.length, 3)
  assert.equal(completed.length, 1)
  assert.deepEqual(
    updates.map((frame) => frame.data.type),
    ['content', 'toolCall', 'extraRender'],
  )
  for (const frame of [...updates, ...completed]) {
    assert.equal(frame.requestId, ctx.messageId)
    assert.equal(frame.data.metaData.contactorId, ctx.agentId)
    assert.equal(frame.data.metaData.messageId, ctx.messageId)
  }
  assert.deepEqual(emitted, [
    { text: 'hello', options: undefined },
    { text: '', options: { extraRender: image, image: image.url } },
  ])
})

test('Channel failure mirrors a failed control frame with original error', async (t) => {
  const frames = addAdminClient(t)
  const ctx = context()
  t.after(() => streamCache.delete('admin', ctx.agentId))
  const llm = createBackendLlm({
    llmService: {
      handleMessage: async (event) => {
        event.error(new Error('provider failed'))
      },
    },
  })
  await assert.rejects(llm.process(ctx), /provider failed/)
  const failed = frames.filter((frame) => frame.type === 'failed')
  assert.equal(failed.length, 1)
  assert.equal(failed[0].requestId, ctx.messageId)
  assert.equal(failed[0].data.message, 'provider failed')
  assert.equal(failed[0].data.metaData.contactorId, ctx.agentId)
  assert.equal(failed[0].data.metaData.messageId, ctx.messageId)
})

test('Channel event preserves explicit request identity, wake trigger and principal actor', async () => {
  let observed
  const ctx = context({
    eventId: `event-${crypto.randomUUID()}`,
    isWake: true,
    principal: {
      externalUserId: 'external-human',
      id: 'principal-human',
      isAdmin: true,
      role: 'system_admin',
    },
  })
  const llm = createBackendLlm({
    llmService: {
      handleMessage: async (event) => {
        observed = event
        await event.complete()
      },
    },
  })
  await llm.process(ctx)
  assert.equal(observed.requestId, ctx.eventId)
  assert.equal(observed.eventId, ctx.eventId)
  assert.equal(observed.triggerKind, 'task')
  assert.equal(observed.actorId, 'external-human')
  assert.equal(observed.principalId, 'principal-human')
})
