import { test } from 'node:test'
import assert from 'node:assert'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'
import { DatabaseMemoryStore } from '../../lib/chat/persistence/DatabaseMemoryStore.js'

/**
 * DatabaseMemoryStore — 渠道无关记忆落盘层测试
 * 覆盖：soul / global 长期记忆(分类CRUD) / sessions / crystal / active / 安全 / 隔离
 */

async function createPrismaFixture() {
  const databasePath = path.join(
    os.tmpdir(),
    `mio-mem-${process.pid}-${crypto.randomUUID()}.db`,
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

test('DatabaseMemoryStore 记忆落盘层', async () => {
  const { databasePath, prisma } = await createPrismaFixture()
  const m = new DatabaseMemoryStore({ agentId: 'wechat-master', prisma })

  try {
    await test('soul 读写', async () => {
      assert.strictEqual(await m.readSoul(), '')
      await m.writeSoul('你叫小助手，陪伴用户工作')
      assert.ok((await m.readSoul()).includes('小助手'))
    })

    await test('global 长期记忆：分类分区 + 合并 + update/delete', async () => {
      await m.addGlobal('user_profile', '用户喜欢 Node.js')
      await m.addGlobal('user_profile', '用户是开发者')
      await m.addGlobal('tech_stack', '常用 pnpm')
      const cats = await m.listGlobalCategories()
      assert.ok(cats.includes('user_profile') && cats.includes('tech_stack'))
      const all = await m.readAllGlobal()
      assert.ok(all.includes('## user_profile') && all.includes('## tech_stack') && all.includes('pnpm'))
      await m.updateGlobal('user_profile', '开发者', '用户是高级工程师')
      const up = await m.readGlobal('user_profile')
      assert.ok(up.includes('高级工程师') && !up.includes('开发者'))
      await m.deleteGlobal('user_profile', 'Node.js')
      assert.ok(!(await m.readGlobal('user_profile')).includes('Node.js'))
    })

    await test('sessions：创建/列表/追加聊天', async () => {
      const s1 = await m.createSession({ title: '会话1' })
      await m.createSession({ title: '会话2' })
      assert.strictEqual((await m.listSessions()).length, 2)
      await m.appendToChat(s1.id, { role: 'user', content: '早上好' })
      await m.appendToChat(s1.id, { role: 'assistant', content: '早！' })
      const chat = await m.getChat(s1.id)
      assert.strictEqual(chat.length, 2)
      // 文件存储原样落盘调用方对象（content 保持为字符串）；数据库存储按
      // canonicalContent 契约把 content 规范化为前端块数组。同一事实：
      // 追加的 assistant 内容可完整回读。
      assert.deepStrictEqual(chat[1].content, [{ data: { text: '早！' }, type: 'text' }])
      assert.strictEqual((await m.listSessions()).find((s) => s.id === s1.id).msgCount, 2)
    })

    await test('结晶：setCrystal/getCrystal + clearChat 保留 crystal', async () => {
      const s = await m.createSession({ title: 'ctx' })
      assert.strictEqual(await m.setCrystal(s.id, '<memory_crystal>长期事实A</memory_crystal>'), true)
      assert.strictEqual(await m.setCrystal(s.id, '<memory_crystal>长期事实A</memory_crystal>'), false)
      assert.ok((await m.getCrystal(s.id)).includes('长期事实A'))
      await m.appendToChat(s.id, { role: 'user', content: 'x' })
      await m.clearChat(s.id)
      assert.strictEqual((await m.getChat(s.id)).length, 0)
      assert.ok((await m.getCrystal(s.id)).includes('长期事实A'))
    })

    await test('rotateChat keepTurns=0 会归档全部原始消息', async () => {
      const s = await m.createSession({ title: 'compact-all' })
      await m.appendToChat(s.id, { role: 'user', content: '旧问题' })
      await m.appendToChat(s.id, { role: 'assistant', content: '旧回答' })
      const result = await m.rotateChat(s.id, 0)
      assert.strictEqual(result.rotated, true)
      assert.strictEqual(result.removedCount, 2)
      assert.strictEqual(result.keptCount, 0)
      assert.deepStrictEqual(await m.getChat(s.id), [])
      // 文件存储的归档可以 stat 到文件；数据库存储的归档是一行 SessionArchive，
      // 用同一事实的等价断言：被裁剪的历史确实归档落盘。
      assert.strictEqual(await prisma.sessionArchive.count({ where: { sessionId: s.id } }), 1)
    })

    await test('active 会话：set/get + 删除激活会话重置', async () => {
      assert.strictEqual(await m.getActiveSession(), null)
      const s = await m.createSession({ title: 'act' })
      await m.setActiveSession(s.id)
      assert.strictEqual(await m.getActiveSession(), s.id)
      await m.deleteSession(s.id)
      assert.strictEqual(await m.getActiveSession(), null)
    })

    await test('安全：非法 sessionId 被 sanitize 不会越权', async () => {
      assert.strictEqual(await m.getSession('../../etc/passwd'), null)
    })

    await test('agent 隔离', async () => {
      const m2 = new DatabaseMemoryStore({ agentId: 'other-agent', prisma })
      await m2.writeSoul('另一个灵魂')
      assert.ok((await m.readSoul()).includes('小助手'))
    })
  } finally {
    await prisma.$disconnect()
    fs.rmSync(databasePath, { force: true })
  }
})
