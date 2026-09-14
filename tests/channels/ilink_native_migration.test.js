import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { ChannelStore } from '../../channels/ChannelStore.js'
import {
  migrateOneBotsIlinkToNative,
  oneBotsSessionPath,
} from '../../channels/migrations/migrateOneBotsIlinkToNative.js'

test('OneBots iLink records migrate idempotently to the native adapter', async t => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mio-ilink-migration-'))
  t.after(() => fs.promises.rm(root, { force: true, recursive: true }))

  const store = new ChannelStore({ file: path.join(root, 'channels.json') })
  const created = await store.create({
    agentId: 'wechat-master',
    driver: 'onebots',
    id: 'wechat/account 1',
    platform: 'wechat-clawbot',
    protocol: 'onebot.v12',
    status: 'running',
    type: 'weixin-ilink',
  })
  assert.equal(created.hasToken, false)

  const sessionFile = oneBotsSessionPath(created.id, root)
  await fs.promises.mkdir(path.dirname(sessionFile), { recursive: true })
  await fs.promises.writeFile(sessionFile, JSON.stringify({
    accountId: 'bot-id',
    contextTokens: { 'user-id': 'latest-context' },
    token: 'secret-token',
    userId: 'user-id',
  }))

  const meta = new Map()
  const createMemory = async () => ({
    getAgentMeta: async (key, fallback) => meta.has(key) ? meta.get(key) : fallback,
    setAgentMeta: async (key, value) => meta.set(key, value),
  })
  const first = await migrateOneBotsIlinkToNative({
    channelStore: store,
    createMemory,
    cwd: root,
  })
  const migrated = await store.get(created.id)

  assert.deepEqual(first, {
    examined: 1,
    failed: 0,
    migrated: 1,
    recoveredCredentials: 1,
  })
  assert.equal(migrated.type, 'weixin-ilink')
  assert.equal(migrated.adapterId, 'weixin-ilink')
  assert.equal(migrated.driver, 'native')
  assert.equal(migrated.platform, 'weixin-ilink')
  assert.equal(migrated.protocol, 'weixin.ilink')
  assert.equal(migrated.token, 'secret-token')
  assert.equal(migrated.botId, 'bot-id')
  assert.equal(migrated.userId, 'user-id')
  assert.equal(migrated.status, 'running')
  assert.equal(meta.get('latestContextToken'), 'latest-context')
  assert.equal(fs.existsSync(sessionFile), true, 'OneBots session remains available for rollback')

  const second = await migrateOneBotsIlinkToNative({
    channelStore: store,
    createMemory,
    cwd: root,
  })
  assert.deepEqual(second, {
    examined: 1,
    failed: 0,
    migrated: 0,
    recoveredCredentials: 0,
  })
})

test('running iLink record without recoverable credentials is stopped safely', async t => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mio-ilink-migration-'))
  t.after(() => fs.promises.rm(root, { force: true, recursive: true }))
  const store = new ChannelStore({ file: path.join(root, 'channels.json') })
  const created = await store.create({
    driver: 'onebots',
    id: 'missing-credentials',
    botId: 'broken@im.bot',
    platform: 'wechat-clawbot',
    protocol: 'onebot.v12',
    status: 'running',
    type: 'weixin-ilink',
    userId: 'broken@im.bot',
  })

  await migrateOneBotsIlinkToNative({ channelStore: store, cwd: root })
  const migrated = await store.get(created.id)
  assert.equal(migrated.driver, 'native')
  assert.equal(migrated.status, 'stopped')
  assert.equal(migrated.token, '')
  assert.equal(migrated.userId, '')
})
