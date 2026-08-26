import { test } from 'node:test'
import assert from 'node:assert'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { MemoryStore } from '../../channels/memory/index.js'
import { WechatChannel } from '../../channels/wechat/WechatChannel.js'

/**
 * WechatChannel 渠道核心测试（mock IlinkClient + MemoryStore + llmProcessor）
 * 覆盖：单用户边界、聚合回复、context_token、记忆装配、typing 时序、slash 会话路由
 */

const MASTER = 'master@im.wechat'

function makeHarness() {
  const llmCalls = []
  const llm = { process: async (ctx) => { llmCalls.push(ctx); return { text: `RE: ${ctx.text}` } } }
  const mockClient = {
    botId: 'bot-001',
    sendLog: [],
    typingLog: [],
    configCalls: 0,
    getConfig: async () => { mockClient.configCalls++; return { typing_ticket: 'tt-1' } },
    sendTyping: async (p) => { mockClient.typingLog.push(p.status) },
    sendMessage: async (p) => { mockClient.sendLog.push(p) },
    getUpdates: async () => ({ ret: 0, msgs: [], get_updates_buf: '' }),
    notifyStart: async () => {}, notifyStop: async () => {},
  }
  const baseDir = path.join(os.tmpdir(), `mio-wc-${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
  const memory = new MemoryStore({ agentId: 'wechat-master', baseDir })
  const channel = new WechatChannel({ client: mockClient, memory, masterId: MASTER, llm, typing: true })
  const lastSent = () => mockClient.sendLog[mockClient.sendLog.length - 1]?.item_list?.[0]?.text || ''
  const userMsg = (text, { token = 'CTX', from = MASTER } = {}) => ({
    from_user_id: from, message_id: Math.floor(Math.random() * 1e6), message_type: 1,
    context_token: token, item_list: [{ type: 1, text }],
  })
  return { llmCalls, mockClient, memory, channel, lastSent, userMsg, baseDir }
}

test('WechatChannel 渠道核心', async () => {
  const { llmCalls, mockClient, memory, channel, lastSent, userMsg, baseDir } = makeHarness()
  // 预置默认灵魂（灵魂引导有独立 M3 test 块覆盖）；此处测正常对话路径
  await memory.writeSoul('你叫小助手')

  await test('单用户边界：非绑定者消息被忽略', async () => {
    await channel._handleMessage(userMsg('你是谁', { from: 'stranger@im.wechat' }))
    assert.strictEqual(llmCalls.length, 0)
    assert.strictEqual(mockClient.sendLog.length, 0)
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
  })

  await test('M3 灵魂引导：无 soul→guidance；提炼 soulDraft→固化；有 soul→正常对话', async () => {
    const baseDir3 = path.join(os.tmpdir(), `mio-wc-3-${Date.now()}`)
    const memory3 = new MemoryStore({ agentId: 'a3', baseDir: baseDir3 })
    const llm3 = {
      process: async (ctx) => {
        if (ctx.guidance) {
          if (ctx.text.includes('陪伴')) return { text: '记住了！', soulDraft: '你是用户的陪伴型助理，名字叫 小助手，陪伴用户工作' }
          return { text: '你好呀，我还没有人格设定，你希望我怎样陪伴我？给我取个名字吧？' }
        }
        return { text: `RE:${ctx.text}` }
      },
    }
    const client3 = {
      botId: 'b', sendLog: [], getConfig: async () => ({ typing_ticket: 't' }),
      sendTyping: async () => {}, sendMessage: async (p) => { client3.sendLog.push(p) },
      getUpdates: async () => ({ ret: 0, msgs: [], get_updates_buf: '' }), notifyStart: async () => {}, notifyStop: async () => {},
    }
    const ch3 = new WechatChannel({ client: client3, memory: memory3, masterId: MASTER, llm: llm3, typing: false })
    const last3 = () => client3.sendLog[client3.sendLog.length - 1]?.item_list?.[0]?.text || ''
    const msg = (text) => ({ from_user_id: MASTER, context_token: 'c', message_type: 1, item_list: [{ type: 1, text }] })

    await ch3._handleMessage(msg('你好'))
    assert.ok(last3().includes('还没有人格设定'), '首聊进入引导模式')
    assert.strictEqual(await memory3.readSoul(), '', '引导未定前不写 soul')

    await ch3._handleMessage(msg('我希望你陪伴我工作'))
    assert.ok((await memory3.readSoul()).includes('小助手'), 'AI 提炼并固化 soul.md')
    assert.ok(last3().includes('记住了'), '回复确认灵魂已设定')

    await ch3._handleMessage(msg('今天做什么'))
    assert.strictEqual(last3(), 'RE:今天做什么', '有 soul 后走正常对话')
    const sid3 = await memory3.getActiveSession()
    assert.strictEqual((await memory3.getChat(sid3)).length, 2, '正常对话落盘 session chat（引导对话未计入）')
    fs.rmSync(baseDir3, { recursive: true, force: true })
  })

fs.rmSync(baseDir, { recursive: true, force: true })
})