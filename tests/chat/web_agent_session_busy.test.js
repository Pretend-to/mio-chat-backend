/**
 * P0-1：Web Agent 入口在租约被占用时的行为。
 *
 * 背景（详见 docs/architecture/session-work-injection-convergence-plan.md）：
 * Web 有两层含义，对应两个 socket 协议：
 *   - `llm_message`   = 纯前端 Web，历史由前端持有，服务端不落 Session，不取租约
 *   - `agent_message` = Web → 服务端持久化 Agent，经 SessionTurnService.runTurn
 *                       取得 SessionWorkLease（下称 B2）
 *
 * 缺陷（Phase 1 前）：B2 抢不到租约时，runTurn 把
 * SessionWorkError('session_busy') 一路抛到 controllers/agent.js 的 .catch()，
 * 那里会给客户端发一个 failed 帧 —— 用户看到「发送失败」。
 * 复现证据（基线 tag pre-convergence-20260924）：actual: 'session_busy'。
 *
 * 修复后契约（收敛计划不变量 I4）：交互式入口（waitMs > 0）在租约被占用时
 * 按到达顺序排队等待，超时才失败；非交互式入口（waitMs 默认 0）语义不变。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

import { SessionTurnService } from '../../lib/chat/sessions/SessionTurnService.js'
import { SessionWorkCoordinator } from '../../lib/chat/sessions/SessionWorkCoordinator.js'

const id = (prefix) => `${prefix}_${crypto.randomUUID()}`

async function fixture(t) {
  const databasePath = `/tmp/mio-session-busy-${process.pid}-${crypto.randomUUID()}.db`
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
  t.after(async () => {
    await prisma.$disconnect()
    await fs.promises.rm(databasePath, { force: true })
  })
  return prisma
}

async function createTarget(prisma) {
  const agentId = id('agent')
  const sessionId = id('session')
  await prisma.agent.create({ data: { id: agentId } })
  await prisma.session.create({
    data: { agentId, id: sessionId, kind: 'conversation' },
  })
  return { agentId, sessionId }
}

/** 抢跑：另一个入口（Cron / 哨兵 / 渠道）先拿到租约，短 TTL 模拟「马上会放手」。 */
async function holdLease(coordinator, { agentId, sessionId, ttlMs, owner }) {
  const lease = await coordinator.acquireLease({
    agentId,
    owner,
    sessionId,
    ttlMs,
  })
  assert.ok(lease, '测试前置失败：另一个写者应当拿到租约')
  return lease
}

test('Web Agent 入口在租约被占用时排队等待，而不是返回用户可见失败', async (t) => {
  const prisma = await fixture(t)
  const { agentId, sessionId } = await createTarget(prisma)
  const coordinator = new SessionWorkCoordinator({ prisma })
  await holdLease(coordinator, {
    agentId,
    owner: 'another-writer',
    sessionId,
    ttlMs: 800,
  })

  // 用一个假 llm 隔离本轮主题：这里要验证的是租约行为，不是模型输出。
  const turnService = new SessionTurnService({
    llm: { process: async () => ({ content: [] }) },
    prisma,
    sessionWorkCoordinator: coordinator,
  })
  const error = await turnService
    .runTurn({
      agentId,
      isWeb: true,
      sessionId,
      sessionLeaseWaitMs: 8000,
      source: 'web',
      text: '用户在 Web 发的消息',
    })
    .then(
      () => null,
      (caught) => caught,
    )

  assert.notEqual(
    error?.code,
    'session_busy',
    '租约被占用不得表现为用户可见失败：应当排队等待，而不是把 session_busy 抛到 agent 协议层变成 failed 帧',
  )

  // 等待方必须真的接管了租约，而不是悄悄放弃执行。
  const lease = await prisma.sessionWorkLease.findUnique({
    where: { sessionId },
  })
  assert.ok(
    lease.fencingToken > 1,
    `等待方应当接管租约（fencingToken 递增），实际为 ${lease.fencingToken}`,
  )
  t.diagnostic(
    error
      ? `本轮在取得租约后仍报错（与本用例主题无关）：${error.code || ''} ${error.message}`
      : '本轮在取得租约后完整执行结束',
  )
})

test('SessionWorkCoordinator: waitMs > 0 时排队等待并最终执行，而不是抛 session_busy', async (t) => {
  const prisma = await fixture(t)
  const { agentId, sessionId } = await createTarget(prisma)
  const coordinator = new SessionWorkCoordinator({ prisma })
  await holdLease(coordinator, {
    agentId,
    owner: 'another-writer',
    sessionId,
    ttlMs: 600,
  })

  const startedAt = Date.now()
  let observedFencingToken = null
  const result = await coordinator.withSessionLease(
    { agentId, sessionId, waitMs: 8000 },
    async ({ sessionLease }) => {
      observedFencingToken = sessionLease.fencingToken
      return 'ran'
    },
  )

  assert.equal(result, 'ran', '等待之后必须真的执行回调')
  assert.ok(
    observedFencingToken > 1,
    '等待方应当接管租约（fencingToken 递增）',
  )
  assert.ok(
    Date.now() - startedAt >= 400,
    '应当至少等到前一个写者放手，而不是抢跑',
  )
})

test('SessionWorkCoordinator: waitMs 默认 0 时保持原有语义（抢不到即 session_busy）', async (t) => {
  const prisma = await fixture(t)
  const { agentId, sessionId } = await createTarget(prisma)
  const coordinator = new SessionWorkCoordinator({ prisma })
  await holdLease(coordinator, {
    agentId,
    owner: 'another-writer',
    sessionId,
    ttlMs: 60000,
  })

  // Cron / Trigger / 工作项队列依赖「抢不到就交给队列延期重试」，
  // 这条不能被排队等待悄悄改掉。
  await assert.rejects(
    () =>
      coordinator.withSessionLease({ agentId, sessionId }, async () => 'nope'),
    (error) => error?.code === 'session_busy',
  )
})
