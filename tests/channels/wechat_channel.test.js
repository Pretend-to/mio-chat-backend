import { test } from 'node:test'
import assert from 'node:assert'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'
import { DatabaseMemoryStore } from '../../lib/chat/persistence/DatabaseMemoryStore.js'
import { WechatChannel } from '../../channels/wechat/WechatChannel.js'

/**
 * WechatChannel 渠道核心测试（mock IlinkClient + DatabaseMemoryStore + llmProcessor）
 * 覆盖：多用户入站、聚合回复、context_token、记忆装配、typing 时序、slash 会话路由
 */

const MASTER = 'master@im.wechat'

async function createPrismaFixture() {
  const databasePath = path.join(
    os.tmpdir(),
    `mio-wc-${process.pid}-${crypto.randomUUID()}.db`,
  )
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
  return { databasePath, prisma }
}

async function createMemory(prisma, agentId) {
  await prisma.agent.create({ data: { id: agentId } })
  const memory = new DatabaseMemoryStore({ agentId, prisma })
  await memory.ensure()
  return memory
}

function makeHarness(memory) {
  const llmCalls = []
  const llm = {
    process: async (ctx) => {
      llmCalls.push(ctx)
      return { text: `RE: ${ctx.text}` }
    },
  }
  const mockClient = {
    botId: 'bot-001',
    sendLog: [],
    typingLog: [],
    configCalls: 0,
    getConfig: async () => {
      mockClient.configCalls++
      return { typing_ticket: 'tt-1' }
    },
    sendTyping: async (p) => {
      mockClient.typingLog.push(p.status)
    },
    sendMessage: async (p) => {
      mockClient.sendLog.push(p)
    },
    getUpdates: async () => ({ ret: 0, msgs: [], get_updates_buf: '' }),
    notifyStart: async () => {},
    notifyStop: async () => {},
  }
  const channel = new WechatChannel({
    client: mockClient,
    memory,
    masterId: MASTER,
    llm,
    typing: true,
  })
  channel.routeTargetResolver = async (envelope) => ({
    enqueueInboundDebounce: (from, packet = {}) =>
      channel.enqueueInboundDebounce(from, {
        ...packet,
        ctx: {
          ...packet.ctx,
          principal: {
            externalUserId: envelope.actor.externalUserId,
            id: `test:${envelope.actor.externalUserId}`,
            isAdmin: envelope.actor.externalUserId === MASTER,
            role:
              envelope.actor.externalUserId === MASTER
                ? 'system_admin'
                : 'user',
          },
        },
      }),
    get latestContextToken() {
      return channel.latestContextToken
    },
    set latestContextToken(value) {
      channel.latestContextToken = value
    },
    keepAlive: channel.keepAlive,
    memory,
  })
  const lastSent = () =>
    mockClient.sendLog[mockClient.sendLog.length - 1]?.item_list?.[0]?.text ||
    ''
  // 微信入站 message_id 是消息的唯一外部标识（db 契约：@@unique([channel_id, external_message_id])），
  // 夹具必须保证同渠道内不重复。
  let messageSeq = 0
  const userMsg = (text, { token = 'CTX', from = MASTER } = {}) => ({
    from_user_id: from,
    message_id: `wc-msg-${++messageSeq}`,
    message_type: 1,
    context_token: token,
    item_list: [{ type: 1, text }],
  })
  return {
    llm,
    llmCalls,
    mockClient,
    memory,
    channel,
    lastSent,
    userMsg,
  }
}

