import { test } from 'node:test'
import assert from 'node:assert'

// channel.js 依赖链（lib/config.js 等）顶层引用全局 logger，独立运行需注入 stub
// 全局 stub，避免静默吞掉被测代码里的日志调用
if (!globalThis.logger) {
  globalThis.logger = {
    debug: (...args) => console.log('[debug]', ...args),
    info: (...args) => console.log('[info]', ...args),
    warn: (...args) => console.warn('[warn]', ...args),
    error: (...args) => console.error('[error]', ...args),
  }
}

const { buildChannelHistory } = await import(
  '../../lib/server/socket.io/controllers/channel.js'
)

const CTX = { sessionId: 's1', channel: { name: '测试渠道', avatar: 'a.png' } }

/**
 * 构造模拟 chat：total 条消息，其中末尾 realCount 条带真实时间戳（模拟旧版
 * 存量数据无 time/id、新数据有 time 的真实分布，如 wechat-master 175 条会话）
 */
function buildChat(total, realCount = 21) {
  const firstReal = total - realCount
  return Array.from({ length: total }, (_, i) => ({
    content: [{ data: { text: `msg${i}` }, type: 'text' }],
    role: i % 2 ? 'assistant' : 'user',
    ...(i >= firstReal ? { time: 1787986000000 + (i - firstReal) * 60000 } : {}),
  }))
}

test('首屏：返回最近 limit 条，hasMore/total 正确', () => {
  const chat = buildChat(175)
  const r = buildChannelHistory(chat, { limit: 20 }, CTX)
  assert.strictEqual(r.messages.length, 20)
  assert.strictEqual(r.total, 175)
  assert.strictEqual(r.hasMore, true)
  // 返回的是"最近 20 条"：最后一条对应 chat[174]
  assert.ok(r.messages[r.messages.length - 1].id.includes('_174_'))
})

test('时间戳稳定：两次请求生成的 time/id 完全一致', () => {
  const chat = buildChat(175)
  const r1 = buildChannelHistory(chat, { limit: 20 }, CTX)
  const r2 = buildChannelHistory(chat, { limit: 20 }, CTX)
  assert.deepStrictEqual(
    r1.messages.map((m) => [m.id, m.time]),
    r2.messages.map((m) => [m.id, m.time]),
  )
})

test('翻页：before 游标命中已加载最早消息位置，页间无重叠', () => {
  const chat = buildChat(175)
  const page1 = buildChannelHistory(chat, { limit: 20 }, CTX)
  const before = page1.messages[0].time
  const page2 = buildChannelHistory(chat, { limit: 20, before }, CTX)

  const ids1 = new Set(page1.messages.map((m) => m.id))
  const ids2 = new Set(page2.messages.map((m) => m.id))
  for (const id of ids2) {
    assert.ok(!ids1.has(id), `翻页与首屏重叠: ${id}`)
  }
  assert.strictEqual(page2.messages.length, 20)
  assert.strictEqual(page2.hasMore, true)
  // page2 最早消息的 index 应为 135（175 - 20*2）
  assert.ok(page2.messages[0].id.includes('_135_'))
})

test('翻页到底：全部页拼接后覆盖全量且无重复', () => {
  const chat = buildChat(175)
  const seen = new Set()
  let before = null
  let rounds = 0
  for (;;) {
    const r = buildChannelHistory(chat, { limit: 20, before }, CTX)
    r.messages.forEach((m) => seen.add(m.id))
    rounds++
    if (!r.hasMore) {break}
    before = r.messages[0].time
    assert.ok(rounds < 20, '翻页未在合理轮数内收敛')
  }
  assert.strictEqual(seen.size, 175)
  assert.strictEqual(rounds, 9) // ceil(175/20)
})

test('拼接后时间随内容顺序严格递增', () => {
  const chat = buildChat(175)
  const pages = []
  for (let before = null; ;) {
    const r = buildChannelHistory(chat, { limit: 20, before }, CTX)
    pages.push(r.messages.map((m) => m.time))
    if (!r.hasMore) {break}
    before = r.messages[0].time
  }
  // 各页页内本就旧→新；只需把页序反转（最旧页在前）即得内容顺序的全序列
  const ordered = pages.toReversed().flat()
  for (let i = 1; i < ordered.length; i++) {
    assert.ok(ordered[i] > ordered[i - 1], `时间乱序: idx ${i}`)
  }
})

test('锚点稳定：追加新消息不影响已返回消息的 time/id', () => {
  const chat = buildChat(175)
  const before1 = buildChannelHistory(chat, { limit: 20 }, CTX).messages.map((m) => [m.id, m.time])
  // 渠道收到 5 条新消息（带更大真实时间戳）
  chat.push(
    ...Array.from({ length: 5 }, (_, i) => ({
      content: [{ data: { text: `new${i}` }, type: 'text' }],
      role: 'user',
      time: 1787990000000 + i,
    })),
  )
  const after2 = buildChannelHistory(chat, { limit: 20 }, CTX).messages.map((m) => [m.id, m.time])
  const map1 = new Map(before1)
  for (const [id, time] of after2) {
    if (map1.has(id)) {
      assert.strictEqual(map1.get(id), time, `已有消息 time 被扰动: ${id}`)
    }
  }
  // 新首屏应包含新追加的 5 条
  const ids2 = new Set(after2.map(([id]) => id))
  assert.strictEqual(ids2.size, 20)
})

test('健壮性：空会话 / 字符串 limit / 非法 before', () => {
  const empty = buildChannelHistory([], {}, CTX)
  assert.deepStrictEqual(empty, { messages: [], hasMore: false, total: 0 })

  const chat = buildChat(50)
  const r1 = buildChannelHistory(chat, { limit: '10' }, CTX)
  assert.strictEqual(r1.messages.length, 10)

  const r2 = buildChannelHistory(chat, { before: 'not-a-number' }, CTX)
  assert.strictEqual(r2.messages.length, 20) // 非法 before 忽略，等同首屏
})

test('全无时间戳的会话仍可翻页（fallback 锚点）', () => {
  const chat = Array.from({ length: 45 }, (_, i) => ({
    content: [{ data: { text: `m${i}` }, type: 'text' }],
    role: 'user',
  }))
  const seen = new Set()
  let before = null
  for (;;) {
    const r = buildChannelHistory(chat, { limit: 20, before }, CTX)
    r.messages.forEach((m) => seen.add(m.id))
    if (!r.hasMore) {break}
    before = r.messages[0].time
  }
  assert.strictEqual(seen.size, 45)
})
