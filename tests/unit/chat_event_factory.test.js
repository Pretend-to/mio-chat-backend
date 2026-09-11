import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ChatEventFactory } from '../../lib/chat/llm/events/ChatEventFactory.js'
import {
  CONVERSATION_KIND,
  EVENT_SOURCE,
  TRIGGER_KIND,
} from '../../lib/chat/llm/events/constants.js'
import { WebChatEvent } from '../../lib/chat/llm/events/subtypes/WebChatEvent.js'
import { ChannelChatEvent } from '../../lib/chat/llm/events/subtypes/ChannelChatEvent.js'

describe('ChatEventFactory & ChatEvent Suite', () => {
  it('应当正确创建 WebChatEvent 并解析单聊场景与身份', () => {
    const mockClient = {
      id: 'client_123',
      ip: '192.168.1.10',
      isAdmin: false,
      sendOpenaiMessage: () => {},
      pushEvent: () => {},
      popEvent: () => {},
    }
    const mockReq = {
      request_id: 'req_web_001',
      data: {
        messages: [{ role: 'user', content: 'hello' }],
        settings: { base: { model: 'gpt-4o' } },
      },
      metaData: {
        contactorId: 'contactor_abc',
        messageId: 'msg_999',
      },
    }

    const event = ChatEventFactory.createForWeb({ client: mockClient, req: mockReq })
    assert.ok(event instanceof WebChatEvent)
    assert.equal(event.source, EVENT_SOURCE.WEB)
    assert.equal(event.conversationKind, CONVERSATION_KIND.DIRECT)
    assert.equal(event.triggerKind, TRIGGER_KIND.INTERACTIVE)
    assert.equal(event.actorId, 'web:client_123')
    assert.equal(event.principalId, 'client_123')
    assert.equal(event.user.id, 'client_123')
    assert.equal(event.contactorId, 'contactor_abc')
    assert.equal(event.messageId, 'msg_999')
    assert.equal(event.member, null)
  })

  it('应当正确创建 Web 多 Agent 群聊事件', () => {
    const mockClient = { id: 'client_123', isAdmin: false }
    const mockReq = {
      request_id: 'req_web_002',
      data: { messages: [] },
      metaData: {
        contactorId: 'group_abc',
        memberId: 'agent_m1',
        memberName: 'MioBot',
      },
    }

    const event = ChatEventFactory.createForWeb({ client: mockClient, req: mockReq })
    assert.equal(event.source, EVENT_SOURCE.WEB)
    assert.equal(event.conversationKind, CONVERSATION_KIND.GROUP)
    assert.deepEqual(event.member, {
      id: 'agent_m1',
      name: 'MioBot',
      avatar: null,
    })
  })

  it('应当正确创建 ChannelChatEvent 并解析渠道与真实人类身份', () => {
    const mockCtx = {
      channel: { channelType: 'wechat', id: 'wx_bot_instance' },
      from: 'wx_user_open_id_123',
      channelId: 'wx_bot_instance',
      sessionId: 'sess_wx_456',
      messageId: 'wx_msg_789',
      isGroup: true,
      senderName: '张三',
      onEmitTextBlock: () => {},
    }

    const event = ChatEventFactory.createForChannel({
      ctx: mockCtx,
      messages: [{ role: 'user', content: '微信你好' }],
      settings: { base: { model: 'claude' } },
    })

    assert.ok(event instanceof ChannelChatEvent)
    assert.equal(event.source, EVENT_SOURCE.CHANNEL)
    assert.equal(event.conversationKind, CONVERSATION_KIND.GROUP)
    assert.equal(event.triggerKind, TRIGGER_KIND.INTERACTIVE)
    assert.equal(event.actorId, 'wechat:wx_user_open_id_123')
    assert.equal(event.channelId, 'wx_bot_instance')
    assert.equal(event.contactorId, 'wx_bot_instance')
    assert.equal(event.sessionId, 'sess_wx_456')
    assert.equal(event.messageId, 'wx_msg_789')
    assert.deepEqual(event.member, {
      id: 'wx_user_open_id_123',
      name: '张三',
      avatar: null,
    })
  })

  it('应当正确创建 Channel 发起的 Task (正交三维验证)', () => {
    const mockCtx = {
      channel: { channelType: 'feishu', id: 'fs_instance' },
      from: 'feishu_user_888',
      isTask: true,
      isGroup: false,
    }

    const event = ChatEventFactory.createForChannel({
      ctx: mockCtx,
      messages: [],
      settings: {},
    })

    assert.equal(event.source, EVENT_SOURCE.CHANNEL)
    assert.equal(event.conversationKind, CONVERSATION_KIND.DIRECT)
    assert.equal(event.triggerKind, TRIGGER_KIND.TASK)
  })

  it('Null Object Client 应当具备完整的防护方法且调用不抛错', () => {
    const event = ChatEventFactory.createMock()
    assert.doesNotThrow(() => {
      event.client.pushEvent('id', event)
      event.client.popEvent('id')
      event.client.pushConnection('id')
      event.client.popConnection('id')
      event.client.sendOpenaiMessage('type', {}, 'id')
      event.client.emit('event')
      event.client.on('event', () => {})
      event.client.removeListener('event', () => {})
    })
  })

  it('交互管理 registerInteraction / emitInteraction 应当正确工作', () => {
    const event = ChatEventFactory.createMock()
    let result = null
    event.registerInteraction('int_1', (data) => {
      result = data
    })

    const emitted = event.emitInteraction('int_1', { approved: true })
    assert.equal(emitted, true)
    assert.deepEqual(result, { approved: true })

    // 再次 emit 应返回 false (已被消费)
    assert.equal(event.emitInteraction('int_1', { approved: false }), false)
  })
})