test('WechatChannel 渠道核心', async () => {
  const { databasePath, prisma } = await createPrismaFixture()
  const memory = await createMemory(prisma, 'wechat-master')
  const memory3 = await createMemory(prisma, 'a3')
  const {
    llm,
    llmCalls,
    mockClient,
    channel,
    lastSent,
    userMsg,
  } = makeHarness(memory)
  try {
    // 预置默认灵魂（灵魂引导有独立 M3 test 块覆盖）；此处测正常对话路径
    await memory.writeSoul('你叫小助手')

    await test('已认证 Channel 接受任意外部用户并保留其身份', async () => {
      await channel._handleMessage(
        userMsg('你是谁', { from: 'stranger@im.wechat' }),
      )
      assert.strictEqual(llmCalls.length, 1)
      assert.strictEqual(
        llmCalls[0].envelope.actor.externalUserId,
        'stranger@im.wechat',
      )
      assert.strictEqual(mockClient.sendLog.length, 1)
      await memory.clearChat(await memory.getActiveSession())
      llmCalls.length = 0
      mockClient.sendLog.length = 0
    })

    await test('普通消息：自动建会话 + 聚合回复 + context_token + 落盘', async () => {
      await channel._handleMessage(userMsg('你好'))
      assert.strictEqual(llmCalls.length, 1)
      assert.strictEqual(mockClient.sendLog.length, 1)
      assert.strictEqual(lastSent(), 'RE: 你好')
      assert.strictEqual(mockClient.sendLog[0].context_token, 'CTX')
      const sid = await memory.getActiveSession()
      assert.ok(sid)
      const chat = await memory.getChat(sid)
      assert.strictEqual(chat.length, 2)
      assert.strictEqual(chat[0].role, 'user')
      assert.strictEqual(chat[1].text, 'RE: 你好')
    })

    await test('记忆装配：soul + global + 会话历史 注入 llm', async () => {
      await memory.writeSoul('你叫小助手')
      await memory.addGlobal('user_profile', '用户喜欢Node')
      await channel._handleMessage(userMsg('再来', { token: 'CTX2' }))
      const ctx = llmCalls[llmCalls.length - 1]
      assert.ok(ctx.soul.includes('小助手'))
      assert.ok(ctx.globalMem.includes('喜欢Node'))
      assert.strictEqual(ctx.chat.length, 2)
    })

    await test('typing 时序：处理开始(1) 结束(2)', async () => {
      const i1 = mockClient.typingLog.indexOf(1)
      const i2 = mockClient.typingLog.indexOf(2)
      assert.ok(i1 !== -1 && i2 !== -1 && i1 < i2)
      assert.ok(mockClient.configCalls > 0, 'typing 前调 getConfig 拿 ticket')
    })

    await test('slash：/sessions /new /current /use /soul set+查看 /memory /help /clear /context', async () => {
      await channel._handleMessage(userMsg('/sessions'))
      assert.ok(lastSent().includes('默认会话'))
      await channel._handleMessage(userMsg('/new 工作'))
      const s2 = await memory.getActiveSession()
      assert.strictEqual((await memory.getSession(s2)).title, '工作')
      await channel._handleMessage(userMsg('/current'))
      assert.ok(lastSent().includes(s2))

      mockClient.sendLog.length = 0
      await channel._handleMessage(userMsg('/soul set 你叫大管家'))
      assert.ok((await memory.readSoul()).includes('大管家'))
      mockClient.sendLog.length = 0
      await channel._handleMessage(userMsg('/soul'))
      assert.ok(lastSent().includes('大管家'))

      mockClient.sendLog.length = 0
      await channel._handleMessage(userMsg('/memory'))
      assert.ok(lastSent().includes('用户喜欢Node'))
      await channel._handleMessage(userMsg('/help'))
      assert.ok(lastSent().includes('/new'))

      const sid = await memory.getActiveSession()
      await channel._handleMessage(userMsg('/use ' + sid))
      assert.strictEqual(await memory.getActiveSession(), sid)
      await memory.appendToChat(sid, { role: 'user', text: '旧' })
      await channel._handleMessage(userMsg('/clear'))
      assert.strictEqual((await memory.getChat(sid)).length, 0)

      await memory.setCrystal(sid, '<memory_crystal>事实X</memory_crystal>')
      mockClient.sendLog.length = 0
      await channel._handleMessage(userMsg('/context'))
      assert.ok(lastSent().includes('事实X'))

      // 测试 /model 命令
      await channel._handleMessage(userMsg('/model'))
      assert.ok(lastSent().includes('【当前模型】'))

      // 动态 mock llm.getModels
      llm.getModels = () => ({
        defaultProvider: 'AIStdio',
        models: {
          AIStdio: [
            { owner: 'Google', models: ['gemini-2.5-flash', 'gemini-2.5-pro'] },
          ],
          MioChat: [{ owner: 'OpenAI', models: ['gpt-4o'] }],
        },
      })
      await channel._handleMessage(userMsg('/model ls'))
      assert.ok(lastSent().includes('gemini-2.5-flash'))
      assert.ok(lastSent().includes('gpt-4o'))

      await channel._handleMessage(userMsg('/model gpt-4o'))
      assert.ok(lastSent().includes('模型已切换为：gpt-4o'))
      assert.strictEqual(channel.model, 'gpt-4o')

      await channel._handleMessage(userMsg('/model reset'))
      assert.ok(lastSent().includes('已重置为渠道默认模型配置'))
    })

    await test('M3 灵魂引导：无 soul→guidance；提炼 soulDraft→固化；有 soul→正常对话', async () => {
      const llm3 = {
        process: async (ctx) => {
          if (ctx.guidance) {
            if (ctx.text.includes('陪伴'))
              return {
                text: '记住了！',
                soulDraft: '你是用户的陪伴型助理，名字叫 小助手，陪伴用户工作',
              }
            return {
              text: '你好呀，我还没有人格设定，你希望我怎样陪伴我？给我取个名字吧？',
            }
          }
          return { text: `RE:${ctx.text}` }
        },
      }
      const client3 = {
        botId: 'b',
        sendLog: [],
        getConfig: async () => ({ typing_ticket: 't' }),
        sendTyping: async () => {},
        sendMessage: async (p) => {
          client3.sendLog.push(p)
        },
        getUpdates: async () => ({ ret: 0, msgs: [], get_updates_buf: '' }),
        notifyStart: async () => {},
        notifyStop: async () => {},
      }
      const ch3 = new WechatChannel({
        client: client3,
        memory: memory3,
        masterId: MASTER,
        llm: llm3,
        typing: false,
      })
      const last3 = () =>
        client3.sendLog[client3.sendLog.length - 1]?.item_list?.[0]?.text || ''
      let messageSeq = 0
      const msg = (text) => ({
        from_user_id: MASTER,
        context_token: 'c',
        message_id: `m3-${++messageSeq}`,
        message_type: 1,
        item_list: [{ type: 1, text }],
      })

      await ch3._handleMessage(msg('你好'))
      assert.ok(last3().includes('还没有人格设定'), '首聊进入引导模式')
      assert.strictEqual(await memory3.readSoul(), '', '引导未定前不写 soul')

      await ch3._handleMessage(msg('我希望你陪伴我工作'))
      assert.ok(
        (await memory3.readSoul()).includes('小助手'),
        'AI 提炼并固化 soul',
      )
      assert.ok(last3().includes('记住了'), '回复确认灵魂已设定')

      await ch3._handleMessage(msg('今天做什么'))
      assert.strictEqual(last3(), 'RE:今天做什么', '有 soul 后走正常对话')
      const sid3 = await memory3.getActiveSession()
      // 引导已不再单独占据流程层：引导对话同样正常落盘 session chat，
      // 为后续对话保留完整上下文（3 轮 user/assistant 交替 = 6 条）
      const chat3 = await memory3.getChat(sid3)
      assert.strictEqual(
        chat3.length,
        6,
        '三轮对话（含引导）全部落盘 session chat',
      )
      assert.deepStrictEqual(
        chat3.map((c) => `${c.role}:${c.text}`),
        [
          'user:你好',
          'assistant:你好呀，我还没有人格设定，你希望我怎样陪伴我？给我取个名字吧？',
          'user:我希望你陪伴我工作',
          'assistant:记住了！',
          'user:今天做什么',
          'assistant:RE:今天做什么',
        ],
        '落盘顺序应为 user/assistant 交替，引导对话亦在上下文中',
      )
    })

    await test('异常回显：LLM 抛错时向微信用户下发格式化的失败提示', async () => {
      mockClient.sendLog.length = 0
      const errChannel = new WechatChannel({
        client: mockClient,
        debounceEnabled: false,
        llm: {
          process: async () => {
            throw new Error(
              '500 400 credit insufficient balance: balance=0 required=2072 (request id: 20260907132209787259049c955d568fNCxOw6a)',
            )
          },
        },
        logger: { debug() {}, error() {}, info() {}, warn() {} },
        masterId: 'master@im.wechat',
        memory,
        typing: false,
      })
      await assert.rejects(
        () => errChannel._handleMessage(userMsg('测试出错')),
        /credit insufficient balance/,
      )
      assert.ok(mockClient.sendLog.length >= 1)
      const sent =
        mockClient.sendLog[mockClient.sendLog.length - 1]?.item_list?.[0]?.text ||
        ''
      assert.ok(sent.includes('⚠️ 请求处理失败'))
      assert.ok(sent.includes('credit insufficient balance'))
      assert.ok(sent.includes('20260907132209787259049c955d568fNCxOw6a'))
    })

    await test('无 Agent 绑定时保持 Channel 可用并回复明确提示', async () => {
      mockClient.sendLog.length = 0
      const passiveChannel = new WechatChannel({
        channelId: 'wechat-passive',
        client: mockClient,
        llm: { process: async () => assert.fail('不得触发模型执行') },
        logger: { debug() {}, error() {}, info() {}, warn() {} },
        masterId: MASTER,
        memory,
        routeTargetResolver: async () => {
          const error = new Error('No enabled Agent binding')
          error.code = 'binding_not_found'
          throw error
        },
        typing: false,
      })

      await passiveChannel.handleIncomingMessage(userMsg('有人吗'))

      assert.ok(lastSent().includes('没有关联可用的 Agent'))
    })
  } finally {
    await prisma.$disconnect()
    fs.rmSync(databasePath, { force: true })
  }
})
