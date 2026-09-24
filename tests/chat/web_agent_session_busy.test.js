/**
 * P0-1 复现测试：Web Agent 入口在租约被占用时的用户可见行为。
 *
 * 背景（详见 docs/architecture/session-work-injection-convergence-plan.md）：
 * Web 有两层含义，对应两个 socket 协议：
 *   - `llm_message`   = 纯前端 Web，历史由前端持有，服务端不落 Session，不取租约
 *   - `agent_message` = Web → 服务端持久化 Agent，经 SessionTurnService.runTurn
 *                       取得 SessionWorkLease（下称 B2）
 *
 * 缺陷：B2 抢不到租约时，SessionTurnService.runTurn 会把
 * SessionWorkError('session_busy') 一路抛到 lib/server/socket.io/controllers/agent.js
 * 的 .catch()，那里会给客户端发一个 failed 帧 —— 用户看到「发送失败」。
 *
 * 期望行为（收敛实施计划 · 不变量 I4）：抢不到租约不得表现为用户可见失败，
 * 应当排队/等待，稍后按序执行。
 *
 * 本测试在 Phase 0 以 skip 落地，避免污染「存量全绿」基线；
 * Phase 1 修完后移除 skip，转绿即为 Phase 1 的验收条件之一。
 *
 * 已复现（2026-09-24，基线 tag pre-convergence-20260924）：
 *   移除 skip 后本用例失败，actual: 'session_busy'，
 *   即租约被占用时 runTurn 确实以 session_busy 拒绝。
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

test(
  'Web Agent 入口在租约被占用时不得返回用户可见失败',
  {
    skip:
      'P0-1 未修：当前 runTurn 抛 session_busy → agent 协议层发 failed 帧（见收敛计划 Phase 1）',
  },
  async (t) => {
  const prisma = await fixture(t)
  const { agentId, sessionId } = await createTarget(prisma)
  const coordinator = new SessionWorkCoordinator({ prisma })

  // 另一个入口（Cron / Trigger / SubAgent 唤醒 / 其它渠道）先拿到租约且仍在执行。
  await coordinator.acquireLease({
    agentId,
    owner: 'another-writer',
    sessionId,
    ttlMs: 60000,
  })

  const turnService = new SessionTurnService({
    prisma,
    sessionWorkCoordinator: coordinator,
  })
  const error = await turnService
    .runTurn({
      agentId,
      isWeb: true,
      sessionId,
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
    '租约被占用不得表现为用户可见失败：应当排队/等待，而不是把 session_busy 抛到 agent 协议层变成 failed 帧',
  )
})
