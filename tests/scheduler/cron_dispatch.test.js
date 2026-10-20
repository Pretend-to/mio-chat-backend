import test from 'node:test'
import assert from 'node:assert/strict'
import '../../utils/logger.js'
import { TaskScheduler } from '../../lib/cron.js'

test('manual cron run submits a scoped wake and returns without completing it', async () => {
  const creates = []
  const completions = []
  const submissions = []
  const running = []
  const workItemLinks = []
  let statusListener
  const task = {
    agentId: 'agent-cron',
    deliveryBindingId: null,
    deliveryMode: 'session_only',
    id: 'morning',
    name: 'Morning',
    sessionId: 'session-cron',
    triggerPrompt: 'Check the daily agenda',
  }
  const scheduler = new TaskScheduler({
    taskService: {
      findById: async () => task,
      updateLastRun: async () => {},
    },
    taskExecutionService: {
      complete: async (...args) => completions.push(args),
      create: async (input) => {
        creates.push(input)
        return { id: 41 }
      },
      fail: async () => {},
      getNextRound: async () => 3,
      linkWorkItem: async (...args) => workItemLinks.push(args),
      markRunning: async (id) => running.push(id),
      updateStatus: async () => {},
    },
    dispatcher: {
      onWorkItemStatus: (listener) => {
        statusListener = listener
        return () => {}
      },
      submitWake: async (input) => {
        submissions.push(input)
        return {
          eventId: 'event-cron',
          status: 'accepted',
          workItemId: 'work-cron',
        }
      },
    },
  })

  const receipt = await scheduler.runTaskById('morning', {
    agentId: 'agent-cron',
    principal: { id: 'principal-user', role: 'user' },
  })

  assert.equal(receipt.status, 'accepted')
  assert.equal(receipt.executionId, 41)
  assert.equal(receipt.eventId, 'event-cron')
  assert.equal(creates[0].status, 'queued')
  assert.equal(submissions.length, 1)
  assert.equal(submissions[0].agentId, 'agent-cron')
  assert.equal(submissions[0].sessionId, 'session-cron')
  assert.equal(submissions[0].kind, 'scheduler')
  assert.equal(submissions[0].wakeKind, 'cron_manual')
  assert.equal(submissions[0].originRef, 'task_execution:41')
  assert.equal(submissions[0].idempotencyKey, 'cron:task_execution:41')
  assert.equal(submissions[0].principal.id, 'principal-user')
  assert.deepEqual(workItemLinks, [[41, 'work-cron']])
  assert.equal(completions.length, 0)
  await statusListener({
    status: 'absorbed',
    workItem: { originRef: 'task_execution:41' },
  })
  await statusListener({
    status: 'completed',
    workItem: { originRef: 'task_execution:41' },
  })
  assert.deepEqual(running, [41])
  assert.equal(completions.length, 1)
  assert.equal(completions[0][0], 41)
  assert.equal(completions[0][1], undefined)
})

test('manual cron run rejects tasks owned by another agent', async () => {
  let submitted = false
  const scheduler = new TaskScheduler({
    taskService: {
      findById: async () => ({ agentId: 'owner-agent', id: 'private-task' }),
    },
    taskExecutionService: {},
    dispatcher: {
      submitWake: async () => {
        submitted = true
      },
    },
  })

  await assert.rejects(
    scheduler.runTaskById('private-task', { agentId: 'other-agent' }),
    /不属于当前 Agent/,
  )
  assert.equal(submitted, false)
})

test('startup reconciliation syncs persisted terminal work-item status', async () => {
  const completed = []
  const scheduler = new TaskScheduler({
    taskService: {},
    taskExecutionService: {
      complete: async (id) => completed.push(id),
      findPendingWorkItems: async () => [
        { id: 42, sessionWorkItemId: 'work-42' },
      ],
      fail: async () => {},
      markRunning: async () => {},
      updateStatus: async () => {},
    },
    dispatcher: {
      getWorkItem: async () => ({
        originRef: 'task_execution:42',
        status: 'completed',
      }),
      onWorkItemStatus: () => () => {},
    },
  })

  const reconciled = await scheduler._reconcileTaskExecutionStatuses(
    scheduler.dispatcher,
  )

  assert.equal(reconciled, 1)
  assert.deepEqual(completed, [42])
})
