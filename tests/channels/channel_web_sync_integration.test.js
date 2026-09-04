import { test } from 'node:test'
import assert from 'node:assert'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

global.logger = global.logger || console

import { MemoryStore } from '../../channels/memory/index.js'
import { WechatChannel } from '../../channels/wechat/WechatChannel.js'
import sessions from '../../lib/server/socket.io/services/sessions.js'

const MASTER = 'master@im.wechat'

function createMockClient() {
  const sent = []
  return {
    botId: 'bot-1',
    downloadMedia: async () => Buffer.from('fake'),
    getUpdates: async () => ({ msgs: [], ret: 0 }),
    sendMessage: async (payload) => {
      sent.push(payload)
      return { ret: 0 }
    },
    sent,
  }
}

test('集成测试 1：渠道用户消息入站与 LLM 流式推流实时广播至 Web 客户端', async () => {
  const baseDir = path.join(os.tmpdir(), `mio-sync-test-${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
  const memory = new MemoryStore({ agentId: 'ch_wechat_100', baseDir })
  await memory.writeSoul('你是桐乃助手')

  const client = createMockClient()
  const channelId = 'ch_wechat_100'

  // 创建测试用的 Mock LLM，模拟流式吐字与工具调用
  const mockLlm = {
    process: async (ctx) => {
      if (typeof ctx.onEmitTextBlock === 'function') {
        await ctx.onEmitTextBlock('你好，收到你的微信消息啦！')
      }
      return { text: '你好，收到你的微信消息啦！' }
    },
  }

  const chn = new WechatChannel({
    channelId,
    client,
    id: channelId,
    llm: mockLlm,
    masterId: MASTER,
    memory,
    typing: false,
  })

  // 模拟一个在线的 Web 客户端
  const receivedSocketMessages = []
  const mockWebClient = {
    activeEvents: new Map(),
    id: 'user_admin_1',
    initCacheMesageMethod: () => {},
    isAdmin: true,
    send: (msg) => {
      receivedSocketMessages.push(msg)
    },
    sendOpenaiMessage: (type, data, reqId) => {
      receivedSocketMessages.push({
        data,
        message: type,
        protocol: 'llm',
        request_id: reqId,
      })
    },
  }

  sessions.addSession(mockWebClient)

  try {
    // 微信入站一条用户消息
    const incomingMsg = {
      context_token: 'CTX_TOKEN_ABC',
      from_user_id: MASTER,
      item_list: [{ text: '老哥欠桐乃一杯奶茶', type: 1 }],
      message_id: 101,
      message_type: 1,
    }

    await chn.handleIncomingMessage(incomingMsg)

    // 验证 1：Web 客户端是否收到 channel_user_message 且 contactorId 正确对齐
    const userBroadcast = receivedSocketMessages.find(m => m.type === 'channel_user_message')
    assert.ok(userBroadcast, 'Web 客户端应收到 channel_user_message 广播')
    assert.strictEqual(userBroadcast.protocol, 'channel')
    assert.strictEqual(userBroadcast.data.contactorId, channelId, 'contactorId 必须为真实的渠道机器人 ID')
    assert.strictEqual(userBroadcast.data.userMessage.text, '老哥欠桐乃一杯奶茶')
    assert.ok(userBroadcast.data.assistantMessageId, '必须生成配对的 assistantMessageId 占位')

    // 验证 2：微信端是否收到 bot 回复
    assert.strictEqual(client.sent.length, 1, '微信端应发出 1 条消息')
    assert.strictEqual(client.sent[0].context_token, 'CTX_TOKEN_ABC', '微信回复应带回 context_token')

    // 验证 3：contextToken 持久化
    const savedToken = await memory.getAgentMeta('latestContextToken', null)
    assert.strictEqual(savedToken, 'CTX_TOKEN_ABC', 'contextToken 必须成功持久化到 MemoryStore')
  } catch (err) {
    console.error('TEST 1 ERROR:', err)
    throw err
  } finally {
    sessions.pool.delete('user_admin_1')
    sessions.cache.delete('user_admin_1')
    fs.rmSync(baseDir, { force: true, recursive: true })
  }
})

test('集成测试 2：高危操作/全局记忆审批挂起与微信端【确认】系统回显', async () => {
  const baseDir = path.join(os.tmpdir(), `mio-approval-test-${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
  const memory = new MemoryStore({ agentId: 'ch_approval_200', baseDir })
  const client = createMockClient()
  const channelId = 'ch_approval_200'

  const chn = new WechatChannel({
    channelId,
    client,
    id: channelId,
    llm: { process: async () => ({ text: 'ok' }) },
    masterId: MASTER,
    memory,
    typing: false,
  })

  try {
    // 1. 模拟工具申请全局长期记忆审批
    const confirmPromise = chn.requestConfirmation({
      description: '是否授权将以下内容新增至全局长期记忆（分类：general）？\n\n📝 记忆内容：【奶茶债务】老哥欠桐乃奶茶一杯\n📁 记忆分类：general\n⚙️ 操作类型：新增',
      title: '全局长期记忆更新审批',
    }, {
      contextToken: 'CTX_TOKEN_CONFIRM',
      from: MASTER,
    })

    await new Promise(r => setTimeout(r, 50))

    // 验证微信端是否收到格式化的审批卡片
    assert.strictEqual(client.sent.length, 1, '应向微信推送审批卡片')
    const cardText = client.sent[0].item_list[0].text
    assert.ok(cardText.includes('全局长期记忆更新审批'), '卡片应包含标题')
    assert.ok(cardText.includes('【奶茶债务】老哥欠桐乃奶茶一杯'), '卡片应包含具体的记忆内容')
    assert.ok(cardText.includes('回复【确认】'), '卡片应包含确认提示')

    // 2. 模拟用户在微信端回复「确认」
    const confirmMsg = {
      context_token: 'CTX_TOKEN_FRESH_REPLY',
      from_user_id: MASTER,
      item_list: [{ text: '确认', type: 1 }],
      message_id: 102,
      message_type: 1,
    }

    await chn.handleIncomingMessage(confirmMsg)

    // 验证审批 Promise 是否成功 resolve 为 true
    const result = await confirmPromise
    assert.strictEqual(result.approved, true, '确认指令应成功通过审批')

    // 验证系统回显是否立刻下发到微信
    assert.strictEqual(client.sent.length, 2, '应发出系统确认回显')
    const echoText = client.sent[1].item_list[0].text
    assert.ok(echoText.includes('已确认授权，正在继续执行'), '必须包含系统确认回显文案')
    assert.strictEqual(client.sent[1].context_token, 'CTX_TOKEN_FRESH_REPLY', '回显必须使用最新回复的 contextToken')

    // 验证最新 token 是否持久化
    const savedToken = await memory.getAgentMeta('latestContextToken', null)
    assert.strictEqual(savedToken, 'CTX_TOKEN_FRESH_REPLY', '确认回复带来的最新 token 必须持久化')
  } catch (err) {
    console.error('TEST 2 ERROR:', err)
    throw err
  } finally {
    fs.rmSync(baseDir, { force: true, recursive: true })
  }
})

test('集成测试 3：不可记住的 Shell 审批在渠道端展示完整命令 payload', async () => {
  const baseDir = path.join(os.tmpdir(), `mio-approval-command-test-${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
  const memory = new MemoryStore({ agentId: 'ch_approval_300', baseDir })
  const client = createMockClient()
  const chn = new WechatChannel({
    channelId: 'ch_approval_300',
    client,
    id: 'ch_approval_300',
    llm: { process: async () => ({ text: 'ok' }) },
    masterId: MASTER,
    memory,
    typing: false,
  })

  try {
    const command = 'okx list\nrm -rf /tmp/important'
    const pending = chn.requestConfirmation({
      command,
      description: `请确认\n${command}`,
      rememberable: false,
      title: '高危 Shell 命令授权',
    }, { from: MASTER, contextToken: 'CTX_COMMAND' })

    await new Promise(resolve => setTimeout(resolve, 20))
    const cardText = client.sent[0].item_list[0].text
    assert.ok(cardText.includes('rm -rf /tmp/important'))
    assert.ok(cardText.includes('回复【确认】'))
    assert.doesNotMatch(cardText, /执行并记住/)

    await chn.handleIncomingMessage({
      context_token: 'CTX_COMMAND_REPLY',
      from_user_id: MASTER,
      item_list: [{ text: '确认', type: 1 }],
      message_id: 103,
      message_type: 1,
    })
    assert.equal((await pending).approved, true)
  } finally {
    fs.rmSync(baseDir, { force: true, recursive: true })
  }
})

test('集成测试 4：Web 端主动发消息，工具调用+文本流+完成帧正常推送，旧 Socket 废弃重连时动态路由至新客户端', async () => {
  const baseDir = path.join(os.tmpdir(), `mio-web-send-test-${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
  const memory = new MemoryStore({ agentId: 'ch_web_send_400', baseDir })
  const channelId = 'ch_web_send_400'
  const session = await memory.createSession({ title: 'Web发起的测试会话' })
  await memory.setActiveSession(session.id)

  const receivedOnOldSocket = []
  const receivedOnNewSocket = []

  // 模拟发请求时的旧 client（工具调用中途断开）
  const oldWebClient = {
    activeEvents: new Map(),
    id: 'admin_user_400',
    initCacheMesageMethod: () => {},
    isAdmin: true,
    socket: {
      emit: () => {},
    },
    send: (msg) => {
      receivedOnOldSocket.push(msg)
    },
    sendOpenaiMessage: (type, data, reqId) => {
      receivedOnOldSocket.push({ data, message: type, protocol: 'llm', request_id: reqId })
    },
  }

  // 模拟重连后的新 client
  const newWebClient = {
    activeEvents: new Map(),
    id: 'admin_user_400',
    initCacheMesageMethod: () => {},
    isAdmin: true,
    socket: {
      emit: () => {},
    },
    send: (msg) => {
      receivedOnNewSocket.push(msg)
    },
    sendOpenaiMessage: (type, data, reqId) => {
      receivedOnNewSocket.push({ data, message: type, protocol: 'llm', request_id: reqId })
    },
  }

  sessions.addSession(oldWebClient)

  // 构造模拟后端 LLM：第一阶段触发 toolCall，中途发生 socket 重连（oldWebClient 失活，newWebClient 连入），第二阶段吐文本并 complete
  const mockLlm = {
    process: async (ctx) => {
      // 1. 发送 toolCall（此时旧客户端依然活跃）
      const targetClients1 = sessions.getAllAdminClients()
      for (const c of targetClients1) {
        c.sendOpenaiMessage('update', {
          content: { action: 'running', id: 'call_1', name: 'bash' },
          metaData: { contactorId: channelId, messageId: ctx.messageId },
          type: 'toolCall',
        }, ctx.messageId)
      }

      // 2. 模拟长耗时工具执行期间，旧连接断开，新连接接入
      oldWebClient.socket = null // 旧实例失效
      sessions.removeSession(oldWebClient)
      sessions.addSession(newWebClient) // 新实例接入 session pool

      // 3. 后续文本流与 complete 通过 resolveWebClients 派发
      const { resolveWebClients } = await import('../../channels/llm.js')
      const targetClients2 = resolveWebClients(ctx)
      for (const c of targetClients2) {
        c.sendOpenaiMessage('update', {
          content: '这是工具执行后的文本回复',
          metaData: { contactorId: channelId, messageId: ctx.messageId },
          type: 'content',
        }, ctx.messageId)
        c.sendOpenaiMessage('complete', {
          metaData: { contactorId: channelId, messageId: ctx.messageId },
        }, ctx.messageId)
      }

      return { text: '这是工具执行后的文本回复' }
    },
  }

  const chn = new WechatChannel({
    channelId,
    client: createMockClient(),
    id: channelId,
    llm: mockLlm,
    masterId: MASTER,
    memory,
    typing: false,
  })

  try {
    const webMsgId = 'web_msg_id_999'
    const ctx = {
      channelId,
      from: 'admin_user_400',
      isWeb: true,
      messageId: webMsgId,
      sid: session.id,
      webClient: oldWebClient,
    }

    await chn._route('帮我查一下系统状态', ctx)

    // 验证：旧 Socket 收到了 toolCall
    const oldToolCall = receivedOnOldSocket.find(m => m.data?.type === 'toolCall')
    assert.ok(oldToolCall, '旧 Socket 应该收到工具调用帧')

    // 验证：新 Socket 成功接收到了后续的 content 文本 chunk 和 complete 帧（未丢包！）
    const newContent = receivedOnNewSocket.find(m => m.data?.type === 'content')
    assert.ok(newContent, '重连后的新 Socket 必须收到普通文本 chunk')
    assert.strictEqual(newContent.data.content, '这是工具执行后的文本回复')

    const newComplete = receivedOnNewSocket.find(m => m.message === 'complete')
    assert.ok(newComplete, '重连后的新 Socket 必须收到 complete 终态帧')
    assert.strictEqual(newComplete.request_id, webMsgId)
  } finally {
    sessions.pool.delete('admin_user_400')
    sessions.cache.delete('admin_user_400')
    fs.rmSync(baseDir, { force: true, recursive: true })
  }
})

test('集成测试 5：Web 端连续发送消息触发批处理合并 (Batch Merging)，被合并的消息均收到 complete 广播', async () => {
  const baseDir = path.join(os.tmpdir(), `mio-batch-test-${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
  const memory = new MemoryStore({ agentId: 'ch_batch_500', baseDir })
  const channelId = 'ch_batch_500'
  const session = await memory.createSession({ title: '批处理测试会话' })
  await memory.setActiveSession(session.id)

  const receivedMessages = []
  const mockWebClient = {
    activeEvents: new Map(),
    id: 'admin_user_500',
    initCacheMesageMethod: () => {},
    isAdmin: true,
    socket: { emit: () => {} },
    send: (msg) => receivedMessages.push(msg),
    sendOpenaiMessage: (type, data, reqId) => {
      receivedMessages.push({ data, message: type, protocol: 'llm', request_id: reqId })
    },
  }

  sessions.addSession(mockWebClient)

  let chatCalls = 0
  const mockLlm = {
    process: async (ctx) => {
      chatCalls++
      await new Promise(r => setTimeout(r, 80))
      // 模拟底层 LLM 完成时发送当前活跃任务的 complete 帧
      if (ctx.messageId) {
        const { resolveWebClients } = await import('../../channels/llm.js')
        const targetClients = resolveWebClients(ctx)
        for (const c of targetClients) {
          c.sendOpenaiMessage('complete', {
            metaData: { contactorId: channelId, messageId: ctx.messageId },
          }, ctx.messageId)
        }
      }
      return { text: '处理完成回复' }
    },
  }

  const chn = new WechatChannel({
    channelId,
    client: createMockClient(),
    id: channelId,
    llm: mockLlm,
    masterId: MASTER,
    memory,
    typing: false,
  })

  try {
    // 1. 发起首个耗时任务，占用会话单飞锁
    const p1 = chn._route('先遣任务', {
      channelId,
      from: 'admin_user_500',
      isWeb: true,
      messageId: 'msg_lead',
      sid: session.id,
      webClient: mockWebClient,
    })

    // 等待 10ms 确保首个任务已成功持有锁
    await new Promise(r => setTimeout(r, 10))

    // 2. 连续入队 2 条来自 Web 端的待处理任务（进入会话等待队列）
    const p2 = chn._route('队列待合并任务1', {
      channelId,
      from: 'admin_user_500',
      isWeb: true,
      messageId: 'msg_batched_1',
      sid: session.id,
      webClient: mockWebClient,
    })
    const p3 = chn._route('队列待合并任务2', {
      channelId,
      from: 'admin_user_500',
      isWeb: true,
      messageId: 'msg_batched_2',
      sid: session.id,
      webClient: mockWebClient,
    })

    await Promise.all([p1, p2, p3])

    // 验证：所有被合并处理的 Web messageId 都收到了 complete 信号，前端没有遗留 pending
    const completes = receivedMessages.filter(m => m.message === 'complete')
    const completedMsgIds = completes.map(m => m.request_id)
    assert.ok(completedMsgIds.includes('msg_lead'), '首个独立任务必须收到 complete')
    assert.ok(completedMsgIds.includes('msg_batched_1'), '被合并的 Web 消息 1 必须收到补发的 complete')
    assert.ok(completedMsgIds.includes('msg_batched_2'), '合并主任务 2 必须收到 complete')
  } finally {
    sessions.pool.delete('admin_user_500')
    sessions.cache.delete('admin_user_500')
    fs.rmSync(baseDir, { force: true, recursive: true })
  }
})

