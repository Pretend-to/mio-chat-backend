import assert from 'node:assert/strict'
import test from 'node:test'

import { BaseChannel } from '../../channels/common/BaseChannel.js'
import { createBackendLlm } from '../../channels/llm.js'
import SessionTurnService from '../../lib/chat/sessions/SessionTurnService.js'

// SessionTurnService 的调用方（Web Agent / Task / Trigger 入口）自己持租约，并把它
// 传进这一轮 turn。单元测试里存储层是假的，但「谁持租约」不是可选项 —— 用一个 stub
// 明确声明这个前置条件，而不是让渠道去构造需要真 prisma 的 coordinator。
const leaseStub = {
  withSessionLease: async ({ agentId, sessionId }, fn) =>
    await fn({
      sessionLease: { agentId, assertLease: async () => {}, sessionId },
    }),
}

function createMemory(agentId = 'agent-1') {
  const messages = []
  const drafts = new Set()
  let draftSeq = 0
  const append = (message) => {
    messages.push(message)
    return { chat: [...messages] }
  }
  return {
    agentId,
    appendAssistantChunk: async () => null,
    appendToChat: async (_sessionId, message) => append(message),
    appendUserMessage: async (_sessionId, message) => append(message),
    appendUserMessageOnce: async (_sessionId, message) => {
      append(message)
      return { id: message.id, inserted: true }
    },
    beginAssistantMessage: async () => {
      draftSeq += 1
      const messageId = `draft-${draftSeq}`
      drafts.add(messageId)
      return messageId
    },
    ensure: async () => {},
    finalizeAssistantMessage: async (messageId, message) => {
      drafts.delete(messageId)
      append(message)
      return true
    },
    getAgentMeta: async () => 0,
    getCrystal: async () => '',
    getPendingMemories: async () => [],
    getSession: async () => ({ chat: [...messages] }),
    messages,
    readAllGlobal: async () => '',
    readSoul: async () => '',
    setCrystal: async () => {},
  }
}

function createOutputPort({ outboundEnabled = true } = {}) {
  const sent = []
  return {
    buildSendMsg: ({ text, to }) => ({ text, to }),
    client: { botId: 'bot-1' },
    doSendMessage: async (payload) => {
      sent.push(payload)
      return { ok: true }
    },
    latestContextToken: 'context-1',
    masterId: 'recipient-1',
    model: 'stale-model',
    outboundEnabled,
    provider: 'stale-provider',
    sent,
    splitTextToSegments: (text) => [text],
    startTyping: () => {},
    stopTyping: async () => {},
  }
}

test('backend LLM preserves SubAgent wake identity through the permission event', async () => {
  let observed = null
  const service = {
    _getDefaultProvider: () => 'provider-1',
    llms: {
      'provider-1': {
        models: [{ models: ['private-model'] }],
      },
    },
    handleMessage: async (event) => {
      observed = event
      await event.complete()
    },
  }
  const llm = createBackendLlm({ llmService: service })

  await llm.process({
    agentId: 'agent-1',
    channel: { channelType: 'session', log: { info() {}, error() {} } },
    chat: [],
    isTask: true,
    isWake: true,
    isWeb: false,
    memory: { agentId: 'agent-1', getAgentMeta: async () => 0 },
    model: 'private-model',
    principal: {
      externalUserId: 'subagent-dispatcher',
      id: 'system:subagent:wake',
      isAdmin: true,
      role: 'system_admin',
    },
    sessionId: 'session-parent',
    source: 'subagent',
    text: 'SubAgent 已完成，请读取结果',
  })

  assert.equal(observed.source, 'subagent')
  assert.equal(observed.isWake, true)
  assert.equal(observed.triggerKind, 'task')
  assert.equal(observed.principal.isAdmin, true)
  assert.equal(observed.user.isAdmin, true)
  assert.equal(observed.body.settings.base.model, 'private-model')
})

test('SessionTurnService defaults identity only for trusted runtime sources', async () => {
  const observed = []
  const memory = createMemory()
  const service = new SessionTurnService({
    sessionWorkCoordinator: leaseStub,
    llm: {
      process: async (context) => {
        observed.push(context)
        return { content: [{ data: { text: 'ok' }, type: 'text' }], text: 'ok' }
      },
    },
    persistenceFactory: async () => memory,
    prisma: {
      agent: {
        findUnique: async () => ({ id: 'agent-1', model: null, provider: null }),
      },
      session: {
        findUnique: async () => ({ agentId: 'agent-1', id: 'session-1' }),
      },
    },
  })

  await service.runTurn({
    agentId: 'agent-1',
    isTask: true,
    isWake: true,
    isWeb: false,
    sessionId: 'session-1',
    source: 'subagent',
    text: 'wake',
  })
  await service.runTurn({
    agentId: 'agent-1',
    isTask: true,
    isWeb: false,
    sessionId: 'session-1',
    source: 'channel',
    text: 'channel task',
  })

  assert.equal(observed[0].principal.isAdmin, true)
  assert.equal(observed[1].principal, null)
})

