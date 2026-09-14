import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  CHANNEL_STORAGE_MIGRATION_SETTING,
  CHANNEL_STORAGE_MIGRATION_VERSION,
  runLegacyMigrationBootstrap,
} from '../../lib/chat/persistence/index.js'

async function write(root, relativePath, value) {
  const target = path.join(root, relativePath)
  await fs.promises.mkdir(path.dirname(target), { recursive: true })
  await fs.promises.writeFile(target, typeof value === 'string' ? value : JSON.stringify(value))
}

async function createFixture(t) {
  const root = await fs.promises.mkdtemp('/tmp/mio-legacy-bootstrap-')
  const databasePath = `/tmp/${path.basename(root)}.db`
  execFileSync(path.join(process.cwd(), 'node_modules/.bin/prisma'), [
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

  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${databasePath}` }),
  })
  await prisma.$connect()
  t.after(async () => {
    await prisma.$disconnect()
    await fs.promises.rm(databasePath, { force: true })
    await fs.promises.rm(root, { force: true, recursive: true })
  })
  return { databasePath, prisma, root }
}

test('restart init migrates a legacy instance once and persists its startup state', async t => {
  const previousKey = process.env.MIOCHAT_ENC_KEY
  const previousMode = process.env.MIO_CHANNEL_PERSISTENCE_MODE
  delete process.env.MIOCHAT_ENC_KEY
  delete process.env.MIO_CHANNEL_PERSISTENCE_MODE
  t.after(() => {
    if (previousKey === undefined) delete process.env.MIOCHAT_ENC_KEY
    else process.env.MIOCHAT_ENC_KEY = previousKey
    if (previousMode === undefined) delete process.env.MIO_CHANNEL_PERSISTENCE_MODE
    else process.env.MIO_CHANNEL_PERSISTENCE_MODE = previousMode
  })

  const { databasePath, prisma, root } = await createFixture(t)
  await write(root, 'memory/agents/a1/soul.md', 'soul\n')
  await write(root, 'memory/agents/a1/sessions/s1.json', {
    chat: [{ role: 'user', text: 'before restart' }],
    id: 's1',
  })
  await write(root, 'channels-data/channels.json', [{
    agentId: 'a1',
    id: 'c1',
    name: 'legacy channel',
    token: 'secret',
    type: 'wechat',
  }])

  const first = await runLegacyMigrationBootstrap({ databasePath, prisma, rootDir: root })
  assert.equal(first.migrated, true)
  assert.equal(first.mode, 'database')
  assert.equal(await prisma.message.count(), 1)
  assert.equal(await prisma.channel.count(), 1)
  assert.equal(process.env.MIOCHAT_ENC_KEY.length, 64)
  assert.equal(
    (await fs.promises.stat(path.join(root, 'prisma/data/channel-storage.key'))).mode & 0o777,
    0o600,
  )
  assert.equal(
    await fs.promises.readFile(
      path.join(root, 'prisma/data/backups/channel-storage/v1/memory/agents/a1/soul.md'),
      'utf8',
    ),
    'soul\n',
  )

  const setting = await prisma.systemSetting.findUnique({
    where: { key: CHANNEL_STORAGE_MIGRATION_SETTING },
  })
  assert.equal(JSON.parse(setting.value).version, 1)

  await write(root, 'memory/agents/a1/sessions/s1.json', {
    chat: [
      { role: 'user', text: 'before restart' },
      { role: 'assistant', text: 'not re-imported' },
    ],
    id: 's1',
  })
  const second = await runLegacyMigrationBootstrap({ databasePath, prisma, rootDir: root })
  assert.equal(second.migrated, false)
  assert.equal(second.reason, 'already-completed')
  assert.equal(await prisma.message.count(), 1)
})

test('fresh clone without legacy files selects database mode and provisions a key', async t => {
  const previousKey = process.env.MIOCHAT_ENC_KEY
  const previousMode = process.env.MIO_CHANNEL_PERSISTENCE_MODE
  delete process.env.MIOCHAT_ENC_KEY
  delete process.env.MIO_CHANNEL_PERSISTENCE_MODE
  const { databasePath, prisma, root } = await createFixture(t)
  t.after(async () => {
    if (previousKey === undefined) delete process.env.MIOCHAT_ENC_KEY
    else process.env.MIOCHAT_ENC_KEY = previousKey
    if (previousMode === undefined) delete process.env.MIO_CHANNEL_PERSISTENCE_MODE
    else process.env.MIO_CHANNEL_PERSISTENCE_MODE = previousMode
  })

  const result = await runLegacyMigrationBootstrap({
    databasePath,
    logger: { info() {} },
    prisma,
    rootDir: root,
  })
  assert.equal(result.reason, 'no-legacy-data')
  assert.equal(result.mode, 'database')
  assert.equal(process.env.MIO_CHANNEL_PERSISTENCE_MODE, 'database')
  assert.equal((await fs.promises.stat(path.join(root, 'prisma/data/channel-storage.key'))).mode & 0o777, 0o600)
  assert.equal(result.state.source, 'fresh-instance')
  const setting = await prisma.systemSetting.findUnique({
    where: { key: CHANNEL_STORAGE_MIGRATION_SETTING },
  })
  assert.equal(JSON.parse(setting.value).version, CHANNEL_STORAGE_MIGRATION_VERSION)
})

test('restart init refuses to import legacy JSON into an already populated persistence database', async t => {
  const previousKey = process.env.MIOCHAT_ENC_KEY
  const previousMode = process.env.MIO_CHANNEL_PERSISTENCE_MODE
  delete process.env.MIOCHAT_ENC_KEY
  delete process.env.MIO_CHANNEL_PERSISTENCE_MODE
  t.after(() => {
    if (previousKey === undefined) delete process.env.MIOCHAT_ENC_KEY
    else process.env.MIOCHAT_ENC_KEY = previousKey
    if (previousMode === undefined) delete process.env.MIO_CHANNEL_PERSISTENCE_MODE
    else process.env.MIO_CHANNEL_PERSISTENCE_MODE = previousMode
  })

  const { databasePath, prisma, root } = await createFixture(t)
  await prisma.agent.create({ data: { id: 'already-imported' } })
  await write(root, 'memory/agents/already-imported/soul.md', 'legacy soul\n')

  await assert.rejects(
    runLegacyMigrationBootstrap({ databasePath, prisma, rootDir: root }),
    error => error.code === 'CHANNEL_STORAGE_DATABASE_ALREADY_POPULATED'
      && error.message.includes('automatic re-import'),
  )
  assert.equal(await prisma.systemSetting.findUnique({
    where: { key: CHANNEL_STORAGE_MIGRATION_SETTING },
  }), null)
})

test('completed migration refuses to rotate a missing instance key', async t => {
  const previousKey = process.env.MIOCHAT_ENC_KEY
  const previousMode = process.env.MIO_CHANNEL_PERSISTENCE_MODE
  delete process.env.MIOCHAT_ENC_KEY
  delete process.env.MIO_CHANNEL_PERSISTENCE_MODE
  t.after(() => {
    if (previousKey === undefined) delete process.env.MIOCHAT_ENC_KEY
    else process.env.MIOCHAT_ENC_KEY = previousKey
    if (previousMode === undefined) delete process.env.MIO_CHANNEL_PERSISTENCE_MODE
    else process.env.MIO_CHANNEL_PERSISTENCE_MODE = previousMode
  })

  const { databasePath, prisma, root } = await createFixture(t)
  await prisma.systemSetting.create({
    data: {
      category: 'system',
      key: CHANNEL_STORAGE_MIGRATION_SETTING,
      value: JSON.stringify({ mode: 'database', version: CHANNEL_STORAGE_MIGRATION_VERSION }),
    },
  })

  await assert.rejects(
    runLegacyMigrationBootstrap({ databasePath, prisma, rootDir: root }),
    error => error.code === 'CHANNEL_STORAGE_KEY_MISSING'
      && error.message.includes('Restore the original key'),
  )
  assert.equal(fs.existsSync(path.join(root, 'prisma/data/channel-storage.key')), false)
})

test('completed migration rejects an environment key that differs from the persisted key', async t => {
  const previousKey = process.env.MIOCHAT_ENC_KEY
  const previousMode = process.env.MIO_CHANNEL_PERSISTENCE_MODE
  process.env.MIOCHAT_ENC_KEY = '77'.repeat(32)
  delete process.env.MIO_CHANNEL_PERSISTENCE_MODE
  t.after(() => {
    if (previousKey === undefined) delete process.env.MIOCHAT_ENC_KEY
    else process.env.MIOCHAT_ENC_KEY = previousKey
    if (previousMode === undefined) delete process.env.MIO_CHANNEL_PERSISTENCE_MODE
    else process.env.MIO_CHANNEL_PERSISTENCE_MODE = previousMode
  })

  const { databasePath, prisma, root } = await createFixture(t)
  await write(root, 'prisma/data/channel-storage.key', `${'88'.repeat(32)}\n`)
  await prisma.systemSetting.create({
    data: {
      category: 'system',
      key: CHANNEL_STORAGE_MIGRATION_SETTING,
      value: JSON.stringify({ mode: 'database', version: CHANNEL_STORAGE_MIGRATION_VERSION }),
    },
  })

  await assert.rejects(
    runLegacyMigrationBootstrap({ databasePath, prisma, rootDir: root }),
    /does not match the persisted instance key/,
  )
})
