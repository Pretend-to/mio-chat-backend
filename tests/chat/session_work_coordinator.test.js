import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

import { ChatEventDispatcher } from '../../lib/chat/llm/events/ChatEventDispatcher.js'
import { createSessionPersistence } from '../../lib/chat/persistence/createSessionPersistence.js'
import { SessionWorkCoordinator } from '../../lib/chat/sessions/SessionWorkCoordinator.js'
import { SessionTurnService } from '../../lib/chat/sessions/SessionTurnService.js'

const id = (prefix) => `${prefix}_${crypto.randomUUID()}`

async function fixture(t) {
  const databasePath = `/tmp/mio-session-work-${process.pid}-${crypto.randomUUID()}.db`
  execFileSync(
    path.join(process.cwd(), 'node_modules/.bin/prisma'),
    [
      'db',
      'push',
      '--schema',
      path.join(process.cwd(), 'prisma/schema.prisma'),
      '--url',
      `file:${databasePath}`,
    ],
    { env: { ...process.env, RUST_LOG: 'debug' }, stdio: 'ignore' },
  )
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${databasePath}` }),
  })
  await prisma.$connect()
  t.after(async () => {
    await prisma.$disconnect()
    await fs.promises.rm(databasePath, { force: true })
  })
  return prisma
}

async function createTarget(prisma) {
  const agentId = id('agent')
  const sessionId = id('session')
  await prisma.agent.create({ data: { id: agentId } })
  await prisma.session.create({
    data: { agentId, id: sessionId, kind: 'conversation' },
  })
  return { agentId, sessionId }
}

async function waitForWorkItem(coordinator, workItemId) {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    const workItem = await coordinator.getWorkItem(workItemId)
    if (
      workItem &&
      ['completed', 'failed', 'needs_attention'].includes(workItem.status)
    ) {
      return workItem
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(
    `SessionWorkItem ${workItemId} did not reach a terminal status`,
  )
}

function createMockLlm({ aborted = false } = {}) {
  return {
    process: async () => ({
      aborted,
      completed: !aborted,
      content: [{ data: { text: 'Mock assistant reply.' }, type: 'text' }],
      recursiveUserMessages: [],
    }),
  }
}

test('SessionWorkCoordinator accepts idempotent work for an exact Agent Session', async (t) => {
  const prisma = await fixture(t)
  const target = await createTarget(prisma)
  const other = await createTarget(prisma)
  const coordinator = new SessionWorkCoordinator({ prisma })
  const input = {
    ...target,
    deliveryMode: 'session_only',
    idempotencyKey: id('idem'),
    instruction: 'Read the completed SubAgent result and continue.',
    kind: 'wake',
    originRef: 'subagent_group:group_1',
    principal: { id: 'system:subagent', role: 'system_admin' },
    wakeKind: 'subagent_done',
  }

  const accepted = await coordinator.acceptWake(input)
  const duplicate = await coordinator.acceptWake(input)
  assert.equal(accepted.id, duplicate.id)
  assert.equal(accepted.eventId, duplicate.eventId)
  assert.equal(accepted.status, 'accepted')
  assert.equal(
    accepted.conversationKey,
    `agent:${target.agentId}:session:${target.sessionId}`,
  )
  assert.equal(JSON.parse(accepted.principalJson).id, 'system:subagent')
  assert.equal((await coordinator.listOpenWorkItems({ ...target })).length, 1)

  await assert.rejects(
    coordinator.acceptWake({
      ...input,
      agentId: other.agentId,
      idempotencyKey: id('wrong-target'),
    }),
    (error) => error.code === 'session_agent_mismatch',
  )
  await assert.rejects(
    coordinator.acceptWake({
      ...input,
      idempotencyKey: id('too-long'),
      instruction: 'x'.repeat(16001),
    }),
    (error) => error.code === 'session_work_value_too_large',
  )
})

test('SessionWorkCoordinator enforces fenced leases and reports durable lifecycle changes', async (t) => {
  const prisma = await fixture(t)
  const target = await createTarget(prisma)
  let now = new Date('2026-09-24T00:00:00.000Z')
  const ownerA = new SessionWorkCoordinator({
    leaseOwner: 'owner-a',
    now: () => new Date(now),
    prisma,
  })
  const ownerB = new SessionWorkCoordinator({
    leaseOwner: 'owner-b',
    now: () => new Date(now),
    prisma,
  })
  const workItem = await ownerA.acceptWake({
    ...target,
    idempotencyKey: id('idem'),
    instruction: 'Continue from the stored result.',
    wakeKind: 'trigger',
  })
  const statusChanges = []
  ownerB.onWorkItemStatus((change) => statusChanges.push(change))

  const firstLease = await ownerA.acquireLease({ ...target, ttlMs: 1000 })
  assert.equal(firstLease.fencingToken, 1)
  assert.equal(await ownerB.acquireLease({ ...target, ttlMs: 1000 }), null)
  await ownerA.assertLease({ ...target, fencingToken: firstLease.fencingToken })

  now = new Date(now.getTime() + 1001)
  const takeover = await ownerB.acquireLease({ ...target, ttlMs: 1000 })
  assert.equal(takeover.fencingToken, firstLease.fencingToken + 1)
  await assert.rejects(
    ownerA.renewLease({ ...target, fencingToken: firstLease.fencingToken }),
    (error) => error.code === 'session_lease_lost',
  )

  const running = await ownerB.markWorkItemStatus(workItem.id, 'running')
  assert.equal(running.attempts, 1)
  const completed = await ownerB.markWorkItemStatus(workItem.id, 'completed', {
    completion: { outcome: 'done', resultRef: 'subagent_group:group_1' },
  })
  assert.equal(completed.status, 'completed')
  assert.deepEqual(JSON.parse(completed.completionJson), {
    outcome: 'done',
    resultRef: 'subagent_group:group_1',
  })
  assert.deepEqual(
    statusChanges.map(({ previousStatus, status }) => [previousStatus, status]),
    [
      ['accepted', 'running'],
      ['running', 'completed'],
    ],
  )
  assert.equal(
    await ownerB
      .markWorkItemStatus(workItem.id, 'failed')
      .then((row) => row.status),
    'completed',
  )
})

test('SessionWorkCoordinator reuses an existing lease row without another create', async (t) => {
  const prisma = await fixture(t)
  const target = await createTarget(prisma)
  let createCalls = 0
  const trackedPrisma = {
    session: {
      findUnique: (args) => prisma.session.findUnique(args),
    },
    sessionWorkLease: {
      create: (args) => {
        createCalls += 1
        return prisma.sessionWorkLease.create(args)
      },
      findUnique: (args) => prisma.sessionWorkLease.findUnique(args),
      updateMany: (args) => prisma.sessionWorkLease.updateMany(args),
    },
  }
  const ownerA = new SessionWorkCoordinator({ prisma: trackedPrisma, leaseOwner: 'owner-a' })
  const ownerB = new SessionWorkCoordinator({ prisma: trackedPrisma, leaseOwner: 'owner-b' })

  const first = await ownerA.acquireLease(target)
  assert.equal(createCalls, 1)
  assert.equal(await ownerB.acquireLease(target), null)
  assert.equal(createCalls, 1)

  assert.equal(await ownerA.releaseLease({ ...target, fencingToken: first.fencingToken }), true)
  const second = await ownerB.acquireLease(target)
  assert.equal(second.fencingToken, first.fencingToken + 1)
  assert.equal(createCalls, 1)
})

test('SessionWorkCoordinator resolves the Agent default delivery binding for Session wakes', async (t) => {
  const prisma = await fixture(t)
  const target = await createTarget(prisma)
  await prisma.channel.create({ data: { id: 'channel-default', type: 'web' } })
  await prisma.agentChannelBinding.create({
    data: {
      agentId: target.agentId,
      channelId: 'channel-default',
      id: 'binding-default',
    },
  })
  await prisma.agent.update({
    data: { defaultDeliveryBindingId: 'binding-default' },
    where: { id: target.agentId },
  })
  const coordinator = new SessionWorkCoordinator({ prisma })
  assert.equal(
    await coordinator.getDefaultDeliveryBindingId(target.agentId),
    'binding-default',
  )
})

test('SessionWorkCoordinator serializes lease holders within one process', async (t) => {
  const prisma = await fixture(t)
  const target = await createTarget(prisma)
  const coordinator = new SessionWorkCoordinator({ prisma })
  let releaseFirst
  let firstHasLease
  const acquired = new Promise((resolve) => {
    firstHasLease = resolve
  })
  const blocked = new Promise((resolve) => {
    releaseFirst = resolve
  })

  const first = coordinator.withSessionLease(
    target,
    async ({ sessionLease }) => {
      firstHasLease()
      await blocked
      await sessionLease.assertLease()
    },
  )
  await acquired
  await assert.rejects(
    coordinator.withSessionLease(target, async () => {}),
    (error) => error.code === 'session_busy',
  )
  releaseFirst()
  await first
})

test('ChatEventDispatcher resolves default bindings before absorbing a wake', async () => {
  let adjusted = 0
  const dispatcher = new ChatEventDispatcher({
    coordinator: {
      acceptWake: async () => ({
        agentId: 'agent-1',
        conversationKey: 'agent:agent-1:session:session-1',
        deliveryBindingId: null,
        deliveryMode: 'default',
        eventId: 'wake-event',
        id: 'work-1',
        idempotencyKey: 'wake-idem',
        instruction: 'Continue.',
        kind: 'wake',
        originRef: null,
        principalJson: null,
        sessionId: 'session-1',
        status: 'accepted',
        wakeKind: 'trigger_wake',
      }),
      getDefaultDeliveryBindingId: async () => 'binding-default',
      onWorkItemStatus: () => () => {},
      markWorkItemStatus: async () => null,
    },
  })
  dispatcher.registerActive({
    agentId: 'agent-1',
    deliveryBindingId: 'binding-default',
    deliveryMode: 'default',
    eventId: 'active-event',
    sessionId: 'session-1',
    adjust: async () => {
      adjusted++
      return { status: 'accepted_for_checkpoint' }
    },
  })

  await dispatcher.submitWake({
    agentId: 'agent-1',
    idempotencyKey: 'wake-idem',
    instruction: 'Continue.',
    sessionId: 'session-1',
    wakeKind: 'trigger_wake',
  })
  assert.equal(adjusted, 1)
})

test('ChatEventDispatcher does not inject a privileged wake into a normal user context', async () => {
  let adjusted = 0
  const markCalls = []
  const dispatcher = new ChatEventDispatcher({
    coordinator: {
      acceptWake: async () => ({
        agentId: 'agent-1',
        conversationKey: 'agent:agent-1:session:session-1',
        deliveryBindingId: null,
        deliveryMode: 'session_only',
        eventId: 'wake-event',
        id: 'work-1',
        idempotencyKey: 'wake-idem',
        instruction: 'Use the system tools.',
        kind: 'wake',
        originRef: null,
        principalJson: JSON.stringify({
          id: 'system:trigger',
          isAdmin: true,
          role: 'system_admin',
        }),
        sessionId: 'session-1',
        status: 'accepted',
        wakeKind: 'trigger_wake',
      }),
      onWorkItemStatus: () => () => {},
      markWorkItemStatus: async (_id, status) => markCalls.push(status),
    },
  })
  dispatcher.registerActive({
    agentId: 'agent-1',
    deliveryMode: 'session_only',
    eventId: 'active-event',
    sessionId: 'session-1',
    user: { id: 'user-1', isAdmin: false, role: 'user' },
    adjust: async () => {
      adjusted++
      return { status: 'accepted_for_checkpoint' }
    },
  })

  await dispatcher.submitWake({
    agentId: 'agent-1',
    deliveryMode: 'session_only',
    idempotencyKey: 'wake-idem',
    instruction: 'Use the system tools.',
    sessionId: 'session-1',
    wakeKind: 'trigger_wake',
  })
  assert.equal(adjusted, 0)
  assert.deepEqual(markCalls, ['deferred'])
})

test('ChatEventDispatcher adjusts a busy conversation and starts an idle one through its owner', async () => {
  const dispatcher = new ChatEventDispatcher({
    coordinator: {
      acceptWake: async () => ({ eventId: 'event-1', id: 'work-1' }),
      onWorkItemStatus: () => () => {},
      markWorkItemStatus: async () => null,
      getWorkItem: async () => null,
      listOpenWorkItems: async () => [],
    },
  })
  const active = {
    agentId: 'agent-1',
    sessionId: 'session-1',
    adjust: async (incoming) => ({
      status:
        incoming.instruction === 'inject'
          ? 'accepted_for_checkpoint'
          : 'defer_to_next_turn',
    }),
  }
  dispatcher.registerActive(active)
  const absorbed = await dispatcher.submit({
    agentId: active.agentId,
    eventId: 'event-inject',
    instruction: 'inject',
    sessionId: active.sessionId,
  })
  assert.equal(absorbed.status, 'accepted')
  assert.equal(absorbed.adjustStatus, 'accepted_for_checkpoint')

  const deferred = await dispatcher.submit({
    agentId: active.agentId,
    eventId: 'event-defer',
    instruction: 'defer',
    sessionId: active.sessionId,
  })
  assert.equal(deferred.status, 'deferred')
  assert.equal(deferred.adjustStatus, 'defer_to_next_turn')

  dispatcher.unregisterActive(active)
  let started = false
  const result = await dispatcher.submit(
    {
      eventId: 'event-idle',
      principalId: 'user-1',
      contactorId: 'chat-1',
    },
    {
      start: async () => {
        started = true
        return 'reply'
      },
    },
  )
  assert.equal(started, true)
  assert.equal(result.status, 'completed')
  assert.equal(result.result, 'reply')
})

test('ChatEventDispatcher keeps absorbed work open until the owner confirms persistence', async () => {
  const current = {
    agentId: 'agent-1',
    conversationKey: 'agent:agent-1:session:session-1',
    deliveryBindingId: null,
    deliveryMode: 'default',
    eventId: 'wake-event',
    id: 'work-1',
    idempotencyKey: 'wake-idem',
    instruction: 'Continue from this checkpoint.',
    kind: 'wake',
    originRef: 'test:1',
    principalJson: null,
    sessionId: 'session-1',
    status: 'accepted',
    wakeKind: 'test',
  }
  const coordinator = {
    acceptWake: async () => current,
    getWorkItem: async () => current,
    listOpenWorkItems: async () => [],
    markWorkItemStatus: async (_id, status, details = {}) => {
      current.status = status
      Object.assign(current, details)
      return current
    },
    onWorkItemStatus: () => () => {},
  }
  const dispatcher = new ChatEventDispatcher({ coordinator })
  let adjustmentStatusListener
  const active = {
    agentId: 'agent-1',
    deliveryMode: 'default',
    eventId: 'active-event',
    messageId: 'active-assistant-message',
    sessionId: 'session-1',
    adjust: async (incomingEvent) => {
      adjustmentStatusListener({
        activeEvent: active,
        anchor: { assistantMessageId: 'checkpoint-assistant-message' },
        incomingEvent,
        status: 'absorbed',
      })
      return { status: 'accepted_for_checkpoint' }
    },
    onAdjustmentStatus(listener) {
      adjustmentStatusListener = listener
      return () => {
        adjustmentStatusListener = null
      }
    },
  }
  dispatcher.registerActive(active)

  const receipt = await dispatcher.submitWake({
    agentId: 'agent-1',
    deliveryMode: 'default',
    idempotencyKey: 'wake-idem',
    instruction: current.instruction,
    sessionId: 'session-1',
    wakeKind: 'test',
  })
  await dispatcher.workItemStatusChains.get('work-1')
  assert.equal(receipt.status, 'accepted')
  assert.equal(current.status, 'absorbed')
  assert.equal(
    current.absorbedAssistantMessageId,
    'checkpoint-assistant-message',
  )

  await dispatcher.finishAbsorbedForEvent(active, {
    assistantMessageId: 'persisted-assistant-message',
    status: 'completed',
  })
  assert.equal(current.status, 'completed')
  assert.equal(
    current.absorbedAssistantMessageId,
    'persisted-assistant-message',
  )
})

test('ChatEventDispatcher requires review for absorbed work when its owner aborts', async () => {
  const current = {
    agentId: 'agent-1',
    conversationKey: 'agent:agent-1:session:session-1',
    deliveryBindingId: null,
    deliveryMode: 'default',
    eventId: 'aborted-wake-event',
    id: 'aborted-work-item',
    idempotencyKey: 'aborted-wake-idem',
    instruction: 'Continue from this checkpoint.',
    kind: 'wake',
    originRef: null,
    principalJson: null,
    sessionId: 'session-1',
    status: 'accepted',
    wakeKind: 'test',
  }
  const coordinator = {
    acceptWake: async () => current,
    getWorkItem: async () => current,
    listOpenWorkItems: async () => [],
    markWorkItemStatus: async (_id, status) => {
      current.status = status
      return current
    },
    onWorkItemStatus: () => () => {},
  }
  const dispatcher = new ChatEventDispatcher({ coordinator })
  let adjustmentStatusListener
  const active = {
    agentId: 'agent-1',
    deliveryMode: 'default',
    eventId: 'active-event',
    sessionId: 'session-1',
    adjust: async (incomingEvent) => {
      adjustmentStatusListener({
        activeEvent: active,
        incomingEvent,
        status: 'absorbed',
      })
      return { status: 'accepted_for_checkpoint' }
    },
    onAdjustmentStatus(listener) {
      adjustmentStatusListener = listener
      return () => {
        adjustmentStatusListener = null
      }
    },
  }
  dispatcher.registerActive(active)

  await dispatcher.submitWake({
    agentId: 'agent-1',
    idempotencyKey: 'aborted-wake-idem',
    instruction: current.instruction,
    sessionId: 'session-1',
    wakeKind: 'test',
  })
  await dispatcher.workItemStatusChains.get(current.id)
  assert.equal(current.status, 'absorbed')

  await dispatcher.finishAbsorbedForEvent(active, {
    error: 'The active event was aborted.',
    status: 'needs_attention',
  })
  assert.equal(current.status, 'needs_attention')
})

test('ChatEventDispatcher and SessionTurnService run an idle accepted wake into Session persistence', async (t) => {
  const prisma = await fixture(t)
  const target = await createTarget(prisma)
  const coordinator = new SessionWorkCoordinator({ prisma })
  const dispatcher = new ChatEventDispatcher({ coordinator })
  const service = new SessionTurnService({
    dispatcher,
    llm: createMockLlm(),
    persistenceFactory: async ({ agentId, prisma: db }) =>
      await createSessionPersistence({ agentId, mode: 'database', prisma: db }),
    prisma,
    sessionWorkCoordinator: coordinator,
  })
  const stopRunner = dispatcher.registerWakeRunner((workItem) =>
    service.runWorkItem(workItem),
  )
  t.after(async () => {
    stopRunner()
    await service.disposeAgent(target.agentId).catch(() => {})
  })

  const receipt = await dispatcher.submitWake({
    ...target,
    deliveryMode: 'session_only',
    idempotencyKey: 'e2e-idle-wake',
    instruction: 'Run this accepted wake.',
    kind: 'subagent_completion',
    principal: {
      externalUserId: 'subagent-runtime',
      id: 'system:subagent',
      isAdmin: true,
      role: 'system_admin',
    },
    wakeKind: 'subagent_done',
  })
  assert.equal(receipt.status, 'accepted')

  const completed = await waitForWorkItem(coordinator, receipt.workItemId)
  assert.equal(completed.status, 'completed')
  const messages = await prisma.message.findMany({
    orderBy: { seq: 'asc' },
    where: { sessionId: target.sessionId },
  })
  assert.deepEqual(
    messages.map(({ id: messageId, role, status, text }) => ({
      id: messageId,
      role,
      status,
      text,
    })),
    [
      {
        id: `msg_u_work_${receipt.eventId}`,
        role: 'user',
        status: 'final',
        text: 'Run this accepted wake.',
      },
      {
        id: `msg_a_work_${receipt.eventId}`,
        role: 'assistant',
        status: 'final',
        text: '',
      },
    ],
  )
  const completion = JSON.parse(completed.completionJson)
  assert.equal(completion.assistantMessageId, `msg_a_work_${receipt.eventId}`)
  assert.equal(completion.assistantText, 'Mock assistant reply.')
})

test('a deferred incompatible wake starts after the active event finalizes', async (t) => {
  const prisma = await fixture(t)
  const target = await createTarget(prisma)
  const coordinator = new SessionWorkCoordinator({ prisma })
  const dispatcher = new ChatEventDispatcher({ coordinator })
  const service = new SessionTurnService({
    dispatcher,
    llm: createMockLlm(),
    persistenceFactory: async ({ agentId, prisma: db }) =>
      await createSessionPersistence({ agentId, mode: 'database', prisma: db }),
    prisma,
    sessionWorkCoordinator: coordinator,
  })
  const stopRunner = dispatcher.registerWakeRunner((workItem) =>
    service.runWorkItem(workItem),
  )
  t.after(async () => {
    stopRunner()
    await service.disposeAgent(target.agentId).catch(() => {})
  })

  const active = {
    agentId: target.agentId,
    deliveryBindingId: 'channel-binding-1',
    deliveryMode: 'channel',
    eventId: 'currently-running-event',
    sessionId: target.sessionId,
    adjust: async () => {
      throw new Error('incompatible wake must not be absorbed')
    },
  }
  dispatcher.registerActive(active)
  const receipt = await dispatcher.submitWake({
    ...target,
    deliveryMode: 'session_only',
    idempotencyKey: 'e2e-deferred-wake',
    instruction: 'Run after the active event.',
    kind: 'subagent_completion',
    wakeKind: 'subagent_done',
  })
  assert.equal(
    (await coordinator.getWorkItem(receipt.workItemId)).status,
    'deferred',
  )

  dispatcher.unregisterActive(active)
  await dispatcher.finishAbsorbedForEvent(active, {
    assistantMessageId: 'active-assistant-message',
    status: 'completed',
  })
  const completed = await waitForWorkItem(coordinator, receipt.workItemId)
  assert.equal(completed.status, 'completed')
  assert.ok(
    await prisma.message.findUnique({
      where: { id: `msg_u_work_${receipt.eventId}` },
    }),
  )
})

test('SessionTurnService leaves an aborted wake for review instead of completing it', async (t) => {
  const prisma = await fixture(t)
  const target = await createTarget(prisma)
  const coordinator = new SessionWorkCoordinator({ prisma })
  const dispatcher = new ChatEventDispatcher({ coordinator })
  const service = new SessionTurnService({
    dispatcher,
    llm: createMockLlm({ aborted: true }),
    persistenceFactory: async ({ agentId, prisma: db }) =>
      await createSessionPersistence({ agentId, mode: 'database', prisma: db }),
    prisma,
    sessionWorkCoordinator: coordinator,
  })
  const stopRunner = dispatcher.registerWakeRunner((workItem) =>
    service.runWorkItem(workItem),
  )
  t.after(async () => {
    stopRunner()
    await service.disposeAgent(target.agentId).catch(() => {})
  })

  const receipt = await dispatcher.submitWake({
    ...target,
    deliveryMode: 'session_only',
    idempotencyKey: 'e2e-aborted-wake',
    instruction: 'This run will be aborted.',
    principal: {
      id: 'system:test',
      isAdmin: true,
      role: 'system_admin',
    },
    wakeKind: 'test_abort',
  })
  const interrupted = await waitForWorkItem(coordinator, receipt.workItemId)
  assert.equal(interrupted.status, 'needs_attention')
  const assistant = await prisma.message.findUnique({
    where: { id: `msg_a_work_${receipt.eventId}` },
  })
  assert.equal(assistant.status, 'aborted')
})

test('resumePending only replays work with no partial persistence evidence', async (t) => {
  const prisma = await fixture(t)
  const target = await createTarget(prisma)
  const coordinator = new SessionWorkCoordinator({ prisma })
  const dispatcher = new ChatEventDispatcher({ coordinator })
  const makeWorkItem = async (key) =>
    await coordinator.acceptWake({
      ...target,
      idempotencyKey: key,
      instruction: `Recover ${key}`,
      wakeKind: 'test',
    })

  const completedStandalone = await makeWorkItem('recover-complete')
  await coordinator.markWorkItemStatus(completedStandalone.id, 'running')
  await prisma.message.create({
    data: {
      content: '[]',
      id: `msg_a_work_${completedStandalone.eventId}`,
      role: 'assistant',
      seq: 1,
      sessionId: target.sessionId,
      status: 'final',
      text: 'Already completed.',
    },
  })

  const completedAbsorbed = await makeWorkItem('recover-absorbed-complete')
  await coordinator.markWorkItemStatus(completedAbsorbed.id, 'absorbed')
  await prisma.message.create({
    data: {
      content: JSON.stringify([
        {
          data: {
            content: 'Continue from this checkpoint.',
            eventId: completedAbsorbed.eventId,
            role: 'user',
          },
          type: 'context_message',
        },
      ]),
      id: 'msg_absorbed_checkpoint',
      role: 'assistant',
      seq: 2,
      sessionId: target.sessionId,
      status: 'final',
      text: 'Checkpoint completed.',
    },
  })

  const partial = await makeWorkItem('recover-partial')
  await coordinator.markWorkItemStatus(partial.id, 'running')
  await prisma.message.create({
    data: {
      content: '[]',
      id: `msg_u_work_${partial.eventId}`,
      role: 'user',
      seq: 3,
      sessionId: target.sessionId,
      status: 'final',
      text: partial.instruction,
    },
  })

  const noEvidence = await makeWorkItem('recover-no-evidence')
  await coordinator.markWorkItemStatus(noEvidence.id, 'running')

  const ambiguousAbsorbed = await makeWorkItem('recover-ambiguous-absorbed')
  await coordinator.markWorkItemStatus(ambiguousAbsorbed.id, 'absorbed')

  await dispatcher.resumePending()

  assert.equal(
    (await coordinator.getWorkItem(completedStandalone.id)).status,
    'completed',
  )
  assert.equal(
    (
      await coordinator.getWorkItem(completedStandalone.id)
    ).completionJson.includes('Already completed.'),
    true,
  )
  assert.equal(
    (await coordinator.getWorkItem(completedAbsorbed.id)).status,
    'completed',
  )
  assert.equal(
    (await coordinator.getWorkItem(partial.id)).status,
    'needs_attention',
  )
  assert.equal(
    (await coordinator.getWorkItem(noEvidence.id)).status,
    'deferred',
  )
  assert.equal(
    (await coordinator.getWorkItem(ambiguousAbsorbed.id)).status,
    'needs_attention',
  )
})
