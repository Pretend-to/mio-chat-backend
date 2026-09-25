import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

import { AgentService } from '../../lib/agents/AgentService.js'
import SubAgentRunService from '../../lib/subagents/SubAgentRunService.js'
import SubAgentDispatcher from '../../lib/subagents/SubAgentDispatcher.js'
import { GROUP_STATUS, RUN_STATUS } from '../../lib/subagents/StateMachine.js'
import { ChannelAgentRoutingService } from '../../channels/bindings/ChannelAgentRoutingService.js'

const id = (prefix) => `${prefix}_${crypto.randomUUID()}`

async function fixture(t) {
  const databasePath = `/tmp/mio-subagent-runs-${process.pid}-${crypto.randomUUID()}.db`
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

test('SubAgent Phase 1 persistence, ownership, idempotency and state machine', async (t) => {
  const prisma = await fixture(t)
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
      },
      {
        dependsOn: ['rank'],
        key: 'deep',
        objective: 'Deep research',
        role: 'Deep Researcher',
        sessionPolicy: 'persistent',
        subagentKey: 'deep-research',
      },
    ],
    parentSessionId,
  }
  const group = await service.createGroup(input)
  assert.equal(group.status, GROUP_STATUS.DISPATCHED)
  assert.equal(group.runs.length, 2)
  assert.equal(group.runs[1].dependencies.length, 1)
  assert.deepEqual(JSON.parse(group.runs[0].toolNamesJson), [
    'web_search',
    'read',
  ])
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

  // listGroups should deduplicate runs by sessionId and only keep the latest
  const groups = await service.listGroups({
    agentId: continued.agentId,
    parentSessionId: continued.parentSessionId,
  })
  const targetGroup = groups.find((g) => g.id === continued.id)
  assert.equal(targetGroup.runs.length, 1)
  assert.equal(targetGroup.runs[0].id, revision.id)
  assert.equal(targetGroup.runs[0].sessionId, continued.runs[0].sessionId)

  // continueRun should allow continuing a stopped/cancelled run
  await service.transitionRun(revision.id, RUN_STATUS.CANCELLED, {
    cancelReason: 'stopped_by_user',
  })
  const thirdRevision = await service.continueRun(revision.id, {
    instruction: 'Resume after stop',
  })
  assert.equal(thirdRevision.attempt, 3)
  assert.equal(thirdRevision.sessionId, continued.runs[0].sessionId)
  assert.equal(thirdRevision.status, RUN_STATUS.QUEUED)
})

