import { test } from 'node:test'
import assert from 'node:assert'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { MemoryStore } from '../../channels/memory/index.js'
import { WechatChannel } from '../../channels/wechat/WechatChannel.js'
import { splitWechatText } from '../../channels/wechat/msgHelper.js'

const MASTER = 'master@im.wechat'
function makeHarness() {
  const mockClient = {
    botId: 'bot-001',
    sendLog: [],
    getConfig: async () => ({ typing_ticket: 'tt-1' }),
    sendTyping: async () => {},
    sendMessage: async (p) => { mockClient.sendLog.push(p) },
    getUpdates: async () => ({ ret: 0, msgs: [], get_updates_buf: '' }),
    notifyStart: async () => {}, notifyStop: async () => {},
  }
  const baseDir = path.join(os.tmpdir(), `mio-split-${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
  const memory = new MemoryStore({ agentId: 'wechat-master', baseDir })
  const channel = new WechatChannel({ client: mockClient, memory, masterId: MASTER, typing: false })
  const userMsg = (text) => ({
    from_user_id: MASTER, message_id: Math.floor(Math.random() * 1e6), message_type: 1,
    context_token: 'CTX', item_list: [{ type: 1, text }],
  })
  return { channel, mockClient, memory, userMsg, baseDir }
}

// =============================================================
// 纯函数：splitWechatText
// =============================================================
test('splitWechatText 边界：空/纯文本/单msg', () => {
  assert.deepStrictEqual(splitWechatText(''), [])
  assert.deepStrictEqual(splitWechatText('   '), [])
  assert.deepStrictEqual(splitWechatText('你好呀'), ['你好呀'])
  assert.deepStrictEqual(splitWechatText('<msg>你好</msg>'), ['你好'])
})

test('splitWechatText：多条 <msg> 各自成段', () => {
  assert.deepStrictEqual(
    splitWechatText('<msg>第一</msg><msg>第二</msg><msg>第三</msg>'),
    ['第一', '第二', '第三'],
  )
})

test('splitWechatText：<msg> 与裸文本交错时保留裸文本段（旧实现会丢失）', () => {
  assert.deepStrictEqual(
    splitWechatText('<msg>A</msg> 补充说明 <msg>B</msg>'),
    ['A', '补充说明', 'B'],
  )
  assert.deepStrictEqual(
    splitWechatText('<msg>A</msg>中段<msg>B</msg>尾段'),
    ['A', '中段', 'B', '尾段'],
  )
})

test('splitWechatText：<break/> 系分隔符', () => {
  assert.deepStrictEqual(splitWechatText('A<break/>B<break/>C'), ['A', 'B', 'C'])
  assert.deepStrictEqual(splitWechatText('A<break></break>B'), ['A', 'B'])
  assert.deepStrictEqual(splitWechatText('<msg>A</msg><break/>B'), ['A', 'B'])
})

test('splitWechatText：残留半截标签清洗', () => {
  assert.deepStrictEqual(
    splitWechatText('开头<msg>未闭合 内容 </msg>尾巴'),
    ['开头', '未闭合 内容', '尾巴'],
  )
})

// =============================================================
// 集成链路：LLM 输出 → WechatChannel 切分 → 伪队列逐条发送
// =============================================================
test('微信分条集成：多 <msg> → 多条气泡且 create_time_ms 单调递增', async () => {
  const { channel, mockClient, memory, userMsg, baseDir } = makeHarness()
  await memory.writeSoul('你叫小助手')
  channel.llm = { process: async () => ({ text: '<msg>第一</msg><msg>第二</msg><msg>第三</msg>' }) }
  await channel._handleMessage(userMsg('a'))
  assert.deepStrictEqual(mockClient.sendLog.map(p => p.item_list?.[0]?.text), ['第一', '第二', '第三'])
  const times = mockClient.sendLog.map(p => p.create_time_ms)
  assert.ok(times.every((t, i) => i === 0 || t > times[i - 1]), 'create_time_ms 应严格单调递增')
  fs.rmSync(baseDir, { recursive: true, force: true })
})

test('微信分条集成：<break/> 与 mixed 场景保序', async () => {
  const { channel, mockClient, memory, userMsg, baseDir } = makeHarness()
  await memory.writeSoul('你叫小助手')
  channel.llm = { process: async () => ({ text: '开头<break/>中间<break/>结尾' }) }
  await channel._handleMessage(userMsg('b'))
  assert.deepStrictEqual(mockClient.sendLog.map(p => p.item_list?.[0]?.text), ['开头', '中间', '结尾'])

  mockClient.sendLog.length = 0
  channel.llm = { process: async () => ({ text: '<msg>A</msg>补充<msg>B</msg><break/>C' }) }
  await channel._handleMessage(userMsg('c'))
  assert.deepStrictEqual(mockClient.sendLog.map(p => p.item_list?.[0]?.text), ['A', '补充', 'B', 'C'])
  fs.rmSync(baseDir, { recursive: true, force: true })
})

test('微信分条集成：纯文本保持单条（不破坏原行为）', async () => {
  const { channel, mockClient, memory, userMsg, baseDir } = makeHarness()
  await memory.writeSoul('你叫小助手')
  channel.llm = { process: async () => ({ text: '普通回复内容' }) }
  await channel._handleMessage(userMsg('d'))
  assert.deepStrictEqual(mockClient.sendLog.map(p => p.item_list?.[0]?.text), ['普通回复内容'])
  assert.strictEqual(mockClient.sendLog.length, 1)
  fs.rmSync(baseDir, { recursive: true, force: true })
})

// 每个测试结束后已自行清理对应临时目录