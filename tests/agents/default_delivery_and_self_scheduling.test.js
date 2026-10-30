import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'
import { prepareIsolatedDatabase } from '../../scripts/utils/testIsolation.js'
import { AgentService } from '../../lib/agents/AgentService.js'
import { getDefaultDeliveryBinding } from '../../lib/chat/delivery/DefaultDelivery.js'
import {
  listDeliveryChannels,
  resolveDeliveryBinding,
} from '../../lib/chat/delivery/DeliveryBindingService.js'
import { SessionWorkCoordinator } from '../../lib/chat/sessions/SessionWorkCoordinator.js'
import SessionTurnService from '../../lib/chat/sessions/SessionTurnService.js'
import { TaskService } from '../../lib/database/services/TaskService.js'
import { TaskScheduler } from '../../lib/cron.js'
import ManageScheduledTasks from '../../lib/plugins/ai-plugin/tools/cron.js'
import AgentSoulTool from '../../lib/plugins/agent-manager-plugin/tools/agent_soul.js'
import AgentDeliveryTool from '../../lib/plugins/agent-manager-plugin/tools/agent_delivery.js'
import { evaluateToolAccess } from '../../lib/chat/llm/toolPolicy.js'

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mio-default-delivery-'))
  const databasePath = path.join(root, 'app.db')
  await prepareIsolatedDatabase(databasePath, {
    adminCode: 'test-admin',
    userCode: 'test-user',
  })
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${databasePath}` }),
  })
  t.after(async () => {
    await prisma.$disconnect()
    await fs.rm(root, { recursive: true, force: true })
  })
  await prisma.channel.createMany({
    data: [
      {
        id: 'first',
        name: '最早渠道',
        type: 'wechat',
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 'second',
        name: '稍后渠道',
        type: 'feishu',
        createdAt: new Date('2026-02-01'),
      },
    ],
  })
  const service = new AgentService({ prisma })
  const created = await service.createWithInitialSession({
    name: 'Autonomous',
    channelIds: ['first', 'second'],
  })
  const agentId = created.agent.id
  const bindings = await prisma.agentChannelBinding.findMany({
    where: { agentId },
  })
  for (const binding of bindings) {
    await prisma.agentChannelBinding.update({
      where: { id: binding.id },
      data: {
        createdAt: new Date(
          binding.channelId === 'first' ? '2026-03-01' : '2026-04-01',
        ),
      },
    })
  }
  return { prisma, service, agentId, sessionId: created.initialSession.id }
}

test('Agent defaults select the earliest bound external channel, including legacy null defaults', async (t) => {
  const { prisma, service, agentId, sessionId } = await fixture(t)
  assert.equal((await service.get(agentId)).defaultDeliveryChannelId, 'first')
  await prisma.agentMeta.deleteMany({
    where: { agentId, key: 'default_delivery_policy' },
  })
  await prisma.agent.update({
    where: { id: agentId },
    data: { defaultDeliveryBindingId: null },
  })
  const defaults = await getDefaultDeliveryBinding(agentId, { prisma })
  assert.equal(defaults.channelId, 'first')
  assert.equal((await service.get(agentId)).defaultDeliveryChannelId, 'first')
  const resolved = await resolveDeliveryBinding({ agentId, prisma })
  assert.equal(resolved.binding.id, defaults.id)
  assert.equal(
    await new SessionWorkCoordinator({ prisma }).getDefaultDeliveryBindingId(
      agentId,
    ),
    defaults.id,
  )
  const target = await new SessionTurnService({ prisma })._target({
    agentId,
    sessionId,
  })
  assert.equal(target.binding.id, defaults.id)
  // Offline changes do not reroute the next wake to another channel.
  await prisma.channel.update({
    where: { id: 'first' },
    data: { status: 'offline' },
  })
  assert.equal(
    (await getDefaultDeliveryBinding(agentId, { prisma })).channelId,
    'first',
  )
  await prisma.agentChannelBinding.update({
    where: { id: defaults.id },
    data: { outboundEnabled: false },
  })
  assert.equal(
    (await getDefaultDeliveryBinding(agentId, { prisma })).channelId,
    'second',
  )
})

test('delivery set, clear, reset and unbinding have persistent predictable defaults', async (t) => {
  const { prisma, service, agentId } = await fixture(t)
  const tool = new AgentDeliveryTool({ service })
  const call = (params) => tool.execute({ agentId, params })
  assert.equal(
    (await call({ action: 'set', channelId: 'second' })).delivery.channelId,
    'second',
  )
  await service.bindChannel(agentId, 'first')
  assert.equal((await service.get(agentId)).defaultDeliveryChannelId, 'second')
  await call({ action: 'clear' })
  assert.equal((await service.get(agentId)).defaultDeliveryChannelId, null)
  assert.equal(await getDefaultDeliveryBinding(agentId, { prisma }), null)
  await service.bindChannel(agentId, 'second')
  assert.equal((await service.get(agentId)).defaultDeliveryChannelId, null)
  assert.equal((await call({ action: 'reset' })).delivery.channelId, 'first')
  await service.unbindChannel(agentId, 'first')
  assert.equal((await service.get(agentId)).defaultDeliveryChannelId, 'second')
  await service.unbindChannel(agentId, 'second')
  assert.equal((await service.get(agentId)).defaultDeliveryChannelId, null)
  await assert.rejects(
    () => call({ action: 'set', channelId: 'web-default' }),
    /non-Web/,
  )
})

test('Soul operations use the current Agent and persist before reporting next-turn effect', async (t) => {
  const { service, agentId } = await fixture(t)
  const tool = new AgentSoulTool({ service })
  const call = (params) => tool.execute({ agentId, params })
  await call({ action: 'replace', soul: 'Careful' })
  const appended = await call({ action: 'append', soul: 'Concise' })
  assert.equal(appended.soul, 'Careful\n\nConcise')
  assert.equal(appended.effectiveFrom, 'next_turn')
  assert.equal((await call({ action: 'read' })).soul, 'Careful\n\nConcise')
  assert.equal((await call({ action: 'clear' })).soul, '')
})

test('a background Agent can schedule its next work time with the default channel or with no external channel', async (t) => {
  const { prisma, service, agentId, sessionId } = await fixture(t)
  // Reproduce an existing autonomous Agent whose persisted default was empty.
  await prisma.agent.update({
    where: { id: agentId },
    data: { defaultDeliveryBindingId: null },
  })
  const tasks = new TaskService()
  tasks.prisma = prisma
  const scheduled = []
  const wakes = []
  const dispatcher = {
    onWorkItemStatus: () => () => {},
    submitWake: async (input) => {
      wakes.push(input)
      return { workItemId: `work-${wakes.length}`, status: 'accepted' }
    },
  }
  const scheduler = new TaskScheduler({
    taskService: tasks,
    dispatcher,
    taskExecutionService: {
      getNextRound: async () => 1,
      create: async () => ({ id: 'execution-test' }),
      linkWorkItem: async () => {},
    },
  })
  scheduler._scheduleTask = (task) => scheduled.push(task)
  t.after(() => scheduler.removeWorkItemStatusListener?.())
  const tool = new ManageScheduledTasks({
    taskScheduler: scheduler,
    taskService: tasks,
    deliveryService: {
      listDeliveryChannels: (id) => listDeliveryChannels(id, { prisma }),
      resolveDeliveryBinding: (input) =>
        resolveDeliveryBinding({ ...input, prisma }),
    },
  })
  const event = {
    agentId,
    sessionId,
    source: 'system',
    isWake: true,
    principal: { id: 'system:scheduled_task:current', isAdmin: true },
    bindingId: null,
  }
  assert.equal(evaluateToolAccess(tool, event).allowed, true)
  const result = await tool.execute({
    ...event,
    params: {
      action: 'add',
      taskId: 'next-work',
      cron: '+15m',
      triggerPrompt: '继续完成后续工作',
    },
  })
  assert.equal(result.success, true)
  assert.equal(result.delivery.channelId, 'first')
  assert.equal(result.task.sessionId, sessionId)
  assert.equal(result.task.agentId, agentId)
  assert.equal(result.task.cron, 'once')
  assert.ok(result.task.runAt.getTime() > Date.now())
  assert.equal(scheduled.length, 1)
  await scheduler._executeTask(result.task)
  assert.equal(wakes[0].deliveryBindingId, result.task.deliveryBindingId)
  assert.equal(wakes[0].principal.isAdmin, true)
  assert.equal(wakes[0].sessionId, sessionId)
  // Web-only Agents must still be able to schedule another autonomous turn.
  const webOnly = await service.createWithInitialSession({ name: 'Web only' })
  const silent = await tool.execute({
    ...event,
    agentId: webOnly.agent.id,
    sessionId: webOnly.initialSession.id,
    params: {
      action: 'add',
      taskId: 'silent-next-work',
      cron: '+20m',
      triggerPrompt: '继续自己的工作',
    },
  })
  assert.equal(silent.success, true)
  assert.equal(silent.delivery.channelId, null)
  assert.equal(silent.task.deliveryBindingId, null)
  const noDeliveryTarget = await new SessionTurnService({ prisma })._target({
    agentId: webOnly.agent.id,
    sessionId: webOnly.initialSession.id,
  })
  assert.equal(noDeliveryTarget.binding, null)
  assert.equal(noDeliveryTarget.bindingRequested, false)
})

test('finishing an old autonomous occurrence cannot overwrite the next schedule using the same task ID', async (t) => {
  const { prisma, agentId, sessionId } = await fixture(t)
  const tasks = new TaskService()
  tasks.prisma = prisma
  const original = await tasks.upsert({
    id: 'self-rearm',
    agentId,
    sessionId,
    cron: 'once',
    runAt: new Date('2026-01-01'),
    status: 'active',
  })
  let shouldRearm = true
  let scheduler
  const dispatcher = {
    onWorkItemStatus: () => () => {},
    submitWake: async () => {
      if (shouldRearm) {
        await scheduler.addAgentTask({
          id: original.id,
          agentId,
          sessionId,
          cron: '+30m',
          status: 'active',
        })
      }
      return { workItemId: 'rearmed-work', status: 'accepted' }
    },
  }
  scheduler = new TaskScheduler({
    taskService: tasks,
    dispatcher,
    taskExecutionService: {
      getNextRound: async () => 1,
      create: async () => ({ id: '1' }),
      linkWorkItem: async () => {},
    },
  })
  const planned = []
  const removed = []
  scheduler._scheduleTask = (task) => planned.push(task)
  scheduler.removeTaskFromMemory = (id) => removed.push(id)
  t.after(() => scheduler.removeWorkItemStatusListener?.())
  await scheduler._runOnce(original)
  const next = await tasks.findById(original.id)
  assert.equal(next.status, 'active')
  assert.ok(next.runAt.getTime() > Date.now())
  assert.equal(planned.length, 1)
  assert.equal(removed.length, 0)
  shouldRearm = false
  await scheduler._runOnce(next)
  assert.equal((await tasks.findById(next.id)).status, 'finished')
  assert.deepEqual(removed, [next.id])
})
