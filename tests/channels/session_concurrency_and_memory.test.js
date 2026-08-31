import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { BaseChannel } from '../../channels/common/BaseChannel.js'
import { MemoryStore } from '../../channels/memory/MemoryStore.js'
import streamCache from '../../lib/server/socket.io/services/streamCache.js'

const TEST_DIR = path.join(process.cwd(), 'tests-data', 'test-concurrency-' + Date.now())

test.before(async () => {
  await fs.promises.mkdir(TEST_DIR, { recursive: true })
})

test.after(async () => {
  await fs.promises.rm(TEST_DIR, { recursive: true, force: true })
})

test('MemoryStore pending memories: 缓冲记录与归档清空', async () => {
  const memory = new MemoryStore({ agentId: 'test-agent', baseDir: TEST_DIR })
  await memory.ensure()
  const session = await memory.createSession({ title: '测试会话' })

  // 1. 初始应无 pending 记忆
  const initial = await memory.getPendingMemories(session.id)
  assert.deepEqual(initial, [])

  // 2. 追加 pending 记忆
  await memory.appendPendingMemory(session.id, {
    action: 'add',
    zone: 'behavioral_guidelines',
    content: '永远使用 Vue 3 Composition API',
  })
  await memory.appendPendingMemory(session.id, {
    action: 'add',
    zone: 'long_term_profile',
    content: '用户偏好深色模式',
  })

  const list = await memory.getPendingMemories(session.id)
  assert.equal(list.length, 2)
  assert.equal(list[0].zone, 'behavioral_guidelines')
  assert.equal(list[1].zone, 'long_term_profile')

  // 3. 归档清空
  await memory.clearPendingMemories(session.id)
  const afterClear = await memory.getPendingMemories(session.id)
  assert.deepEqual(afterClear, [])
})

test('BaseChannel Session FIFO Queue: 确保同一 Session 主会话严格串行执行', async () => {
  const memory = new MemoryStore({ agentId: 'test-agent-queue', baseDir: TEST_DIR })
  await memory.ensure()
  const session = await memory.createSession({ title: '串行队列测试' })

  const executionOrder = []
  let activeExecutionCount = 0
  let maxConcurrentExecutions = 0

  const mockLlm = {
    process: async ({ text }) => {
      activeExecutionCount++
      maxConcurrentExecutions = Math.max(maxConcurrentExecutions, activeExecutionCount)
      await new Promise(r => setTimeout(r, 50))
      executionOrder.push(text)
      activeExecutionCount--
      return { text: `Reply to: ${text}` }
    }
  }

  const channel = new BaseChannel({
    client: { botId: 'bot1', send: () => {} },
    memory,
    masterId: 'master1',
    llm: mockLlm,
  })

  // 并发派发 3 个主任务（来自 Cron/Trigger/Web）
  const p1 = channel.appendUserMessage(session.id, 'Task 1')
  const p2 = channel.appendUserMessage(session.id, 'Task 2')
  const p3 = channel.appendUserMessage(session.id, 'Task 3')

  await Promise.all([p1, p2, p3])

  // 验证最大并发数严格为 1，且执行顺序严格为 Task 1 -> Task 2 -> Task 3
  assert.equal(maxConcurrentExecutions, 1, '同一 session 主任务必须严格串行')
  assert.deepEqual(executionOrder, ['Task 1', 'Task 2', 'Task 3'])
})

test('streamCache fallback: 管理员连接未命中独立 client.id 时能够回退获取 admin 渠道镜像', async () => {
  const contactorId = 'wechat-master-test'
  const messageId = 'msg_' + Date.now()

  // 1. Channel 任务写入 admin 缓存
  streamCache.push('admin', contactorId, messageId, {
    type: 'reason',
    data: { text: '正在深入思考中...', startTime: Date.now(), duration: 0 }
  }, { contactorId, isTask: true, messageId })

  streamCache.push('admin', contactorId, messageId, {
    type: 'content',
    content: '任务第一阶段执行完毕'
  }, { contactorId, isTask: true, messageId })

  // 2. 模拟新打开 Web 客户端（client.id 是动态数字，如 1185765085）
  const dynamicClientId = '1185765085'
  const cachedList = streamCache.snapshot(dynamicClientId, contactorId)
  assert.equal(cachedList.length, 1, '新客户端直接通过 fallback 命中 admin 渠道镜像')
  assert.equal(cachedList[0].chunks.length, 2, '包含完整的思考链与文本块')
  assert.equal(cachedList[0].chunks[0].type, 'reason')
  assert.equal(cachedList[0].chunks[1].type, 'content')
})