test('dispatcher executes dependency DAG asynchronously and persists results for explicit tool reads', async (t) => {
  const prisma = await fixture(t)
  const agentId = id('agent')
  const parentSessionId = id('session')
  await prisma.agent.create({ data: { id: agentId, name: 'Dispatcher Test' } })
  await prisma.session.create({
    data: { agentId, id: parentSessionId, kind: 'conversation', title: 'Main' },
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
  const wakeAttempts = []
  let parentWakeAttempts = 0
  const dispatcher = new SubAgentDispatcher({
    executor,
    runService,
    parentWakeRetryDelays: [0, 0],
    dispatcher: {
      submitWake: async (request) => {
        parentWakeAttempts += 1
        wakeAttempts.push(request)
        if (parentWakeAttempts === 1) {
          throw new Error('transient parent session failure')
        }
        return {
          eventId: `event-${parentWakeAttempts}`,
          status: 'accepted',
          workItemId: `work-${parentWakeAttempts}`,
        }
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
  assert.equal(wakeAttempts.length, 2)
  assert.equal(parentWakeAttempts, 2)
  assert.equal(wakeAttempts[0].idempotencyKey, wakeAttempts[1].idempotencyKey)
  assert.equal(wakeAttempts[0].agentId, agentId)
  assert.equal(wakeAttempts[0].sessionId, parentSessionId)
  assert.equal(wakeAttempts[0].kind, 'system')
  assert.equal(wakeAttempts[0].wakeKind, 'subagent_done')
  assert.equal(
    wakeAttempts[0].originRef,
    `subagent_group:${group.id}:revision:${completed.revision}`,
  )
  assert.match(wakeAttempts[0].instruction, new RegExp(group.id))
  assert.match(wakeAttempts[0].instruction, /status|read_result/)
  assert.doesNotMatch(wakeAttempts[0].instruction, /first done/)
  assert.equal(
    await prisma.sessionInboxEvent.count({
      where: { sessionId: parentSessionId },
    }),
    0,
  )

  // Redispatching an already completed revision must not wake the parent a
  // second time. A continuation creates a new revision and is woken separately.
  assert.equal(dispatcher.startGroup(group.id), true)
  await dispatcher.waitForGroup(group.id)
  assert.equal(wakeAttempts.length, 2)

  const continuation = await runService.continueRun(completed.runs[0].id, {
    instruction: 'Check one more source',
  })
  const revision = await runService.getGroup(group.id)
  assert.equal(revision.revision > completed.revision, true)
  assert.equal(dispatcher.startGroup(group.id), true)
  await dispatcher.waitForGroup(group.id)
  assert.equal(wakeAttempts.length, 3)
  assert.notEqual(
    wakeAttempts[0].idempotencyKey,
    wakeAttempts[2].idempotencyKey,
  )
  assert.match(wakeAttempts[2].instruction, new RegExp(continuation.id))
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

test('recoverStaleRuns recovers in-flight runs to interrupted on restart, supports continue and cancel (Issue #38)', async (t) => {
  const prisma = await fixture(t)
  const agentId = id('agent')
  const parentSessionId = id('session')
  await prisma.agent.create({ data: { id: agentId, name: 'Stale Run Test' } })
  await prisma.session.create({
    data: { agentId, id: parentSessionId, kind: 'conversation', title: 'Main' },
  })
  const runService = new SubAgentRunService({ prisma })
  const dispatcher = new SubAgentDispatcher({
    executor: { abort: async () => true },
    runService,
  })

  // Create a group with two runs
  const group = await runService.createGroup({
    agentId,
    allowedToolNames: ['web_search'],
    idempotencyKey: id('idem_stale'),
    jobs: [
      { key: 'job-1', objective: 'Objective 1' },
      { key: 'job-2', objective: 'Objective 2' },
    ],
    parentSessionId,
  })

  const [run1, run2] = group.runs
  // Simulate run1 transitioning to RUNNING and run2 transitioning to WAITING_TOOL
  await runService.transitionRun(run1.id, RUN_STATUS.RUNNING)
  await runService.transitionRun(run2.id, RUN_STATUS.RUNNING)
  await runService.transitionRun(run2.id, RUN_STATUS.WAITING_TOOL)

  const inFlight1 = await runService.getRun(run1.id)
  const inFlight2 = await runService.getRun(run2.id)
  assert.equal(inFlight1.status, RUN_STATUS.RUNNING)
  assert.equal(inFlight1.finishedAt, null)
  assert.equal(inFlight2.status, RUN_STATUS.WAITING_TOOL)
  assert.equal(inFlight2.finishedAt, null)

  // Simulate process restart: call recoverStaleRuns()
  const recovered = await runService.recoverStaleRuns({
    reason: 'process_restarted',
  })
  assert.equal(recovered.length, 2)

  const updatedRun1 = await runService.getRun(run1.id)
  const updatedRun2 = await runService.getRun(run2.id)
  assert.equal(updatedRun1.status, RUN_STATUS.INTERRUPTED)
  assert.notEqual(updatedRun1.finishedAt, null)
  assert.equal(updatedRun1.cancelReason, 'process_restarted')
  assert.equal(JSON.parse(updatedRun1.errorJson).code, 'run_interrupted')

  assert.equal(updatedRun2.status, RUN_STATUS.INTERRUPTED)
  assert.notEqual(updatedRun2.finishedAt, null)
  assert.equal(updatedRun2.cancelReason, 'process_restarted')

  // Recalculated group status should be FAILED since both runs are interrupted
  const updatedGroup = await runService.getGroup(group.id)
  assert.equal(updatedGroup.status, GROUP_STATUS.FAILED)

  // Test 1: User cancels an interrupted run via dispatcher.abortRun
  const cancelledRun2 = await dispatcher.abortRun(
    run2.id,
    'User stopped interrupted run',
  )
  assert.equal(cancelledRun2.status, RUN_STATUS.CANCELLED)
  assert.equal(cancelledRun2.cancelReason, 'User stopped interrupted run')

  // Test 2: User continues an interrupted run via runService.continueRun
  const continuedRun1 = await runService.continueRun(run1.id, {
    instruction: 'Resume after server restart',
  })
  assert.equal(continuedRun1.status, RUN_STATUS.QUEUED)
  assert.equal(continuedRun1.attempt, 2)
  assert.equal(continuedRun1.revisionOfRunId, run1.id)

  const reloadedGroup = await runService.getGroup(group.id)
  assert.equal(reloadedGroup.status, GROUP_STATUS.DISPATCHED)
  assert.equal(reloadedGroup.finishedAt, null)

  // Test 3: Aborting an orphaned run where activeRuns doesn't have it
  // Create another run in RUNNING state
  const singleGroup = await runService.createGroup({
    agentId,
    allowedToolNames: ['web_search'],
    idempotencyKey: id('idem_orphan'),
    jobs: [{ key: 'orphan-job', objective: 'Orphan' }],
    parentSessionId,
  })
  const orphanRun = singleGroup.runs[0]
  await runService.transitionRun(orphanRun.id, RUN_STATUS.RUNNING)

  // Dispatcher activeRuns does NOT have orphanRun (simulating restart before recoverStaleRuns)
  assert.equal(dispatcher.activeRuns.has(orphanRun.id), false)
  const abortedOrphan = await dispatcher.abortRun(orphanRun.id, 'stop orphan')
  assert.equal(abortedOrphan.status, RUN_STATUS.CANCELLED)
  assert.equal(abortedOrphan.cancelReason, 'stop orphan')
})

test('continue while a run is in flight is a middle state: no completion wake for the interrupted run', async (t) => {
  const prisma = await fixture(t)
  const agentId = id('agent')
  const parentSessionId = id('session')
  await prisma.agent.create({
    data: { id: agentId, name: 'Continue Wake Test' },
  })
  await prisma.session.create({
    data: { agentId, id: parentSessionId, kind: 'conversation', title: 'Main' },
  })
  const runService = new SubAgentRunService({ prisma })

  let releaseFirstRun
  const firstRunGate = new Promise((resolve) => {
    releaseFirstRun = resolve
  })
  let firstRunStarted
  const started = new Promise((resolve) => {
    firstRunStarted = resolve
  })
  const executor = {
    abort: async () => {
      // `subagent action=continue` interrupts the live turn, then supersedes it.
      releaseFirstRun()
      return true
    },
    execute: async (run) => {
      if (run.attempt === 1) {
        firstRunStarted()
        await firstRunGate
        return {
          resultJson: { summary: 'interrupted' },
          resultText: 'interrupted',
        }
      }
      return {
        resultJson: { summary: 'revised' },
        resultText: 'revised answer',
      }
    },
  }
  const wakeRequests = []
  const dispatcher = new SubAgentDispatcher({
    executor,
    runService,
    dispatcher: {
      submitWake: async (request) => {
        wakeRequests.push(request)
        return { eventId: `event-${wakeRequests.length}`, status: 'accepted' }
      },
    },
  })
  const group = await runService.createGroup({
    agentId,
    allowedToolNames: ['read_mid_test'],
    jobs: [{ key: 'work', objective: 'Do the work' }],
    parentSessionId,
  })

  assert.equal(dispatcher.startGroup(group.id), true)
  await started

  // Exactly what the subagent tool does for action=continue.
  await dispatcher.abortRun(group.runs[0].id, 'interrupted_for_continuation')
  await dispatcher.waitForGroup(group.id)

  // The interrupted run is not a group outcome while its replacement is
  // pending; a terminal status here wakes the parent and invites a duplicate
  // worker for the same resource.
  assert.deepEqual(wakeRequests, [])
  assert.equal(
    (await runService.getGroup(group.id)).status,
    GROUP_STATUS.WAITING_CHILDREN,
  )
  const revision = await runService.continueRun(group.runs[0].id, {
    instruction: 'Redo the work',
  })
  assert.equal(dispatcher.startGroup(group.id), true)
  await dispatcher.waitForGroup(group.id)

  const finished = await runService.getGroup(group.id)
  assert.equal(finished.status, GROUP_STATUS.COMPLETED)
  assert.equal(wakeRequests.length, 1)
  assert.match(wakeRequests[0].instruction, /status: completed/)
  assert.match(wakeRequests[0].instruction, /activeRuns: 0/)
  assert.match(wakeRequests[0].instruction, new RegExp(revision.id))
  assert.doesNotMatch(wakeRequests[0].instruction, /status: cancelled/)
})
