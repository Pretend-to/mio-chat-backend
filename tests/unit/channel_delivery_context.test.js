import assert from 'node:assert/strict'
import test from 'node:test'

import { ChatEventFactory } from '../../lib/chat/llm/events/ChatEventFactory.js'
import SessionTurnService from '../../lib/chat/sessions/SessionTurnService.js'

// SessionTurnService 的调用方自己持租约并把它传进这一轮 turn。单元测试里存储层是假的，
// 但「谁持租约」不是可选项 —— 用一个 stub 明确声明这个前置条件。
const leaseStub = {
  withSessionLease: async ({ agentId, sessionId }, fn) =>
    await fn({
      sessionLease: { agentId, assertLease: async () => {}, sessionId },
    }),
}

test('Channel ChatEvent exposes resolved binding and conversation routing fields', () => {
  const event = ChatEventFactory.createForChannel({
    ctx: {
      agentId: 'agent-1',
      bindingId: 'binding-1',
      channel: { channelType: 'wechat', id: 'channel-1' },
      channelConversationId: 'conversation-1',
      envelope: {
        conversation: {
          externalConversationId: 'group-1',
          externalThreadId: 'thread-1',
        },
      },
      from: 'user-1',
      sessionId: 'session-1',
    },
    messages: [],
    settings: {},
  })

  assert.equal(event.bindingId, 'binding-1')
  assert.equal(event.channelConversationId, 'conversation-1')
  assert.equal(event.externalConversationId, 'group-1')
  assert.equal(event.externalThreadId, 'thread-1')
  assert.equal(event.body.bindingId, 'binding-1')
  assert.equal(event.body.channelConversationId, 'conversation-1')
})

test('SessionTurnService persists a turn when the requested binding needs rebind', async () => {
  const messages = []
  const service = new SessionTurnService({
    sessionWorkCoordinator: leaseStub,
    llm: {
      process: async () => ({ text: 'done' }),
    },
    persistenceFactory: async () => ({
      agentId: 'agent-1',
      appendAssistantChunk: async () => null,
      appendToChat: async (_sessionId, message) => {
        messages.push(message)
        return { chat: messages }
      },
      appendUserMessage: async (_sessionId, message) => {
        messages.push(message)
        return { chat: messages }
      },
      appendUserMessageOnce: async (_sessionId, message) => {
        messages.push(message)
        return { id: message.id, inserted: true }
      },
      beginAssistantMessage: async () => 'draft-1',
      ensure: async () => {},
      finalizeAssistantMessage: async (_messageId, message) => {
        messages.push(message)
        return true
      },
      getAgentMeta: async () => 0,
      getCrystal: async () => '',
      getPendingMemories: async () => [],
      getSession: async () => ({ chat: messages }),
      readAllGlobal: async () => '',
      readSoul: async () => '',
      setCrystal: async () => {},
    }),
    prisma: {
      agent: {
        findUnique: async () => ({
          id: 'agent-1',
          model: null,
          provider: null,
        }),
      },
      session: {
        findUnique: async () => ({ id: 'session-1', agentId: 'agent-1' }),
      },
      agentChannelBinding: {
        findUnique: async () => null,
      },
    },
  })

  const result = await service.runTurn({
    agentId: 'agent-1',
    deliveryBindingId: 'removed-binding',
    sessionId: 'session-1',
    text: 'still run',
  })

  assert.equal(result.deliveryBindingId, 'removed-binding')
  assert.equal(result.deliveryStatus, 'needs_rebind')
  assert.ok(messages.length > 0)
})

test('SessionTurnService session_only never falls back to Agent default', async () => {
  const observed = []
  const memory = {
    agentId: 'agent-1',
    appendAssistantChunk: async () => null,
    appendToChat: async (_sessionId, message) => {
      observed.push(message)
      return { chat: observed }
    },
    appendUserMessage: async (_sessionId, message) => {
      observed.push(message)
      return { chat: observed }
    },
    appendUserMessageOnce: async (_sessionId, message) => {
      observed.push(message)
      return { id: message.id, inserted: true }
    },
    beginAssistantMessage: async () => 'draft-1',
    ensure: async () => {},
    finalizeAssistantMessage: async (_messageId, message) => {
      observed.push(message)
      return true
    },
    getAgentMeta: async () => 0,
    getCrystal: async () => '',
    getPendingMemories: async () => [],
    getSession: async () => ({ chat: observed }),
    readAllGlobal: async () => '',
    readSoul: async () => '',
    setCrystal: async () => {},
  }
  const service = new SessionTurnService({
    sessionWorkCoordinator: leaseStub,
    llm: { process: async () => ({ text: 'silent' }) },
    persistenceFactory: async () => memory,
    prisma: {
      agent: {
        findUnique: async () => ({
          defaultDeliveryBindingId: 'binding-default',
          id: 'agent-1',
          model: null,
          provider: null,
        }),
      },
      session: {
        findUnique: async () => ({ agentId: 'agent-1', id: 'session-1' }),
      },
      agentChannelBinding: {
        findUnique: async () => ({
          agentId: 'agent-1',
          channelId: 'wechat',
          enabled: true,
          id: 'binding-default',
          outboundEnabled: true,
        }),
      },
    },
  })
  const result = await service.runTurn({
    agentId: 'agent-1',
    deliveryMode: 'session_only',
    sessionId: 'session-1',
    text: 'silent',
  })
  assert.equal(result.deliveryStatus, 'not_requested')
  assert.equal(result.deliveryBindingId, null)
})

