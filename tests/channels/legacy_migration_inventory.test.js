import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  buildLegacyInventory,
  decryptToken,
  encryptToken,
  parseEncryptionKey,
} from '../../lib/chat/persistence/index.js'

async function makeTempRoot(t) {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mio-legacy-inventory-'))
  t.after(() => fs.promises.rm(root, { force: true, recursive: true }))
  return root
}

async function write(root, relativePath, content) {
  const target = path.join(root, relativePath)
  await fs.promises.mkdir(path.dirname(target), { recursive: true })
  await fs.promises.writeFile(target, content)
}

test('LegacyInventory inventories empty agents and every supported legacy source', async t => {
  const root = await makeTempRoot(t)
  await fs.promises.mkdir(path.join(root, 'memory/agents/meta-only'), { recursive: true })
  await write(root, 'memory/agents/wechat-master/soul.md', 'soul\n')
  await write(root, 'memory/agents/wechat-master/active', 's_1')
  await write(root, 'memory/agents/wechat-master/meta.json', '{"tools":["search"]}')
  await write(root, 'memory/agents/wechat-master/global/user_profile.md', '# User\n')
  await write(root, 'memory/agents/wechat-master/sessions/s_1.json', JSON.stringify({
    chat: [{ role: 'system', text: 'legacy message without time/content' }],
    created_at: 1,
    crystal: '',
    id: 's_1',
    pending_memories: [],
    title: 'one',
  }))
  await write(root, 'memory/agents/wechat-master/archives/s_1/2.json', JSON.stringify({
    archivedAt: 2,
    chat: [{ content: [{ data: { text: 'old' }, type: 'text' }], role: 'assistant' }],
    sessionId: 's_1',
  }))
  await write(root, 'channels-data/channels.json', '[]')
  await write(root, 'channels-data/triggers/triggers.json', '[]')
  await write(root, 'channels-data/triggers/executions.json', '[]')
  await write(root, 'channels-data/triggers/scripts/watch.js', 'process.exit(0)\n')

  const first = await buildLegacyInventory({ rootDir: root })
  const second = await buildLegacyInventory({ rootDir: root })

  assert.deepEqual(first.agentDirs, ['meta-only', 'wechat-master'])
  assert.equal(first.summary.blocked, 0)
  assert.deepEqual(first.summary.kinds, {
    agent_active: 1,
    agent_meta: 1,
    agent_soul: 1,
    channels: 1,
    global_memory: 1,
    session: 1,
    session_archive: 1,
    trigger_executions: 1,
    trigger_script: 1,
    triggers: 1,
  })
  assert.equal(first.manifestHash, second.manifestHash)
  assert.equal(first.files.find(file => file.kind === 'session').sessionId, 's_1')

  await fs.promises.mkdir(path.join(root, 'memory/agents/new-empty-agent'), { recursive: true })
  const withNewEmptyAgent = await buildLegacyInventory({ rootDir: root })
  assert.notEqual(withNewEmptyAgent.manifestHash, first.manifestHash)
})

test('LegacyInventory blocks malformed, unknown, and symlinked sources', async t => {
  const root = await makeTempRoot(t)
  await write(root, 'memory/agents/a/meta.json', '{broken')
  await write(root, 'memory/agents/a/unrecognized.bin', 'x')
  await write(root, 'outside.txt', 'outside')
  await fs.promises.symlink(
    path.join(root, 'outside.txt'),
    path.join(root, 'memory/agents/a/soul.md'),
  )

  const inventory = await buildLegacyInventory({ rootDir: root })

  assert.equal(inventory.summary.blocked, 3)
  assert.match(inventory.blocked.find(file => file.relativePath.endsWith('meta.json')).error, /Invalid JSON/)
  assert.match(inventory.blocked.find(file => file.relativePath.endsWith('unrecognized.bin')).error, /Unrecognized/)
  assert.match(inventory.blocked.find(file => file.relativePath.endsWith('soul.md')).error, /Symbolic links/)
})

test('LegacyInventory blocks mismatched and cross-agent session ids', async t => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mio-legacy-collision-'))
  t.after(() => fs.promises.rm(root, { force: true, recursive: true }))

  await write(root, 'memory/agents/a/sessions/shared.json', JSON.stringify({
    chat: [],
    id: 'shared',
  }))
  await write(root, 'memory/agents/b/sessions/shared.json', JSON.stringify({
    chat: [],
    id: 'shared',
  }))
  await write(root, 'memory/agents/c/sessions/path-id.json', JSON.stringify({
    chat: [],
    id: 'different-id',
  }))

  const inventory = await buildLegacyInventory({ rootDir: root })
  assert.equal(inventory.blocked.length, 3)
  assert.match(inventory.files[0].error, /multiple agents/)
  assert.match(inventory.files[1].error, /multiple agents/)
  assert.match(inventory.files[2].error, /does not match path id/)
})

test('TokenCipher round-trips credentials and rejects invalid keys or tampering', () => {
  const keyHex = '11'.repeat(32)
  const key = parseEncryptionKey(keyHex)
  const encrypted = encryptToken('secret-token', key)

  assert.notEqual(encrypted, 'secret-token')
  assert.equal(decryptToken(encrypted, key), 'secret-token')
  assert.throws(() => parseEncryptionKey('weak-password'), /exactly 32 bytes/)

  const parts = encrypted.split(':')
  parts[3] = Buffer.from('tampered').toString('base64')
  assert.throws(() => decryptToken(parts.join(':'), key))
})