test('TaskScheduler must inject a backend bridge into SessionTurnService', async () => {
  const observed = []
  const memory = createMemory()
  const rawLlmService = {
    _getDefaultProvider: () => 'provider-1',
    handleMessage: async (event) => {
      observed.push(event)
      await event.update({ content: 'scheduled reply', type: 'content' })
      await event.complete()
    },
    llms: {
      'provider-1': { models: [{ models: ['scheduled-model'] }] },
    },
  }
  assert.throws(
    () => new SessionTurnService({ llm: rawLlmService }),
    /llm must expose process\(\)/,
  )

  const service = new SessionTurnService({
    sessionWorkCoordinator: leaseStub,
    llm: createBackendLlm({ llmService: rawLlmService }),
    persistenceFactory: async () => memory,
    prisma: {
      agent: {
        findUnique: async () => ({
          id: 'agent-1',
          model: null,
          provider: 'provider-1',
        }),
      },
      session: {
        findUnique: async () => ({ agentId: 'agent-1', id: 'session-1' }),
      },
    },
  })

  const result = await service.runTurn({
    agentId: 'agent-1',
    isTask: true,
    isWeb: false,
    sessionId: 'session-1',
    source: 'scheduled_task',
    text: 'run scheduled task',
  })

  assert.equal(result.reply, null)
  assert.equal(observed.length, 1)
  assert.equal(observed[0].body.settings.base.model, 'scheduled-model')
  assert.ok(
    memory.messages.some(
      (message) => message.role === 'assistant' && message.text === 'scheduled reply',
    ),
  )
})

test('SessionTurnService executes with the fresh Agent model and uses a live Channel only for output', async () => {
  const observed = []
  const memory = createMemory()
  const boundChannel = createOutputPort()
  const service = new SessionTurnService({
    sessionWorkCoordinator: leaseStub,
    channelRuntime: {
      running: new Map([
        [
          'channel-1',
          {
            agents: new Map([['binding-1', { chn: boundChannel }]]),
          },
        ],
      ]),
    },
    llm: {
      process: async (context) => {
        observed.push(context)
        return { content: [], text: 'delivered reply' }
      },
    },
    persistenceFactory: async () => memory,
    prisma: {
      agent: {
        findUnique: async () => ({
          id: 'agent-1',
          model: 'agent-model',
          provider: 'agent-provider',
        }),
      },
      agentChannelBinding: {
        findUnique: async () => ({
          agentId: 'agent-1',
          channelId: 'channel-1',
          enabled: true,
          id: 'binding-1',
          outboundEnabled: true,
        }),
      },
      session: {
        findUnique: async () => ({ agentId: 'agent-1', id: 'session-1' }),
      },
    },
  })

  const result = await service.runTurn({
    agentId: 'agent-1',
    deliveryBindingId: 'binding-1',
    isTask: true,
    isWake: true,
    isWeb: false,
    sessionId: 'session-1',
    source: 'subagent',
    text: 'wake',
  })

  assert.equal(result.deliveryStatus, 'delivered')
  assert.equal(observed[0].model, 'agent-model')
  assert.equal(observed[0].provider, 'agent-provider')
  assert.equal(observed[0].principal.isAdmin, true)
  assert.equal(observed[0].isWeb, false)
  assert.equal(boundChannel.model, 'stale-model')
  assert.equal(boundChannel.provider, 'stale-provider')
  assert.equal(boundChannel.sent.length, 1)
  assert.equal(boundChannel.sent[0].text, 'delivered reply')
  assert.equal(boundChannel.sent[0].to, 'recipient-1')
})

