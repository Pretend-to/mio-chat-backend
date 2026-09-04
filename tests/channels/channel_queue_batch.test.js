import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { MemoryStore } from '../../channels/memory/index.js'
import { BaseChannel } from '../../channels/common/BaseChannel.js'

class TestMockChannel extends BaseChannel {
  constructor(opts) {
    super({
      ...opts,
      channelType: 'test_channel',
    })
    this.sentPackets = []
    this.typingLog = []
  }

  extractText(msg) {
    return msg.text || ''
  }

  buildSendMsg({ to, text, contextToken }) {
    return { contextToken, text, to }
  }

  async doSendMessage(payload) {
    this.sentPackets.push(payload)
    return { ok: true }
  }

  async doSendTyping(ctx, status) {
    this.typingLog.push({ from: ctx.from, sid: ctx.sid, status })
  }

  async doSendImage() {}
  async doSendVoice() {}
}

test('BaseChannel: 队列排位反馈、任务批次合并与 /btw 旁路插话', async () => {
  const MASTER = 'master@user.im'
  const baseDir = path.join(os.tmpdir(), `mio-queue-test-${Date.now()}`)
  const memory = new MemoryStore({ agentId: 'test-agent', baseDir })
  await memory.writeSoul('我是测试助理')

  let runningTaskResolver = null
  const processedPrompts = []

  const mockLLM = {
    process: async (ctx) => {
      processedPrompts.push(ctx.text)
      if (ctx.sessionId?.startsWith('transient_')) {
        return { text: '这是旁路即时插话回复：任务正在稳步进行中' }
      }
      if (ctx.text.includes('慢速任务A')) {
        await new Promise((resolve) => {
          runningTaskResolver = resolve
        })
        return { text: '任务A已完成' }
      }
      return { text: `已回复: ${ctx.text}` }
    },
  }

  const channel = new TestMockChannel({
    client: { botId: 'bot-1' },
    debounceEnabled: false, // 本测试直接验证队列与批处理，防抖有独立子测试
    llm: mockLLM,
    masterId: MASTER,
    memory,
  })

  // 1. 发起慢速任务 A
  const promiseA = channel._route('慢速任务A', {
    from: MASTER,
    messageId: 'msg_a',
  })

  // 稍作等待确保任务 A 已启动并持有主锁
  await new Promise((r) => setTimeout(r, 20))
  const sid = await memory.getActiveSession()
  assert.ok(channel._sessionLocks.has(sid), '任务 A 应持有会话锁')
  assert.ok(channel.activeJobs.has(sid), '会话应处于繁忙活跃状态')

  // 2. 发送任务 B -> 应进入队列，下发 [1/1] 排位反馈
  const promiseB = channel._route('任务B：查一下明天天气', {
    from: MASTER,
    messageId: 'msg_b',
  })
  await new Promise((r) => setTimeout(r, 20))

  const feedback1 = channel.sentPackets.find((p) => p.text.includes('[1/1]'))
  assert.ok(feedback1, '应收到排位 [1/1] 的即时反馈')
  assert.ok(feedback1.text.includes('当前有任务正在全力处理中'))

  // 3. 发送任务 C -> 应进入队列，下发 [2/2] 排位反馈
  const promiseC = channel._route('任务C：查一下周五机票', {
    from: MASTER,
    messageId: 'msg_c',
  })
  await new Promise((r) => setTimeout(r, 20))

  const feedback2 = channel.sentPackets.find((p) => p.text.includes('[2/2]'))
  assert.ok(feedback2, '应收到排位 [2/2] 的即时反馈')

  // 4. 发送 /btw 旁路插话 -> 应该不排队、不占主锁，立即获得响应
  await channel._route('/btw 还要多久呀', {
    from: MASTER,
    messageId: 'msg_btw',
  })
  assert.ok(
    channel.sentPackets.some((p) => p.text.includes('这是旁路即时插话回复')),
    '/btw 应触发旁路瞬态回复',
  )

  // 5. 释放慢速任务 A
  runningTaskResolver()
  await promiseA

  // 等待后续合并批次处理完成
  await Promise.all([promiseB, promiseC])

  // 6. 验证任务合并与通知
  const mergeNotice = channel.sentPackets.find((p) =>
    p.text.includes('检测到当前队列中有 2 个待处理任务，开始合并处理'),
  )
  assert.ok(mergeNotice, '应收到合并处理通知气泡')

  // 验证合并后的提示词同时包含了任务 B 和任务 C
  const mergedPrompt = processedPrompts.find((p) =>
    p.includes('共收到了以下 2 条待处理内容'),
  )
  assert.ok(mergedPrompt, 'LLM 应该收到合并拼装的提示词')
  assert.ok(mergedPrompt.includes('任务B：查一下明天天气'))
  assert.ok(mergedPrompt.includes('任务C：查一下周五机票'))

  // 7. 验证全部完成后，锁已释放
  assert.equal(channel._sessionLocks.has(sid), false, '全部完成后会话锁应释放')
  assert.equal(
    channel.activeJobs.has(sid),
    false,
    '全部完成后 activeJobs 应清空',
  )
})

