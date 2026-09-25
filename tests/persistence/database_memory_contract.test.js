import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { DatabaseMemoryStore } from '../../lib/chat/persistence/DatabaseMemoryStore.js'

async function fixture(t) {
  const databasePath = path.join(os.tmpdir(), `mio-contract-${process.pid}-${crypto.randomUUID()}.db`)
  execFileSync(path.join(process.cwd(), 'node_modules/.bin/prisma'), [
    'db', 'push', '--schema', path.join(process.cwd(), 'prisma/schema.prisma'),
    '--url', `file:${databasePath}`,
  ], { env: { ...process.env, RUST_LOG: 'debug' }, stdio: 'ignore' })
  const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${databasePath}` }) })
  await prisma.$connect()
  t.after(async () => {
    await prisma.$disconnect()
    await fs.promises.rm(databasePath, { force: true })
  })
  const memory = new DatabaseMemoryStore({ agentId: 'contract-agent', prisma })
  await memory.ensure()
  return { memory, prisma }
}

test('session identity and ordering contract', async t => {
  const { memory, prisma } = await fixture(t)
  await memory.createSession({ createdAt: 1000, id: 'b', title: 'first' })
  const existing = await memory.createSession({ createdAt: 2000, id: 'b', title: 'replacement' })
  assert.equal(existing.created_at, 1000)
  assert.equal(existing.title, 'first')
  assert.equal(await prisma.session.count(), 1)
  await assert.rejects(memory.setActiveSession('missing'), /not found/)
  assert.equal(await memory.getActiveSession(), null)
  await memory.createSession({ createdAt: 1000, id: 'a' })
  const originalFindMany = prisma.session.findMany.bind(prisma.session)
  let queryOrder
  prisma.session.findMany = args => {
    queryOrder = args.orderBy
    return originalFindMany(args)
  }
  assert.deepEqual((await memory.listSessions()).map(session => session.id), ['a', 'b'])
  assert.deepEqual(queryOrder, [{ createdAt: 'asc' }, { id: 'asc' }])
})

test('message shape, external idempotency and rotation archive contract', async t => {
  const { memory, prisma } = await fixture(t)
  await memory.createSession({ id: 'chat' })
  const first = await memory.appendUserMessageOnce('chat', {
    channel_id: 'wechat', external_message_id: 'external-1', role: 'user', text: 'one', time: 1000,
  })
  const duplicate = await memory.appendUserMessageOnce('chat', {
    channel_id: 'wechat', external_message_id: 'external-1', role: 'user', text: 'changed', time: 2000,
  })
  assert.equal(first.inserted, true)
  assert.deepEqual(duplicate, { id: first.id, inserted: false })
  await memory.appendToChat('chat', { role: 'assistant', content: 'answer', time: 3000 })
  await memory.appendToChat('chat', { role: 'user', text: 'two', time: 4000 })
  const chat = await memory.getChat('chat')
  assert.deepEqual(chat.map(message => message.content), [
    [{ type: 'text', data: { text: 'one' } }],
    [{ type: 'text', data: { text: 'answer' } }],
    [{ type: 'text', data: { text: 'two' } }],
  ])
  const rotated = await memory.rotateChat('chat', 1)
  assert.equal(rotated.rotated, true)
  assert.equal(rotated.removedCount, 2)
  assert.match(rotated.archivePath, /^db:\/\/database\//)
  assert.deepEqual((await memory.getChat('chat')).map(message => message.text), ['two'])
  const archive = await prisma.sessionArchive.findFirst({ where: { sessionId: 'chat' } })
  assert.ok(archive)
  assert.equal(await prisma.message.count({ where: { archiveId: archive.id } }), 2)
})
