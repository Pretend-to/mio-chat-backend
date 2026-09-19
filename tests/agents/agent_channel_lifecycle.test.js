import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { AgentService, WEB_CHANNEL_ID } from '../../lib/agents/AgentService.js'
import { ChannelConversationService } from '../../channels/bindings/ChannelConversationService.js'
import { ChannelAgentRoutingService } from '../../channels/bindings/ChannelAgentRoutingService.js'
import { normalizeChannelEnvelope } from '../../channels/bindings/ChannelEnvelope.js'
import { ChannelRouteResolver } from '../../channels/bindings/ChannelRouteResolver.js'
import { normalizeChannelCreatePayload } from '../../channels/ChannelAdapterRegistry.js'
import { ChannelRuntime } from '../../channels/ChannelRuntime.js'
import { ChannelStore } from '../../channels/ChannelStore.js'
import { TaskService } from '../../lib/database/services/TaskService.js'
import { initChannelController } from '../../lib/server/http/controllers/channelController.js'
import { handleAgentMessage } from '../../lib/server/socket.io/controllers/agent.js'

async function fixture(t) {
  const databasePath = `/tmp/mio-agent-lifecycle-${process.pid}-${Date.now()}.db`
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

function inboundEnvelope({
  channelId = 'wechat',
  conversationId = 'user-1',
  messageId = 'message-1',
  type = 'private',
  userId = 'user-1',
} = {}) {
  return normalizeChannelEnvelope({
    actor: { displayName: userId, externalUserId: userId },
    content: { text: 'hello' },
    conversation: { externalConversationId: conversationId, type },
    message: { externalMessageId: messageId, receivedAt: 1_780_000_000_123 },
    source: { adapterId: 'weixin-ilink', channelId, channelName: '微信' },
  })
}

test('AgentService notifies runtime compatibility listeners after model updates', async () => {
  let row = {
    channelBindings: [],
    id: 'agent-a',
    model: 'old-model',
    name: 'A',
    provider: 'old-provider',
    status: 'active',
  }
  const observed = []
  const service = new AgentService({
    prisma: {
      $transaction: async (callback) =>
        callback({
          agent: {
            update: async ({ data }) => {
              row = { ...row, ...data }
              return row
            },
          },
        }),
      agent: { findUnique: async () => ({ ...row }) },
    },
  })
  service.onUpdated((agent) => observed.push(agent))

  const updated = await service.update('agent-a', {
    model: 'fresh-model',
    provider: 'fresh-provider',
  })

  assert.equal(updated.model, 'fresh-model')
  assert.equal(observed.length, 1)
  assert.equal(observed[0].provider, 'fresh-provider')
})

test('create Agent atomically creates initial Session and Web binding without client identity fields', async (t) => {
  const prisma = await fixture(t)
  await prisma.channel.create({
    data: { id: 'wechat', name: '微信', type: 'weixin-ilink' },
  })
  const service = new AgentService({ prisma })
  const result = await service.createWithInitialSession({
    name: '助理',
    channelIds: ['wechat'],
  })
  assert.equal(result.initialSession.agentId, result.agent.id)
  assert.deepEqual(
    new Set(result.bindings.map((item) => item.channelId)),
    new Set([WEB_CHANNEL_ID, 'wechat']),
  )
  assert.equal(result.agent.defaultDeliveryBindingId, null)
  assert.deepEqual(
    result.agent.deliveryChannels.map((item) => item.channelId),
    ['wechat'],
  )
  const bound = await service.bindChannel(result.agent.id, 'wechat')
  assert.equal(bound.defaultDeliveryBindingId, bound.id)
  await assert.rejects(
    () => service.createWithInitialSession({ name: 'bad', masterId: 'manual' }),
    /managed by the server/,
  )
})

test('deleting one Agent cascades its records but preserves shared Channel and other Agent', async (t) => {
  const prisma = await fixture(t)
  await prisma.channel.create({
    data: { id: 'wechat', name: '微信', type: 'weixin-ilink' },
  })
  const service = new AgentService({ prisma })
  const first = await service.createWithInitialSession({
    name: 'A',
    channelIds: ['wechat'],
  })
  const second = await service.createWithInitialSession({
    name: 'B',
    channelIds: ['wechat'],
  })
  await new ChannelConversationService({ prisma }).resolve({
    agentId: first.agent.id,
    channelId: 'wechat',
    envelope: inboundEnvelope(),
  })
  await prisma.message.create({
    data: {
      id: 'm1',
      sessionId: first.initialSession.id,
      seq: 1,
      role: 'user',
      content: '[]',
    },
  })
  await service.delete(first.agent.id)
  assert.equal(
    await prisma.agent.findUnique({ where: { id: first.agent.id } }),
    null,
  )
  assert.equal(
    await prisma.message.count({
      where: { sessionId: first.initialSession.id },
    }),
    0,
  )
  assert.equal(
    await prisma.channelConversation.count({
      where: { agentId: first.agent.id },
    }),
    0,
  )
  assert.ok(await prisma.agent.findUnique({ where: { id: second.agent.id } }))
  assert.ok(await prisma.channel.findUnique({ where: { id: 'wechat' } }))
})

test('detaching a deleted Agent keeps its Channel transport alive', async () => {
  let abortCalls = 0
  const stopCalls = []
  const chn = {
    activeJobs: new Map([
      [
        'session-a',
        {
          _abortLlm() {
            abortCalls++
          },
          abort() {
            abortCalls++
          },
        },
      ],
    ]),
    async stop() {
      stopCalls.push('transport')
    },
  }
  const secondaryChannel = {
    async stop() {
      stopCalls.push('secondary')
    },
  }
  const runtime = new ChannelRuntime({
    channelStore: {},
    llm: {},
    routeResolver: {},
  })
  runtime.running.set('wechat', {
    agents: new Map([
      [
        'binding-a',
        {
          binding: { agentId: 'agent-a' },
          chn,
        },
      ],
      [
        'binding-b',
        {
          binding: { agentId: 'agent-b' },
          chn: secondaryChannel,
        },
      ],
    ]),
    channel: { id: 'wechat', type: 'weixin-ilink' },
    chn,
  })

  runtime.detachAgent('agent-a')

  assert.equal(runtime.isRunning('wechat'), true)
  assert.equal(runtime.running.get('wechat').agents.size, 1)
  assert.deepEqual(stopCalls, [])
  assert.equal(abortCalls, 2)

  await runtime.stop('wechat', { persistStatus: false })
  assert.deepEqual(stopCalls.toSorted(), ['secondary', 'transport'])
})

test('route resolver rejects ambiguous multi-Agent Channel and persists explicit routing', async (t) => {
  const prisma = await fixture(t)
  await prisma.channel.create({
    data: { id: 'wechat', name: '微信', type: 'weixin-ilink' },
  })
  const service = new AgentService({ prisma })
  const a = await service.createWithInitialSession({
    name: 'A',
    channelIds: ['wechat'],
  })
  await service.createWithInitialSession({ name: 'B', channelIds: ['wechat'] })
  const resolver = new ChannelRouteResolver({ prisma })
  await assert.rejects(
    () =>
      resolver.resolve({
        channelId: 'wechat',
        externalConversationId: 'user-1',
      }),
    (error) => error.code === 'route_required',
  )
  const route = await resolver.resolve({
    channelId: 'wechat',
    externalConversationId: 'user-1',
    explicitAgentId: a.agent.id,
  })
  assert.equal(route.agentId, a.agent.id)
  assert.equal(Object.hasOwn(route, 'sessionId'), false)
  assert.equal(
    (
      await resolver.resolve({
        channelId: 'wechat',
        externalConversationId: 'user-1',
      })
    ).agentId,
    a.agent.id,
  )
})

test('Channel Agent controls list and switch Agents and visibly identify SubAgents', async (t) => {
  const prisma = await fixture(t)
  await prisma.channel.create({
    data: { id: 'wechat', name: '微信', type: 'weixin-ilink' },
  })
  const agents = new AgentService({ prisma })
  const first = await agents.createWithInitialSession({
    name: '主助理',
    channelIds: ['wechat'],
  })
  const second = await agents.createWithInitialSession({
    name: '写作助理',
    channelIds: ['wechat'],
  })
  const conversations = new ChannelConversationService({ prisma })
  const resolver = new ChannelRouteResolver({ prisma })
  const routing = new ChannelAgentRoutingService({
    conversationService: conversations,
    prisma,
    routeResolver: resolver,
  })
  const envelope = inboundEnvelope()

  assert.equal(await routing.current(envelope), null)
  const selectedFirst = await routing.use(envelope, '主助理')
  const child = await agents.createSession(first.agent.id, {
    kind: 'subagent',
    parentSessionId: selectedFirst.sessionId,
    title: '资料研究员',
  })
  const targets = await routing.list(envelope)
  assert.equal(targets.filter((target) => target.type === 'agent').length, 2)
  const childTarget = targets.find((target) => target.id === child.id)
  assert.equal(childTarget.agentId, first.agent.id)
  assert.equal(childTarget.name, '资料研究员')
  assert.equal(childTarget.type, 'subagent')

  const selectedChild = await routing.use(envelope, child.id.slice(0, 20))
  assert.equal(selectedChild.type, 'subagent')
  assert.equal((await routing.current(envelope)).id, child.id)

  const selectedSecond = await routing.use(envelope, second.agent.id)
  assert.equal(selectedSecond.type, 'agent')
  assert.equal(selectedSecond.agentId, second.agent.id)
  assert.equal((await routing.current(envelope)).agentId, second.agent.id)
  assert.notEqual(selectedSecond.sessionId, second.initialSession.id)
})

test('Channel conversation assigns isolated Sessions per private user and reuses the scoped active Session', async (t) => {
  const prisma = await fixture(t)
  await prisma.channel.create({
    data: { id: 'wechat', name: '微信', type: 'weixin-ilink' },
  })
  const agents = new AgentService({ prisma })
  const created = await agents.createWithInitialSession({
    name: 'A',
    channelIds: ['wechat'],
  })
  const conversations = new ChannelConversationService({ prisma })

  const first = await conversations.resolve({
    agentId: created.agent.id,
    channelId: 'wechat',
    envelope: inboundEnvelope(),
  })
  const repeated = await conversations.resolve({
    agentId: created.agent.id,
    channelId: 'wechat',
    envelope: inboundEnvelope({ messageId: 'message-2' }),
  })
  const other = await conversations.resolve({
    agentId: created.agent.id,
    channelId: 'wechat',
    envelope: inboundEnvelope({
      conversationId: 'user-2',
      messageId: 'message-3',
      userId: 'user-2',
    }),
  })

  assert.notEqual(first.sessionId, created.initialSession.id)
  assert.equal(repeated.sessionId, first.sessionId)
  assert.notEqual(other.sessionId, first.sessionId)
  assert.equal(await prisma.channelConversation.count(), 2)
})

test('concurrent first messages elect one Channel conversation and one Session', async (t) => {
  const prisma = await fixture(t)
  await prisma.channel.create({
    data: { id: 'wechat', name: '微信', type: 'weixin-ilink' },
  })
  const agents = new AgentService({ prisma })
  const created = await agents.createWithInitialSession({
    name: 'A',
    channelIds: ['wechat'],
  })
  const conversations = new ChannelConversationService({ prisma })
  const resolve = (messageId) =>
    conversations.resolve({
      agentId: created.agent.id,
      channelId: 'wechat',
      envelope: inboundEnvelope({ messageId }),
    })

  const [first, second] = await Promise.all([
    resolve('parallel-1'),
    resolve('parallel-2'),
  ])

  assert.equal(first.sessionId, second.sessionId)
  assert.equal(await prisma.channelConversation.count(), 1)
  assert.equal(await prisma.channelSessionLink.count(), 1)
})

test('group actors share a Channel conversation while scoped Session switching stays local', async (t) => {
  const prisma = await fixture(t)
  await prisma.channel.create({
    data: { id: 'wechat', name: '微信', type: 'weixin-ilink' },
  })
  const agents = new AgentService({ prisma })
  const created = await agents.createWithInitialSession({
    name: 'A',
    channelIds: ['wechat'],
  })
  const conversations = new ChannelConversationService({ prisma })
  const first = await conversations.resolve({
    agentId: created.agent.id,
    channelId: 'wechat',
    envelope: inboundEnvelope({
      conversationId: 'group-1',
      type: 'group',
      userId: 'member-a',
    }),
  })
  const second = await conversations.resolve({
    agentId: created.agent.id,
    channelId: 'wechat',
    envelope: inboundEnvelope({
      conversationId: 'group-1',
      messageId: 'message-2',
      type: 'group',
      userId: 'member-b',
    }),
  })
  const scope = conversations.scope(first.conversation.id, created.agent.id)
  const next = await scope.create('新话题')

  assert.equal(second.sessionId, first.sessionId)
  assert.equal(await prisma.channelConversationMember.count(), 2)
  assert.equal(await scope.getActive(), next.id)
  assert.equal((await scope.list()).length, 2)
  await scope.activate(first.sessionId)
  assert.equal(await scope.getActive(), first.sessionId)
  const deleted = await scope.delete(first.sessionId)
  assert.equal(deleted.activeSessionId, next.id)
  assert.equal(await scope.getActive(), next.id)
})

test('SubSession inherits its parent Channel conversation identity link', async (t) => {
  const prisma = await fixture(t)
  await prisma.channel.create({
    data: { id: 'wechat', name: '微信', type: 'weixin-ilink' },
  })
  const agents = new AgentService({ prisma })
  const created = await agents.createWithInitialSession({
    name: 'A',
    channelIds: ['wechat'],
  })
  const conversations = new ChannelConversationService({ prisma })
  const resolved = await conversations.resolve({
    agentId: created.agent.id,
    channelId: 'wechat',
    envelope: inboundEnvelope(),
  })
  const child = await agents.createSession(created.agent.id, {
    parentSessionId: resolved.sessionId,
    title: '子任务',
  })

  assert.ok(
    await prisma.channelSessionLink.findUnique({
      where: {
        channelConversationId_sessionId: {
          channelConversationId: resolved.conversation.id,
          sessionId: child.id,
        },
      },
    }),
  )
})

test('Channel envelope rejects missing external actor, conversation, and message identities', () => {
  assert.throws(
    () =>
      normalizeChannelEnvelope({
        actor: {},
        conversation: { externalConversationId: 'user-1', type: 'private' },
        message: { externalMessageId: 'message-1' },
        source: { adapterId: 'wechat', channelId: 'wechat' },
      }),
    (error) => error.code === 'invalid_channel_envelope',
  )
})

test('scheduled Task requires an exact same-Agent Session and keeps Channel delivery optional', async (t) => {
  const prisma = await fixture(t)
  const agents = new AgentService({ prisma })
  const a = await agents.createWithInitialSession({ name: 'A' })
  const b = await agents.createWithInitialSession({ name: 'B' })
  const tasks = new TaskService()
  tasks.prisma = prisma
  const task = await tasks.upsert({
    id: 'daily',
    name: '日报',
    cron: '0 9 * * *',
    agentId: a.agent.id,
    sessionId: a.initialSession.id,
  })
  assert.equal(task.deliveryBindingId, null)
  await assert.rejects(
    () =>
      tasks.upsert({
        id: 'invalid',
        cron: 'once',
        agentId: a.agent.id,
        sessionId: b.initialSession.id,
      }),
    /does not belong/,
  )
})

test('Web RPC addresses Agent plus Session and never exposes web-default as a contact', async (t) => {
  const prisma = await fixture(t)
  const agents = new AgentService({ prisma })
  const created = await agents.createWithInitialSession({ name: 'Web Agent' })
  await prisma.message.create({
    data: {
      content: JSON.stringify([{ type: 'text', data: { text: 'hello' } }]),
      id: 'web-message',
      role: 'user',
      seq: 1,
      sessionId: created.initialSession.id,
      text: 'hello',
    },
  })
  const channelStore = new ChannelStore({ mode: 'database', prisma })
  const runtime = new ChannelRuntime({ channelStore, prisma })
  initChannelController({ channelStore, runtime, startTriggers: false })
  const sent = []
  await handleAgentMessage(
    { send: (payload) => sent.push(payload) },
    {
      data: { sessionId: created.initialSession.id },
      id: created.agent.id,
      request_id: 'request-1',
      type: 'history',
    },
  )
  assert.equal(sent[0].protocol, 'agent')
  assert.equal(sent[0].data.agent.id, created.agent.id)
  assert.equal(sent[0].data.sessionId, created.initialSession.id)
  assert.equal(sent[0].data.messages.length, 1)
  assert.equal((await agents.list()).length, 1)
  assert.equal(await prisma.channel.count({ where: { id: WEB_CHANNEL_ID } }), 1)
})

test('creating a WeChat Channel accepts transport data only and creates no Agent', async (t) => {
  const prisma = await fixture(t)
  const payload = normalizeChannelCreatePayload({
    adapter: {
      id: 'weixin-ilink',
      protocol: 'weixin.ilink',
      runtime: 'native',
    },
    config: {},
    profile: { name: '工作微信' },
    version: 1,
  })
  const store = new ChannelStore({ mode: 'database', prisma })
  const channel = await store.create(payload)
  assert.equal(channel.name, '工作微信')
  assert.equal(channel.type, 'weixin-ilink')
  assert.equal(await prisma.agent.count(), 0)
  assert.throws(
    () =>
      normalizeChannelCreatePayload({
        adapter: { id: 'weixin-ilink' },
        profile: { agentId: 'manual', name: 'invalid' },
        version: 1,
      }),
    /does not accept Agent or internal identity fields/,
  )
})