test('SessionTurnService executes and persists without a binding or with an offline binding', async () => {
  const observed = []
  const memory = createMemory()
  const binding = {
    agentId: 'agent-1',
    channelId: 'channel-offline',
    enabled: true,
    id: 'binding-offline',
    outboundEnabled: true,
  }
  const service = new SessionTurnService({
    sessionWorkCoordinator: leaseStub,
    channelRuntime: { running: new Map() },
    llm: {
      process: async (context) => {
        observed.push(context)
        return { content: [], text: 'persist me' }
      },
    },
    persistenceFactory: async () => memory,
    prisma: {
      agent: {
        findUnique: async () => ({
          id: 'agent-1',
          model: 'agent-model',
          provider: 'agent-provider',
        }),
      },
      agentChannelBinding: { findUnique: async () => binding },
      session: {
        findUnique: async () => ({ agentId: 'agent-1', id: 'session-1' }),
      },
    },
  })

  const headless = await service.runTurn({
    agentId: 'agent-1',
    sessionId: 'session-1',
    source: 'scheduled_task',
    text: 'headless',
  })
  const offline = await service.runTurn({
    agentId: 'agent-1',
    deliveryBindingId: 'binding-offline',
    sessionId: 'session-1',
    source: 'scheduled_task',
    text: 'offline',
  })

  assert.equal(headless.deliveryStatus, 'not_requested')
  assert.equal(offline.deliveryStatus, 'unavailable')
  assert.equal(observed.length, 2)
  assert.ok(memory.messages.some((message) => message.text === 'persist me'))
})

test('SessionTurnService never sends through a binding with outbound disabled', async () => {
  const memory = createMemory()
  const boundChannel = createOutputPort()
  let llmCalls = 0
  const service = new SessionTurnService({
    sessionWorkCoordinator: leaseStub,
    channelRuntime: {
      running: new Map([
        [
          'channel-1',
          { agents: new Map([['binding-1', { chn: boundChannel }]]) },
        ],
      ]),
    },
    llm: {
      process: async () => {
        llmCalls += 1
        return { content: [], text: 'private result' }
      },
    },
    persistenceFactory: async () => memory,
    prisma: {
      agent: {
        findUnique: async () => ({
          id: 'agent-1',
          model: 'agent-model',
          provider: 'agent-provider',
        }),
      },
      agentChannelBinding: {
        findUnique: async () => ({
          agentId: 'agent-1',
          channelId: 'channel-1',
          enabled: true,
          id: 'binding-1',
          outboundEnabled: false,
        }),
      },
      session: {
        findUnique: async () => ({ agentId: 'agent-1', id: 'session-1' }),
      },
    },
  })

  const result = await service.runTurn({
    agentId: 'agent-1',
    deliveryBindingId: 'binding-1',
    sessionId: 'session-1',
    source: 'trigger',
    text: 'do not deliver',
  })

  assert.equal(result.deliveryStatus, 'disabled')
  assert.equal(llmCalls, 1)
  assert.equal(boundChannel.sent.length, 0)
  assert.ok(memory.messages.some((message) => message.text === 'private result'))
})

test('SessionTurnService reloads Agent model changes without mutating Channel mirrors', async () => {
  const selectedModels = []
  const memory = createMemory()
  const agent = {
    id: 'agent-1',
    model: 'model-v1',
    provider: 'provider-v1',
  }
  const service = new SessionTurnService({
    sessionWorkCoordinator: leaseStub,
    llm: {
      process: async ({ model, provider }) => {
        selectedModels.push(`${provider}/${model}`)
        return { content: [], text: 'ok' }
      },
    },
    persistenceFactory: async () => memory,
    prisma: {
      agent: { findUnique: async () => ({ ...agent }) },
      session: {
        findUnique: async () => ({ agentId: 'agent-1', id: 'session-1' }),
      },
    },
  })

  await service.runTurn({
    agentId: 'agent-1',
    sessionId: 'session-1',
    source: 'scheduled_task',
    text: 'first',
  })
  agent.model = 'model-v2'
  agent.provider = 'provider-v2'
  await service.runTurn({
    agentId: 'agent-1',
    sessionId: 'session-1',
    source: 'scheduled_task',
    text: 'second',
  })

  assert.deepEqual(selectedModels, [
    'provider-v1/model-v1',
    'provider-v2/model-v2',
  ])
})

test('BaseChannel outboundEnabled blocks realtime protocol output but not execution', async () => {
  const memory = createMemory()
  let sends = 0
  class DisabledOutputChannel extends BaseChannel {
    async _loop() {}
    buildSendMsg({ text }) { return { text } }
    async doSendMessage() { sends += 1 }
  }
  const channel = new DisabledOutputChannel({
    client: {},
    llm: {
      process: async () => ({ content: [], text: 'persist only' }),
    },
    masterId: 'recipient-1',
    memory,
    outboundEnabled: false,
  })

  await channel.appendUserMessage('session-1', 'realtime inbound', {
    from: 'recipient-1',
    isWeb: false,
    sessionLease: {
      agentId: 'agent-1',
      assertLease: async () => {},
      sessionId: 'session-1',
    },
  })

  assert.equal(sends, 0)
  assert.ok(memory.messages.some((message) => message.text === 'persist only'))
})