test('SessionTurnService explicit channel mode reports needs_rebind instead of Agent default', async () => {
  const service = new SessionTurnService({
    sessionWorkCoordinator: leaseStub,
    llm: { process: async () => ({ text: 'rebind' }) },
    persistenceFactory: async () => ({
      agentId: 'agent-1',
      appendAssistantChunk: async () => null,
      appendToChat: async () => ({ chat: [] }),
      appendUserMessage: async () => ({ chat: [] }),
      appendUserMessageOnce: async (_sessionId, message) => ({ id: message.id, inserted: true }),
      beginAssistantMessage: async () => 'draft-1',
      ensure: async () => {},
      finalizeAssistantMessage: async () => true,
      getAgentMeta: async () => 0,
      getCrystal: async () => '',
      getPendingMemories: async () => [],
      getSession: async () => ({ chat: [] }),
      readAllGlobal: async () => '',
      readSoul: async () => '',
      setCrystal: async () => {},
    }),
    prisma: {
      agent: {
        findUnique: async () => ({
          defaultDeliveryBindingId: 'binding-default',
          id: 'agent-1',
          model: null,
          provider: null,
        }),
      },
      session: {
        findUnique: async () => ({ agentId: 'agent-1', id: 'session-1' }),
      },
      agentChannelBinding: {
        findUnique: async ({ where }) =>
          where.id === 'binding-default'
            ? {
                agentId: 'agent-1',
                channelId: 'wechat',
                enabled: true,
                id: 'binding-default',
                outboundEnabled: true,
              }
            : null,
      },
    },
  })
  const result = await service.runTurn({
    agentId: 'agent-1',
    deliveryMode: 'channel',
    sessionId: 'session-1',
    text: 'rebind',
  })
  assert.equal(result.deliveryStatus, 'needs_rebind')
  assert.equal(result.deliveryBindingId, null)
})

test('SessionTurnService ignores a legacy Web Agent default', async () => {
  const service = new SessionTurnService({
    sessionWorkCoordinator: leaseStub,
    llm: { process: async () => ({ text: 'web-visible' }) },
    persistenceFactory: async () => ({
      agentId: 'agent-1',
      appendAssistantChunk: async () => null,
      appendToChat: async () => ({ chat: [] }),
      appendUserMessage: async () => ({ chat: [] }),
      appendUserMessageOnce: async (_sessionId, message) => ({ id: message.id, inserted: true }),
      beginAssistantMessage: async () => 'draft-1',
      ensure: async () => {},
      finalizeAssistantMessage: async () => true,
      getAgentMeta: async () => 0,
      getCrystal: async () => '',
      getPendingMemories: async () => [],
      getSession: async () => ({ chat: [] }),
      readAllGlobal: async () => '',
      readSoul: async () => '',
      setCrystal: async () => {},
    }),
    prisma: {
      agent: {
        findUnique: async () => ({
          defaultDeliveryBindingId: 'binding-web',
          id: 'agent-1',
          model: null,
          provider: null,
        }),
      },
      session: {
        findUnique: async () => ({ agentId: 'agent-1', id: 'session-1' }),
      },
      agentChannelBinding: {
        findUnique: async () => ({
          agentId: 'agent-1',
          channel: { id: 'web-default', type: 'web' },
          channelId: 'web-default',
          enabled: true,
          id: 'binding-web',
          outboundEnabled: true,
        }),
      },
    },
  })
  const result = await service.runTurn({
    agentId: 'agent-1',
    sessionId: 'session-1',
    text: 'visible in Web',
  })
  assert.equal(result.deliveryStatus, 'not_requested')
  assert.equal(result.deliveryBindingId, null)
})
