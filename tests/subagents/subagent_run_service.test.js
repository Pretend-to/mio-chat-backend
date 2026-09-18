import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

import prismaManager from '../../lib/database/prisma.js'
import { AgentService } from '../../lib/agents/AgentService.js'
import SubAgentRunService from '../../lib/subagents/SubAgentRunService.js'
import SubAgentDispatcher from '../../lib/subagents/SubAgentDispatcher.js'
import { GROUP_STATUS, RUN_STATUS } from '../../lib/subagents/StateMachine.js'
import { ChannelAgentRoutingService } from '../../channels/bindings/ChannelAgentRoutingService.js'

const id = (prefix) => `${prefix}_${crypto.randomUUID()}`

test('SubAgent Phase 1 persistence, ownership, idempotency and state machine', async (t) => {
  const prisma = await prismaManager.initialize()
  const agentId = id('agent')
  const parentSessionId = id('session')
  await prisma.agent.create({ data: { id: agentId, name: 'SubAgent Test' } })
  await prisma.session.create({
    data: { agentId, id: parentSessionId, kind: 'conversation', title: 'Main' },
  })
  await prisma.agent.update({
    data: { defaultSessionId: parentSessionId },
    where: { id: agentId },
  })
  t.after(async () => {
    await prisma.agent.deleteMany({ where: { id: agentId } })
  })

  const service = new SubAgentRunService({ prisma })
  const input = {
    agentId,
    allowedToolNames: ['web_search', 'read'],
    idempotencyKey: id('idem'),
    jobs: [
      {
        key: 'rank',
        objective: 'Read the ranking',
        role: 'Rank Researcher',
        sessionPolicy: 'fresh',
        tools: ['web_search'],
      },
      {
        dependsOn: ['rank'],
        key: 'deep',
        objective: 'Deep research',
        role: 'Deep Researcher',
        sessionPolicy: 'persistent',
        subagentKey: 'deep-research',
        tools: ['read'],
      },
    ],
    parentSessionId,
  }
  const group = await service.createGroup(input)
  assert.equal(group.status, GROUP_STATUS.DISPATCHED)
  assert.equal(group.runs.length, 2)
  assert.equal(group.runs[1].dependencies.length, 1)
  assert.deepEqual(JSON.parse(group.runs[0].toolNamesJson), ['web_search'])
  assert.equal(
    (await prisma.agent.findUnique({ where: { id: agentId } }))
      .defaultSessionId,
    parentSessionId,
  )
  const children = await prisma.session.findMany({
    where: { parentSessionId },
  })
  assert.equal(children.length, 2)
  assert.ok(
    children.every((child) => child.kind === 'subagent' && !child.visible),
  )

  const duplicate = await service.createGroup(input)
  assert.equal(duplicate.id, group.id)
  assert.equal(
    await prisma.subAgentRunGroup.count({
      where: { idempotencyKey: input.idempotencyKey },
    }),
    1,
  )
  await assert.rejects(
    new AgentService({ prisma }).deleteSession(
      agentId,
      group.runs[0].sessionId,
    ),
    (error) => error.code === 'session_has_active_subagent_runs',
  )

  await assert.rejects(
    service.createGroup({
      ...input,
      idempotencyKey: id('idem'),
      jobs: [{ key: 'escape', objective: 'Escape', tools: ['bash'] }],
    }),
    (error) => error.code === 'subagent_tool_forbidden',
  )
  const inheritedInteractiveShell = await service.createGroup({
    ...input,
    allowedToolNames: ['bash_input_mid_test'],
    idempotencyKey: id('idem'),
    jobs: [
      {
        key: 'shell-input',
        objective: 'Use interactive shell',
        tools: ['bash_input'],
      },
    ],
  })
  assert.deepEqual(
    JSON.parse(inheritedInteractiveShell.runs[0].toolNamesJson),
    ['bash_input_mid_test'],
  )
  const inheritedTools = await service.createGroup({
    ...input,
    allowedToolNames: [
      'bash_mid_safe',
      'read_mid_safe',
      'write_mid_unsafe',
      'agent_profile_mid_unsafe',
    ],
    idempotencyKey: id('idem'),
    jobs: [{ key: 'inherit', objective: 'Inspect local state' }],
  })
  assert.deepEqual(JSON.parse(inheritedTools.runs[0].toolNamesJson), [
    'bash_mid_safe',
    'read_mid_safe',
    'write_mid_unsafe',
    'agent_profile_mid_unsafe',
  ])
  const explicitShell = await service.createGroup({
    ...input,
    allowedToolNames: ['bash_mid_safe', 'read_mid_safe'],
    idempotencyKey: id('idem'),
    jobs: [
      {
        key: 'shell',
        objective: 'Use an explicitly assigned shell',
        tools: ['bash', 'read'],
      },
    ],
  })
  assert.deepEqual(JSON.parse(explicitShell.runs[0].toolNamesJson), [
    'bash_mid_safe',
    'read_mid_safe',
  ])
  const inheritedSideEffectTool = await service.createGroup({
    ...input,
    allowedToolNames: ['send_email_mid_unsafe'],
    idempotencyKey: id('idem'),
    jobs: [
      {
        key: 'inherited-side-effect',
        objective: 'Use a parent-authorized tool',
        tools: ['send_email'],
      },
    ],
  })
  assert.deepEqual(JSON.parse(inheritedSideEffectTool.runs[0].toolNamesJson), [
    'send_email_mid_unsafe',
  ])
  await assert.rejects(
    service.createGroup({
      ...input,
      idempotencyKey: id('idem'),
      jobs: [
        { dependsOn: ['b'], key: 'a', objective: 'A' },
        { dependsOn: ['a'], key: 'b', objective: 'B' },
      ],
    }),
    (error) => error.code === 'subagent_dependency_cycle',
  )

  for (const run of group.runs) {
    await service.transitionRun(run.id, RUN_STATUS.RUNNING)
    await service.transitionRun(run.id, RUN_STATUS.RESULT_READY, {
      resultJson: JSON.stringify({ summary: run.jobKey }),
      resultText: run.jobKey,
    })
  }
  assert.equal(
    (await service.getGroup(group.id)).status,
    GROUP_STATUS.COMPLETED,
  )
  assert.equal((await service.getGroup(group.id)).resumeParent, true)
  await assert.rejects(
    service.transitionRun(group.runs[0].id, RUN_STATUS.RUNNING),
    (error) => error.code === 'invalid_subagent_run_transition',
  )
  const continued = await service.createGroup({
    ...input,
    idempotencyKey: id('idem'),
    jobs: [
      {
        key: 'deep-next',
        objective: 'Continue deep research',
        sessionPolicy: 'persistent',
        subagentKey: 'deep-research',
        tools: ['read'],
      },
    ],
  })
  assert.equal(continued.runs[0].sessionId, group.runs[1].sessionId)
  await service.transitionRun(continued.runs[0].id, RUN_STATUS.RUNNING)
  await service.transitionRun(continued.runs[0].id, RUN_STATUS.RESULT_READY, {
    resultText: 'first draft',
  })
  const revision = await service.continueRun(continued.runs[0].id, {
    instruction: 'Add sources',
  })
  assert.equal(revision.attempt, 2)
  assert.equal(revision.revisionOfRunId, continued.runs[0].id)
  assert.equal(revision.sessionId, continued.runs[0].sessionId)
  assert.equal(revision.status, RUN_STATUS.QUEUED)
  assert.equal(
    JSON.parse(revision.inputJson).continuationInstruction,
    'Add sources',
  )
  assert.equal(
    (await service.getGroup(continued.id)).status,
    GROUP_STATUS.DISPATCHED,
  )
})

