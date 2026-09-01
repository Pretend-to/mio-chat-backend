import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  decryptToken,
  LegacyMigrationService,
} from '../../lib/chat/persistence/index.js'

async function write(root, relativePath, value) {
  const target = path.join(root, relativePath)
  await fs.promises.mkdir(path.dirname(target), { recursive: true })
  const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  await fs.promises.writeFile(target, content)
}

async function createFixture(t) {
  // Prisma's SQLite schema engine is unreliable with macOS' symlinked
  // /var/folders TMPDIR and nested absolute SQLite URLs. Keep the DB directly
  // under /tmp while legacy fixtures live in their own directory.
  const root = await fs.promises.mkdtemp('/tmp/mio-legacy-migration-')
  const databasePath = `/tmp/${path.basename(root)}.db`
  const prismaBin = path.join(process.cwd(), 'node_modules/.bin/prisma')
  execFileSync(prismaBin, [
    'db',
    'push',
    '--schema',
    path.join(process.cwd(), 'prisma/schema.prisma'),
    '--url',
    `file:${databasePath}`,
  ], {
    env: { ...process.env, RUST_LOG: 'debug' },
    stdio: 'ignore',
  })

  const adapter = new PrismaBetterSqlite3({ url: `file:${databasePath}` })
  const prisma = new PrismaClient({ adapter })
  await prisma.$connect()
  t.after(async () => {
    await prisma.$disconnect()
    await fs.promises.rm(databasePath, { force: true })
    await fs.promises.rm(root, { force: true, recursive: true })
  })
  return { prisma, root }
}

test('LegacyMigrationService imports and verifies a complete legacy instance idempotently', async t => {
  const { prisma, root } = await createFixture(t)
  const encryptionKey = '22'.repeat(32)
  const agentId = 'wechat-master'
  const sessionId = 's_legacy'
  const channelId = 'c_legacy'

  await fs.promises.mkdir(path.join(root, 'memory/agents/meta-only'), { recursive: true })
  await write(root, `memory/agents/${agentId}/soul.md`, 'soul bytes\n')
  await write(root, `memory/agents/${agentId}/active`, sessionId)
  await write(root, `memory/agents/${agentId}/meta.json`, {
    enabled: true,
    tools: ['search', 'memory'],
  })
  await write(root, `memory/agents/${agentId}/global/user_profile.md`, '# Profile\n- exact\n')
  await write(root, `memory/agents/${agentId}/archives/${sessionId}/2000.json`, {
    archivedAt: 2000,
    chat: [
      { role: 'system', text: 'missing time and content' },
      {
        content: [{
          data: {
            arguments: '{"q":"one"}',
            id: 'call_1',
            name: 'search',
            result: { ok: true },
            status: 'success',
          },
          type: 'tool_call',
        }],
        role: 'assistant',
      },
    ],
    sessionId,
  })
  await write(root, `memory/agents/${agentId}/sessions/${sessionId}.json`, {
    chat: [
      { from_user_id: 'u1', role: 'user', text: 'hello', time: 3000 },
      { content: [{ data: { text: 'hi' }, type: 'text' }], role: 'assistant', text: 'hi', time: 4000 },
    ],
    created_at: 1000,
    crystal: '<memory_crystal>legacy</memory_crystal>',
    id: sessionId,
    pending_memories: [{ kind: 'fact', timestamp: 5000 }],
    title: 'Legacy',
  })
  await write(root, 'channels-data/channels.json', [{
    agentId,
    createdAt: 1000,
    id: channelId,
    model: 'model-a',
    name: 'Bot',
    provider: 'provider-a',
    status: 'running',
    token: 'plain-secret',
    type: 'wechat',
    updatedAt: 2000,
    userId: 'u1',
  }])
  await write(root, 'channels-data/triggers/triggers.json', [])
  await write(root, 'channels-data/triggers/executions.json', [{
    data: { price: 1 },
    durationMs: 10,
    firedAt: 6000,
    id: 'exec_orphan',
    reason: 'legacy orphan',
    status: 'woken',
    triggerId: 'missing-trigger',
    wake: true,
  }])
  await write(root, 'channels-data/triggers/scripts/orphan.js', 'process.exit(0)\n')

  const service = new LegacyMigrationService({ encryptionKey, prisma, rootDir: root })
  const first = await service.migrate()
  const second = await service.migrate()

  assert.equal(first.verification.problems.length, 0)
  assert.equal(second.verification.problems.length, 0)
  assert.equal(await prisma.agent.count(), 2)
  assert.equal(await prisma.session.count(), 1)
  assert.equal(await prisma.message.count(), 4)
  assert.equal(await prisma.sessionArchive.count(), 1)
  assert.equal(await prisma.toolCall.count(), 1)
  assert.equal(await prisma.pendingMemory.count(), 1)
  assert.equal(await prisma.crystal.count(), 1)

  const messages = await prisma.message.findMany({ orderBy: { seq: 'asc' } })
  assert.deepEqual(messages.map(message => message.seq), [0, 1, 2, 3])
  assert.equal(messages[0].businessTime, null)
  assert.equal(messages[0].content, 'null')
  assert.ok(messages[0].archivedAt instanceof Date)
  assert.equal(messages[2].archivedAt, null)

  const agent = await prisma.agent.findUnique({ where: { id: agentId } })
  assert.equal(agent.activeSessionId, sessionId)
  assert.equal(agent.soul, 'soul bytes\n')

  const channel = await prisma.channel.findUnique({ where: { id: channelId } })
  assert.equal(channel.provider, 'provider-a')
  assert.equal(channel.model, 'model-a')
  assert.equal(decryptToken(channel.tokenEnc, encryptionKey), 'plain-secret')
  assert.equal(JSON.parse(channel.legacyJson).token, undefined)

  const execution = await prisma.triggerExecution.findUnique({ where: { id: 'exec_orphan' } })
  assert.equal(execution.triggerId, null)
  assert.equal(execution.triggerKey, 'missing-trigger')
  assert.equal(await prisma.legacyMigration.count({ where: { status: 'completed' } }), 10)
})
