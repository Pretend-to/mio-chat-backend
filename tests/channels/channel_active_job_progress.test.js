/**
 * 护栏：渠道流式执行期间，activeJob.lastProgressText 必须随正文分块更新。
 *
 * 为什么单独为它写测试：
 * 这段逻辑现在藏在 `channels/llm.js` 里桥接对象的 `update` 闭包中
 * （`job.lastProgressText = currentTextBlock.slice(0, 100)`）。
 * Phase 2 要把它搬进 `ChannelChatEvent`——搬移的风险在于
 * **搬漏了不会有任何测试变红**，只会在生产里让进度提示静默停止更新。
 * 所以先把它钉死，再动刀。
 *
 * 契约：
 *   1. 正文分块累加（不是只保留最后一块）
 *   2. 截断到 100 字符
 */

import { test } from 'node:test'
import assert from 'node:assert'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

global.logger = global.logger || console

import { DatabaseMemoryStore } from '../../lib/chat/persistence/DatabaseMemoryStore.js'
import { OneBotChannel } from '../../channels/onebots/OneBotChannel.js'
import { createBackendLlm } from '../../channels/llm.js'

const MASTER = 'master@im.wechat'
const CHUNK_A = 'A'.repeat(60)
const CHUNK_B = 'B'.repeat(60)

async function createPrismaFixture() {
  const databasePath = path.join(
    os.tmpdir(),
    `mio-job-progress-${process.pid}-${crypto.randomUUID()}.db`,
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

function createMockClient() {
  return {
    botId: 'bot-1',
    downloadMedia: async () => Buffer.from('fake'),
    getUpdates: async () => ({ msgs: [], ret: 0 }),
    sendMessage: async () => ({ ret: 0 }),
  }
}

test('渠道流式执行：activeJob.lastProgressText 随正文分块累加并截断到 100 字符', async () => {
  const channelId = 'ch_job_progress_1'
  const { databasePath, prisma } = await createPrismaFixture()
  await prisma.agent.create({ data: { id: channelId } })
  const memory = new DatabaseMemoryStore({ agentId: channelId, prisma })
  await memory.ensure()
  await memory.writeSoul('你是进度同步守卫')

  let jobFound = false
  let progressAfterFirstChunk = null
  let progressAfterSecondChunk = null

  const readProgress = (event) => {
    const job = event.channel?.activeJobs?.get(event.sessionId)
    if (!job) return undefined
    jobFound = true
    return job.lastProgressText
  }

  const mockLlmService = {
    getModelList: () => ({ openai: ['gpt-4o'] }),
    handleMessage: async (event) => {
      await event.update({ content: CHUNK_A, type: 'content' })
      progressAfterFirstChunk = readProgress(event)

      await event.update({ content: CHUNK_B, type: 'content' })
      progressAfterSecondChunk = readProgress(event)

      if (typeof event.complete === 'function') await event.complete()
    },
  }

  const chn = new OneBotChannel({
    channelId,
    client: createMockClient(),
    id: channelId,
    llm: createBackendLlm({ llmService: mockLlmService }),
    masterId: MASTER,
    memory,
    typing: false,
  })

  try {
    await chn._processChat('跑一个会输出长正文的任务', {
      channelId,
      contextToken: 'CTX_PROGRESS',
      from: MASTER,
      isTask: true,
      messageId: `msg_progress_${Date.now()}`,
      rawMsg: null,
    })

    assert.ok(
      jobFound,
      '流式执行期间 activeJobs 里必须有本会话的 job（否则进度同步整体失效）',
    )
    assert.strictEqual(
      progressAfterFirstChunk,
      CHUNK_A,
      '第一块正文必须写入 lastProgressText',
    )
    assert.strictEqual(
      progressAfterSecondChunk,
      (CHUNK_A + CHUNK_B).slice(0, 100),
      '必须是累积正文而非只保留最后一块，且截断到 100 字符',
    )
    assert.strictEqual(
      progressAfterSecondChunk.length,
      100,
      '累计 120 字符时必须截断到 100',
    )
  } finally {
    await prisma.$disconnect()
    fs.rmSync(databasePath, { force: true })
  }
})
