import { test } from 'node:test'
import assert from 'node:assert'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { MemoryStore } from '../../channels/memory/index.js'
import { WechatChannel } from '../../channels/wechat/WechatChannel.js'
import { splitWechatText } from '../../channels/wechat/msgHelper.js'

const MASTER = 'master@im.wechat'
function makeHarness(opts = {}) {
  const mockClient = {
    botId: 'bot-001',
    sendLog: [],
    getConfig: async () => ({ typing_ticket: 'tt-1' }),
    sendTyping: async () => {},
    sendMessage: async (p) => {
      mockClient.sendLog.push(p)
    },
    getUpdates: async () => ({ ret: 0, msgs: [], get_updates_buf: '' }),
    notifyStart: async () => {},
    notifyStop: async () => {},
    downloadAndDecryptMedia: async () => Buffer.from('mock-decrypted'),
  }
  const baseDir = path.join(
    os.tmpdir(),
    `mio-split-${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  )
  const memory = new MemoryStore({ agentId: 'wechat-master', baseDir })
  const channel = new WechatChannel({
    client: mockClient,
    memory,
    masterId: MASTER,
    typing: false,
    ...opts,
  })
  const userMsg = (text, isImage = false, fileInfo = null) => {
    let item
    if (fileInfo) {
      item = {
        type: 4,
        file_item: {
          media: { full_url: 'http://cdn/doc', aes_key: 'key' },
          file_name: fileInfo.name || 'test.pdf',
        },
      }
    } else if (isImage) {
      item = {
        type: 2,
        image_item: { media: { full_url: 'http://cdn/1', aes_key: 'key' } },
      }
    } else {
      item = { type: 1, text, text_item: { text } }
    }
    return {
      from_user_id: MASTER,
      message_id: Math.floor(Math.random() * 1e6),
      message_type: 1,
      context_token: 'CTX',
      item_list: [item],
    }
  }
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
  assert.deepStrictEqual(splitWechatText('<msg>A</msg>中段<msg>B</msg>尾段'), [
    'A',
    '中段',
    'B',
    '尾段',
  ])
})

test('splitWechatText：<break/> 系分隔符', () => {
  assert.deepStrictEqual(splitWechatText('A<break/>B<break/>C'), [
    'A',
    'B',
    'C',
  ])
  assert.deepStrictEqual(splitWechatText('A<break></break>B'), ['A', 'B'])
  assert.deepStrictEqual(splitWechatText('<msg>A</msg><break/>B'), ['A', 'B'])
})

test('splitWechatText：残留半截标签清洗', () => {
  assert.deepStrictEqual(splitWechatText('开头<msg>未闭合 内容 </msg>尾巴'), [
    '开头',
    '未闭合 内容',
    '尾巴',
  ])
})

// =============================================================
// 集成链路：LLM 输出 → WechatChannel 切分 → 伪队列逐条发送
// =============================================================
test('微信分条集成：多 <msg> → 多条气泡且 create_time_ms 单调递增', async () => {
  const { channel, mockClient, memory, userMsg, baseDir } = makeHarness()
  await memory.writeSoul('你叫小助手')
  channel.llm = {
    process: async () => ({
      text: '<msg>第一</msg><msg>第二</msg><msg>第三</msg>',
    }),
  }
  await channel._handleMessage(userMsg('a'))
  assert.deepStrictEqual(
    mockClient.sendLog.map((p) => p.item_list?.[0]?.text),
    ['第一', '第二', '第三'],
  )
  const times = mockClient.sendLog.map((p) => p.create_time_ms)
  assert.ok(
    times.every((t, i) => i === 0 || t > times[i - 1]),
    'create_time_ms 应严格单调递增',
  )
  fs.rmSync(baseDir, { recursive: true, force: true })
})

test('微信分条集成：<break/> 与 mixed 场景保序', async () => {
  const { channel, mockClient, memory, userMsg, baseDir } = makeHarness()
  await memory.writeSoul('你叫小助手')
  channel.llm = {
    process: async () => ({ text: '开头<break/>中间<break/>结尾' }),
  }
  await channel._handleMessage(userMsg('b'))
  assert.deepStrictEqual(
    mockClient.sendLog.map((p) => p.item_list?.[0]?.text),
    ['开头', '中间', '结尾'],
  )

  mockClient.sendLog.length = 0
  channel.llm = {
    process: async () => ({ text: '<msg>A</msg>补充<msg>B</msg><break/>C' }),
  }
  await channel._handleMessage(userMsg('c'))
  assert.deepStrictEqual(
    mockClient.sendLog.map((p) => p.item_list?.[0]?.text),
    ['A', '补充', 'B', 'C'],
  )
  fs.rmSync(baseDir, { recursive: true, force: true })
})

test('微信分条集成：纯文本保持单条（不破坏原行为）', async () => {
  const { channel, mockClient, memory, userMsg, baseDir } = makeHarness()
  await memory.writeSoul('你叫小助手')
  channel.llm = { process: async () => ({ text: '普通回复内容' }) }
  await channel._handleMessage(userMsg('d'))
  assert.deepStrictEqual(
    mockClient.sendLog.map((p) => p.item_list?.[0]?.text),
    ['普通回复内容'],
  )
  assert.strictEqual(mockClient.sendLog.length, 1)
  fs.rmSync(baseDir, { recursive: true, force: true })
})

test('微信分条集成：流式交错多阶段输出（文字 -> 工具执行 -> 最终文字）分条且顺序正确', async () => {
  const { channel, mockClient, memory, userMsg, baseDir } = makeHarness()
  await memory.writeSoul('你叫小助手')
  channel.llm = {
    process: async (ctx) => {
      // 阶段 1：工具调用前进度文字（包含多条 <msg>）
      await ctx.onEmitTextBlock(
        '<msg>收到，正在为你检索中～</msg><msg>已连接服务节点</msg>',
      )
      // 模拟工具耗时
      await new Promise((r) => setTimeout(r, 20))
      // 阶段 2：工具执行后最终文字
      await ctx.onEmitTextBlock(
        '<msg>查询完毕！</msg>这是详细结果<break/>请确认～',
      )
      return { completed: true }
    },
  }
  await channel._handleMessage(userMsg('查天气'))

  const sentTexts = mockClient.sendLog.map((p) => p.item_list?.[0]?.text)
  assert.deepStrictEqual(sentTexts, [
    '收到，正在为你检索中～',
    '已连接服务节点',
    '查询完毕！',
    '这是详细结果',
    '请确认～',
  ])

  const times = mockClient.sendLog.map((p) => p.create_time_ms)
  assert.strictEqual(times.length, 5)
  assert.ok(
    times.every((t, i) => i === 0 || t > times[i - 1]),
    '时序必须单调递增',
  )

  fs.rmSync(baseDir, { recursive: true, force: true })
})

test('微信分条集成：多图连发与图文防抖聚合测试', async () => {
  const { channel, mockClient, memory, userMsg, baseDir } = makeHarness({
    debounceConfig: { mediaMs: 300, textMs: 150 },
    debounceEnabled: true,
  })
  await memory.writeSoul('你叫小助手')

  const processedCtxs = []
  channel.llm = {
    process: async (ctx) => {
      processedCtxs.push(ctx)
      return { text: '已收到图片' }
    },
  }

  // Mock 实例级本地图片转存，避免真实 S3 初始化与上传
  channel.bufferToImageUrl = async (buf) =>
    `/f/up/image/mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.png`

  // 模拟微信连续推送（并发触发，不加 await，防止冷启动下载解密耗时拉长发送间隔）
  channel._handleMessage(userMsg('', true)) // 图片 1
  await new Promise((r) => setTimeout(r, 50))
  channel._handleMessage(userMsg('', true)) // 图片 2
  await new Promise((r) => setTimeout(r, 50))
  channel._handleMessage(userMsg('帮我看看')) // 文本

  // 等待防抖定时器触发并执行完成
  await new Promise((r) => setTimeout(r, 600))

  // 验证大模型仅被调用 1 次
  assert.strictEqual(processedCtxs.length, 1)
  const ctx = processedCtxs[0]

  // 验证合并后的文本与图片列表正确
  assert.strictEqual(ctx.text, '帮我看看')
  assert.ok(Array.isArray(ctx.images))
  assert.strictEqual(ctx.images.length, 2)
  assert.ok(ctx.images.every((url) => url.includes('/f/up/image/')))

  // 验证历史落盘中包含了 Markdown 格式的图片
  const sid = await memory.getActiveSession()
  const chat = await memory.getChat(sid)
  const userChatLog = chat.find((item) => item.role === 'user')
  assert.ok(userChatLog.text.includes('帮我看看'))
  assert.ok(userChatLog.text.includes('![图片]'))

  fs.rmSync(baseDir, { recursive: true, force: true })
})

test('微信分条集成：文件上传解密与防抖聚合（附带文件 Markdown 链接供 parse 工具消费）', async () => {
  const { channel, mockClient, memory, userMsg, baseDir } = makeHarness({
    debounceConfig: { mediaMs: 300, textMs: 150 },
    debounceEnabled: true,
  })
  await memory.writeSoul('你叫小助手')

  const processedCtxs = []
  channel.llm = {
    process: async (ctx) => {
      processedCtxs.push(ctx)
      return { text: '已收到文件并解析' }
    },
  }

  // Mock 文件上传转存
  channel.uploadFile = async (buf, name) => `/f/up/file/mock_${name}`

  // 模拟发送：文件 (PDF) + 文本 "请帮我提取摘要"
  channel._handleMessage(userMsg('', false, { name: '简历.pdf' }))
  await new Promise((r) => setTimeout(r, 50))
  channel._handleMessage(userMsg('请帮我提取摘要'))

  // 等待防抖定时器触发
  await new Promise((r) => setTimeout(r, 600))

  assert.strictEqual(processedCtxs.length, 1)
  const ctx = processedCtxs[0]

  // 验证文本中包含用户的要求以及自动挂载的 [文件: 简历.pdf](/f/up/file/mock_简历.pdf)
  assert.ok(ctx.text.includes('请帮我提取摘要'))
  assert.ok(ctx.text.includes('[文件: 简历.pdf](/f/up/file/mock_简历.pdf)'))

  fs.rmSync(baseDir, { recursive: true, force: true })
})
