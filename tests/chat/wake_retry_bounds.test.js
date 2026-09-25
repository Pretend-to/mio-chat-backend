/**
 * Phase 3：唤醒工作项的重试必须有界（收敛计划 P2-1 / P2-2）。
 *
 * 修复前：
 *   - `SessionWorkItem.attempts` 只增不读，全代码库没有消费点
 *   - `_drainSession` 遇错/未决一律 `deferred + 1000ms` 重来，没有次数上限
 *
 * 修复后契约：
 *   1. 真实失败 / runner 无故早退：按注入的 `wakeRetryDelays` 退避，
 *      总尝试次数 = 数组长度 + 1，超限进 `needs_attention` 并记录原因
 *   2. 「目标会话正忙」（session_busy / session_lease_lost）**不消耗预算**：
 *      租约 TTL 会自愈，忙就继续等，不能把排队错杀成失败
 *      （否则等于推翻 Phase 1 修的排队语义）
 *
 * 用 stub coordinator 而非 prisma：本用例要验的是调度策略，
 * 不是持久化；延迟数组注入为 [0,0] 让预算在毫秒级耗尽。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { ChatEventDispatcher } from '../../lib/chat/llm/events/ChatEventDispatcher.js'

function createStubCoordinator() {
  const item = {
    agentId: 'agent-1',
    attempts: 0,
    availableAt: new Date(),
    conversationKey: 'agent:agent-1:session:s1',
    id: 'work-1',
    sessionId: 's1',
    status: 'queued',
    lastError: null,
  }
  const transitions = []
  return {
    item,
    transitions,
    async getWorkItem(id) {
      return id === item.id ? item : null
    },
    async listOpenWorkItems() {
      return ['accepted', 'queued', 'deferred'].includes(item.status)
        ? [item]
        : []
    },
    async markWorkItemStatus(id, status, details = {}) {
      // 与 SessionWorkCoordinator 一致：进入 running 时 attempts +1
      if (status === 'running') item.attempts += 1
      item.status = status
      if (details.availableAt) item.availableAt = new Date(details.availableAt)
      item.lastError = details.error ?? null
      transitions.push({ details, status })
      return item
    },
    onWorkItemStatus() {
      return () => {}
    },
  }
}

async function waitFor(predicate, { timeoutMs = 4000 } = {}) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) return true
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  return false
}

test('唤醒工作项连续失败达到预算后进入 needs_attention，而不是无限重试', async () => {
  const coordinator = createStubCoordinator()
  const dispatcher = new ChatEventDispatcher({
    coordinator,
    wakeRetryDelays: [0, 0],
  })
  let runs = 0
  dispatcher.registerWakeRunner(async (workItem) => {
    runs += 1
    await coordinator.markWorkItemStatus(workItem.id, 'running')
    throw new Error('boom')
  })

  dispatcher.requestDrain({ agentId: 'agent-1', sessionId: 's1' })
  const settled = await waitFor(
    () => coordinator.item.status === 'needs_attention',
  )

  assert.ok(
    settled,
    `期望进入 needs_attention，实际停留在 ${coordinator.item.status}`,
  )
  assert.equal(runs, 3, '总尝试次数应当等于 wakeRetryDelays.length + 1')
  assert.equal(coordinator.item.attempts, 3)
  assert.match(coordinator.item.lastError, /giving up/)
  assert.equal(
    coordinator.transitions.filter((t) => t.status === 'needs_attention').length,
    1,
    '只应判定一次，不得重复收口',
  )
})

test('session_busy 不消耗重试预算：忙就继续等，不得判定为失败', async () => {
  const coordinator = createStubCoordinator()
  const dispatcher = new ChatEventDispatcher({
    coordinator,
    wakeRetryDelays: [0],
  })
  let runs = 0
  dispatcher.registerWakeRunner(async (workItem) => {
    runs += 1
    await coordinator.markWorkItemStatus(workItem.id, 'running')
    const error = new Error('Session s1 already has an active writer')
    error.code = 'session_busy'
    throw error
  })

  dispatcher.requestDrain({ agentId: 'agent-1', sessionId: 's1' })
  const retriedPastBudget = await waitFor(
    () => runs > dispatcher.maxWakeAttempts,
  )

  assert.ok(
    retriedPastBudget,
    `忙时必须持续重试，实际只跑了 ${runs} 次（预算 ${dispatcher.maxWakeAttempts}）`,
  )
  assert.equal(
    coordinator.item.status,
    'deferred',
    '忙只能延期等待，绝不能进 needs_attention（那是把排队错杀成失败）',
  )
  assert.ok(
    coordinator.item.attempts > dispatcher.maxWakeAttempts,
    '本次 attempts 已越过预算，正好证明预算没有把“忙”算进去',
  )
})

test('成功完成的工作项不会被重试', async () => {
  const coordinator = createStubCoordinator()
  const dispatcher = new ChatEventDispatcher({
    coordinator,
    wakeRetryDelays: [0, 0],
  })
  let runs = 0
  dispatcher.registerWakeRunner(async (workItem) => {
    runs += 1
    await coordinator.markWorkItemStatus(workItem.id, 'running')
    await coordinator.markWorkItemStatus(workItem.id, 'completed')
  })

  dispatcher.requestDrain({ agentId: 'agent-1', sessionId: 's1' })
  const settled = await waitFor(
    () => coordinator.item.status === 'completed',
  )

  assert.ok(settled, '应当正常完成')
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(runs, 1, '成功路径不得触发任何重试')
  assert.equal(coordinator.item.status, 'completed')
})