test('BaseChannel: 渠道通用入站大防抖 (5s 文本 / 10s 富媒体)', async () => {
  const MASTER = 'master@user.im'
  const baseDir = path.join(os.tmpdir(), `mio-debounce-test-${Date.now()}`)
  const memory = new MemoryStore({ agentId: 'test-agent', baseDir })

  const routedMessages = []
  const mockLLM = {
    process: async (ctx) => {
      routedMessages.push(ctx)
      return { text: 'ok' }
    },
  }

  const channel = new TestMockChannel({
    client: { botId: 'bot-1' },
    debounceConfig: {
      mediaMs: 150, // 测试中缩短时间验证逻辑
      textMs: 80,
    },
    debounceEnabled: true,
    llm: mockLLM,
    masterId: MASTER,
    memory,
  })

  // 1. 连续快速发送 2 条文本 -> 应该在防抖窗口内合并为 1 条
  channel.enqueueInboundDebounce(MASTER, { text: '在吗？' })
  await new Promise((r) => setTimeout(r, 20))
  channel.enqueueInboundDebounce(MASTER, { text: '帮我查一下BTC价格' })

  // 等待 100ms（超过 80ms 纯文本防抖时间）
  await new Promise((r) => setTimeout(r, 120))
  assert.equal(routedMessages.length, 1, '两次文本输入应合并为一次路由')
  assert.ok(routedMessages[0].text.includes('在吗？'))
  assert.ok(routedMessages[0].text.includes('帮我查一下BTC价格'))

  // 2. 发送富媒体（图片） -> 自动触发更长的媒体防抖窗口
  routedMessages.length = 0
  channel.enqueueInboundDebounce(MASTER, { text: '分析这张图' })
  await new Promise((r) => setTimeout(r, 30))
  channel.enqueueInboundDebounce(MASTER, {
    hasMedia: true,
    images: ['https://example.com/photo.png'],
    text: '',
  })

  // 90ms 时（超过了纯文本的 80ms，但仍在富媒体的 150ms 内）
  await new Promise((r) => setTimeout(r, 60))
  assert.equal(
    routedMessages.length,
    0,
    '收到富媒体后防抖窗口应延长至 mediaMs，90ms 不应提前触发',
  )

  // 等待总耗时超过 150ms
  await new Promise((r) => setTimeout(r, 100))
  assert.equal(routedMessages.length, 1, '媒体防抖窗口闭合后应成功路由')
  assert.equal(routedMessages[0].images.length, 1)
  assert.equal(routedMessages[0].images[0], 'https://example.com/photo.png')
})

test('BaseChannel: 渠道无关 typing 状态：防抖中即时反馈、任务运行/排队期间全程维持、全任务收尾后熄灭', async () => {
  const MASTER = 'master@user.im'
  const baseDir = path.join(os.tmpdir(), `mio-typing-test-${Date.now()}`)
  const memory = new MemoryStore({ agentId: 'test-agent', baseDir })
  const session = await memory.createSession({ title: 'Typing测试' })
  await memory.setActiveSession(session.id)
  const sid = session.id

  let taskResolver = null
  const mockLLM = {
    process: async (ctx) => {
      if (ctx.text.includes('慢速长任务')) {
        await new Promise((resolve) => {
          taskResolver = resolve
        })
      }
      return { text: `回复: ${ctx.text}` }
    },
  }

  const channel = new TestMockChannel({
    client: { botId: 'bot-1' },
    debounceConfig: {
      mediaMs: 300,
      textMs: 150,
    },
    debounceEnabled: true,
    llm: mockLLM,
    masterId: MASTER,
    memory,
  })

  // 1. 发送入站防抖消息（尚未到 150ms，未实际开始跑任务）
  const p1 = channel.enqueueInboundDebounce(MASTER, { text: '你好呀' })

  // 立即检查：虽然在防抖缓冲中、任务尚未真正运行，但必须立刻收到正在输入反馈 (status=1)
  await new Promise((r) => setTimeout(r, 20))
  assert.ok(
    channel.typingLog.some((t) => t.status === 1),
    '在防抖进程中必须立即触发 typing=1 正在输入反馈',
  )
  assert.equal(
    channel.isSessionBusy(sid, { from: MASTER }),
    true,
    '防抖缓冲期间会话应处于繁忙状态',
  )

  // 等待第一条防抖消息自然执行完成，此时应收到首个 status=2
  await p1
  const baselineStatus2Count = channel.typingLog.filter(
    (t) => t.status === 2,
  ).length
  assert.equal(baselineStatus2Count, 1, '首条消息独立执行完后应发送 status=2')

  // 2. 发起慢速长任务并持有主锁
  const pSlow = channel.enqueueInboundDebounce(MASTER, {
    immediate: true,
    text: '慢速长任务',
  })
  await new Promise((r) => setTimeout(r, 30))
  assert.equal(
    channel.isSessionBusy(sid, { from: MASTER }),
    true,
    '任务执行期间会话必须处于繁忙状态',
  )

  // 3. 在慢速长任务处理期间，再来排队任务
  const p2 = channel._route('排队任务2', { from: MASTER, sid })
  const p3 = channel._route('排队任务3', { from: MASTER, sid })
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(
    channel._sessionWaitingQueues.get(sid)?.length,
    2,
    '任务2和3应进入排队等待队列',
  )

  // 验证在长任务与排队任务交替期间，绝不能提前熄灭 typing（status=2 计数不应增加）
  const currentStatus2Count = channel.typingLog.filter(
    (t) => t.status === 2,
  ).length
  assert.equal(
    currentStatus2Count,
    baselineStatus2Count,
    '队列中有未处理完毕任务时，严禁提前发送 status=2 熄灭正在输入状态',
  )

  // 4. 释放长任务，让后续合并批次执行完毕
  taskResolver()
  await pSlow
  await Promise.all([p2, p3])

  // 5. 验证全部任务执行完毕后，最终熄灭 typing (status=2) 且会话不再繁忙
  assert.equal(
    channel.isSessionBusy(sid, { from: MASTER }),
    false,
    '所有任务处理完毕后，会话繁忙状态应解除',
  )
  assert.equal(
    channel.typingLog.filter((t) => t.status === 2).length,
    baselineStatus2Count + 1,
    '全部任务收尾后必须发送 status=2 恢复空闲',
  )
})
