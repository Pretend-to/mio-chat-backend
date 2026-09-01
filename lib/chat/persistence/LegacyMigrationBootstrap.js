import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { buildLegacyInventory } from './LegacyInventory.js'
import { LegacyMigrationService } from './LegacyMigrationService.js'
import { parseEncryptionKey } from './TokenCipher.js'

export const CHANNEL_STORAGE_MIGRATION_VERSION = 1
export const CHANNEL_STORAGE_MIGRATION_SETTING = '_channel_storage_migration'

const DEFAULT_MODE = 'shadow'

function readState(row) {
  if (!row) return null
  try {
    const state = JSON.parse(row.value)
    return state && typeof state === 'object' ? state : null
  } catch {
    throw new Error(`${CHANNEL_STORAGE_MIGRATION_SETTING} contains invalid JSON`)
  }
}

async function writePrivateFile(filePath, content) {
  await fs.promises.mkdir(path.dirname(filePath), { mode: 0o700, recursive: true })
  try {
    await fs.promises.writeFile(filePath, content, { flag: 'wx', mode: 0o600 })
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
  }
  await fs.promises.chmod(filePath, 0o600)
}

async function ensureEncryptionKey({ keyPath }) {
  const configured = process.env.MIOCHAT_ENC_KEY?.trim() || null
  let stored = null
  try {
    stored = (await fs.promises.readFile(keyPath, 'utf8')).trim()
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  if (configured) parseEncryptionKey(configured)
  if (stored) parseEncryptionKey(stored)
  if (configured && stored && !crypto.timingSafeEqual(parseEncryptionKey(configured), parseEncryptionKey(stored))) {
    throw new Error(`MIOCHAT_ENC_KEY does not match the persisted instance key at ${keyPath}`)
  }

  const selected = configured || stored || crypto.randomBytes(32).toString('hex')
  if (!stored) await writePrivateFile(keyPath, `${parseEncryptionKey(selected).toString('hex')}\n`)
  process.env.MIOCHAT_ENC_KEY = selected
  return selected
}

async function copyIfExists(source, destination) {
  try {
    await fs.promises.cp(source, destination, { recursive: true })
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

async function createMigrationBackup({ backupRoot, databasePath, rootDir }) {
  try {
    await fs.promises.access(backupRoot)
    return { created: false, path: backupRoot }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  const temporary = `${backupRoot}.tmp-${process.pid}`
  await fs.promises.mkdir(temporary, { mode: 0o700, recursive: true })
  try {
    for (const suffix of ['', '-wal', '-shm']) {
      await copyIfExists(`${databasePath}${suffix}`, path.join(temporary, `app.db${suffix}`))
    }
    await copyIfExists(path.join(rootDir, 'memory'), path.join(temporary, 'memory'))
    await copyIfExists(path.join(rootDir, 'channels-data'), path.join(temporary, 'channels-data'))
    await fs.promises.mkdir(path.dirname(backupRoot), { mode: 0o700, recursive: true })
    await fs.promises.rename(temporary, backupRoot)
    return { created: true, path: backupRoot }
  } catch (error) {
    await fs.promises.rm(temporary, { force: true, recursive: true })
    throw error
  }
}

/**
 * Perform the one-time legacy JSON -> database import while the application is
 * still in its restart initialization phase. Nothing starts listening until
 * this function returns successfully.
 */
export async function runLegacyMigrationBootstrap({
  prisma,
  rootDir = process.cwd(),
  databasePath = path.join(rootDir, 'prisma/data/app.db'),
  logger = console,
} = {}) {
  if (!prisma) throw new Error('runLegacyMigrationBootstrap requires a Prisma client')

  const explicitMode = process.env.MIO_CHANNEL_PERSISTENCE_MODE?.trim() || null
  const state = readState(await prisma.systemSetting.findUnique({
    where: { key: CHANNEL_STORAGE_MIGRATION_SETTING },
  }))

  if (Number(state?.version) >= CHANNEL_STORAGE_MIGRATION_VERSION) {
    await ensureEncryptionKey({ keyPath: path.join(rootDir, 'prisma/data/channel-storage.key') })
    if (!explicitMode) process.env.MIO_CHANNEL_PERSISTENCE_MODE = state.mode || DEFAULT_MODE
    return { migrated: false, mode: process.env.MIO_CHANNEL_PERSISTENCE_MODE, reason: 'already-completed', state }
  }

  const inventory = await buildLegacyInventory({ rootDir })
  if (inventory.files.length === 0 && inventory.agentDirs.length === 0) {
    return { inventory, migrated: false, mode: explicitMode || 'legacy', reason: 'no-legacy-data' }
  }
  if (inventory.blocked.length > 0) {
    const paths = inventory.blocked.map(file => file.relativePath).join(', ')
    throw new Error(`Legacy data inventory is blocked by ${inventory.blocked.length} file(s): ${paths}`)
  }

  const encryptionKey = await ensureEncryptionKey({
    keyPath: path.join(rootDir, 'prisma/data/channel-storage.key'),
  })
  const backupRoot = path.join(
    rootDir,
    'prisma/data/backups/channel-storage',
    `v${CHANNEL_STORAGE_MIGRATION_VERSION}`,
  )
  const backup = await createMigrationBackup({ backupRoot, databasePath, rootDir })
  logger.info(`存量数据迁移快照${backup.created ? '已创建' : '已存在'}: ${backup.path}`)

  const service = new LegacyMigrationService({ encryptionKey, logger, prisma, rootDir })
  const result = await service.migrate()
  if (result.verification.problems.length > 0) {
    throw new Error(`Legacy migration verification failed: ${result.verification.problems.join('; ')}`)
  }

  const mode = explicitMode || DEFAULT_MODE
  const completedState = {
    completedAt: new Date().toISOString(),
    manifestHash: result.inventory.manifestHash,
    mode: explicitMode ? DEFAULT_MODE : mode,
    version: CHANNEL_STORAGE_MIGRATION_VERSION,
  }
  await prisma.systemSetting.upsert({
    create: {
      category: 'system',
      description: 'One-time legacy channel/session storage migration state',
      key: CHANNEL_STORAGE_MIGRATION_SETTING,
      value: JSON.stringify(completedState),
    },
    update: { value: JSON.stringify(completedState) },
    where: { key: CHANNEL_STORAGE_MIGRATION_SETTING },
  })
  process.env.MIO_CHANNEL_PERSISTENCE_MODE = mode
  logger.info(`✅ 存量数据迁移及校验完成，当前存储模式: ${mode}`)
  return { backup, migrated: true, mode, result, state: completedState }
}

export const legacyMigrationBootstrapInternals = {
  createMigrationBackup,
  ensureEncryptionKey,
}