test('dispatcher executes dependency DAG asynchronously and persists results for explicit tool reads', async (t) => {
  const prisma = await prismaManager.initialize()
  const agentId = id('agent')
  const parentSessionId = id('session')
  await prisma.agent.create({ data: { id: agentId, name: 'Dispatcher Test' } })
  await prisma.session.create({
    data: { agentId, id: parentSessionId, kind: 'conversation', title: 'Main' },
  })
  t.after(async () => {
    await prisma.agent.deleteMany({ where: { id: agentId } })
  })

  const runService = new SubAgentRunService({ prisma })
  const calls = []
  let releaseFirst
  const firstGate = new Promise((resolve) => {
    releaseFirst = resolve
  })
  const executor = {
    abort: async () => true,
    execute: async (run) => {
      calls.push(run.jobKey)
      if (run.jobKey === 'first') await firstGate
      return {
        resultJson: { summary: `${run.jobKey} done` },
        resultText: `${run.jobKey} done`,
      }
    },
  }
  const wakes = []
  const wakeAttempts = []
  let parentWakeAttempts = 0
  const dispatcher = new SubAgentDispatcher({
    executor,
    runService,
    parentWakeRetryDelays: [0, 0],
    sessionTurnService: {
      runTurn: async (request) => {
        parentWakeAttempts += 1
        wakeAttempts.push(request)
        if (parentWakeAttempts === 1) {
          throw new Error('transient parent session failure')
        }
        wakes.push(request)
        return { deliveryStatus: 'not_requested' }
      },
    },
  })
  const group = await runService.createGroup({
    agentId,
    allowedToolNames: ['read_mid_test'],
    jobs: [
      { key: 'first', objective: 'First', tools: ['read'] },
      {
        dependsOn: ['first'],
        key: 'second',
        objective: 'Second',
        tools: ['read'],
      },
    ],
    parentSessionId,
  })

  assert.equal(dispatcher.startGroup(group.id), true)
  assert.equal(dispatcher.startGroup(group.id), false)
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(calls, ['first'])
  assert.equal(
    (await runService.getGroup(group.id)).runs[1].status,
    RUN_STATUS.QUEUED,
  )

  releaseFirst()
  await dispatcher.waitForGroup(group.id)
  assert.deepEqual(calls, ['first', 'second'])
  const completed = await runService.getGroup(group.id)
  assert.equal(completed.status, GROUP_STATUS.COMPLETED)
  assert.ok(
    completed.runs.every((run) => run.status === RUN_STATUS.RESULT_READY),
  )
  const firstResult = await runService.getRun(completed.runs[0].id)
  assert.equal(firstResult.resultText, 'first done')
  assert.deepEqual(JSON.parse(firstResult.resultJson), {
    summary: 'first done',
  })
  assert.equal(wakes.length, 1)
  assert.equal(parentWakeAttempts, 2)
  assert.notEqual(wakeAttempts[0].messageId, wakeAttempts[1].messageId)
  assert.match(wakeAttempts[1].messageId, /_retry_1$/)
  assert.equal(wakes[0].agentId, agentId)
  assert.equal(wakes[0].sessionId, parentSessionId)
  assert.equal(wakes[0].isWake, true)
  assert.equal(wakes[0].source, 'subagent')
  assert.match(wakes[0].text, new RegExp(group.id))
  assert.match(wakes[0].text, /status|read_result/)
  assert.doesNotMatch(wakes[0].text, /first done/)
  assert.equal(
    await prisma.sessionInboxEvent.count({ where: { sessionId: parentSessionId } }),
    0,
  )

  // Redispatching an already completed revision must not wake the parent a
  // second time. A continuation creates a new revision and is woken separately.
  assert.equal(dispatcher.startGroup(group.id), true)
  await dispatcher.waitForGroup(group.id)
  assert.equal(wakes.length, 1)

  const continuation = await runService.continueRun(completed.runs[0].id, {
    instruction: 'Check one more source',
  })
  const revision = await runService.getGroup(group.id)
  assert.equal(revision.revision > completed.revision, true)
  assert.equal(dispatcher.startGroup(group.id), true)
  await dispatcher.waitForGroup(group.id)
  assert.equal(wakes.length, 2)
  assert.notEqual(wakes[0].messageId, wakes[1].messageId)
  assert.match(wakes[1].text, new RegExp(continuation.id))
})

test('running SubAgent Sessions are visible but cannot become ordinary Channel chat targets', async () => {
  const routing = new ChannelAgentRoutingService({
    conversationService: {},
    routeResolver: {},
  })
  routing._snapshot = async () => ({
    targets: [
      {
        agentId: 'agent-1',
        id: 'session-child',
        name: 'Researcher',
        runStatus: 'running',
        sessionId: 'session-child',
        switchable: false,
        type: 'subagent',
      },
    ],
  })
  await assert.rejects(
    routing.use({}, 'session-child'),
    (error) => error.code === 'subagent_session_busy',
  )
})
