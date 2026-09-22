#!/usr/bin/env node

import crypto from 'node:crypto'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

export const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)

/**
 * 运行时数据库路径唯一（`<cwd>/data/app.db`，不支持环境变量覆盖），
 * 所以测试隔离统一靠「换 cwd」：临时根里软链运行期入口，`data/` 留空。
 */
const LINKED_ENTRIES = [
  '.env.example',
  // 隔离根不是 git 仓库，而部分用例会调用 getCurrentLocalBranch() 等 git 命令
  '.git',
  '.gitignore',
  'channels',
  'config',
  'dist',
  'docs',
  'lib',
  'node_modules',
  'package.json',
  'plugins',
  'prisma',
  'scripts',
  'tests',
  'utils',
]

export async function createIsolatedRoot() {
  const root = await fs.mkdtemp('/tmp/miochat-test-')
  for (const entry of LINKED_ENTRIES) {
    try {
      await fs.symlink(path.join(projectRoot, entry), path.join(root, entry))
    } catch {
      // 可选目录（dist / docs 等）缺失时忽略
    }
  }
  await fs.mkdir(path.join(root, 'data'), { recursive: true })
  return root
}

export async function removeIsolatedRoot(root) {
  if (!root) return
  await fs.rm(root, { force: true, recursive: true })
}

export function randomCredentials() {
  return {
    adminCode: crypto.randomBytes(24).toString('base64url'),
    userCode: crypto.randomBytes(24).toString('base64url'),
  }
}

/**
 * 单元测试的数据库 fixture：
 *
 * 单测隐式依赖“与真库同构的配置”（LLM 适配器/owner/访问码等），但绝不能写真库。
 * 因此用 better-sqlite3 的 backup API 把真库复制成**一致快照**（包含 WAL，不是裸 cp），
 * 所有写操作都落在副本上；真库不存在时退回全新建库。
 * 同时把访问码对齐到本次运行随机生成的值，避免依赖真库里的码。
 */
export async function prepareTestDatabaseFixture(
  destination,
  { adminCode, userCode, port = 0 } = {},
) {
  const livePath = path.join(projectRoot, 'data/app.db')
  const hasLive = existsSync(livePath)

  if (!hasLive) {
    await prepareIsolatedDatabase(destination, { adminCode, port, userCode })
    return { source: 'fresh' }
  }

  const live = new Database(livePath, { fileMustExist: true, readonly: true })
  try {
    await live.backup(destination)
  } finally {
    live.close()
  }

  // 实例密钥（渠道凭据解密）也一并复制，保持与真库同构
  const liveKey = path.join(projectRoot, 'data/channel-storage.key')
  if (existsSync(liveKey)) {
    await fs.copyFile(
      liveKey,
      path.join(path.dirname(destination), 'channel-storage.key'),
    )
  }

  const copy = new Database(destination)
  try {
    // 只对齐 _schema_hash（避免启动时因 hash 不符去 push）；
    // admin/user 访问码保持与真库一致，避免改变依赖真库配置的用例行为。
    const schema = await fs.readFile(
      path.join(projectRoot, 'prisma/schema.prisma'),
      'utf8',
    )
    const schemaHash = crypto.createHash('md5').update(schema).digest('hex')
    copy
      .prepare(
        'INSERT INTO system_settings (key, value, category, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
      )
      .run('_schema_hash', JSON.stringify(schemaHash), 'system')
  } finally {
    copy.close()
  }
  return { source: 'live-copy' }
}

/**
 * 在隔离库里建出完整结构，并写入最小系统设置（访问码 / 端口 / schema hash）。
 * 只建结构、不引入任何真实数据 —— 供“真库不存在”与集成测试使用。
 */
export async function prepareIsolatedDatabase(
  destination,
  { adminCode, port = 0, userCode },
) {
  execFileSync(
    path.join(projectRoot, 'node_modules/.bin/prisma'),
    [
      'db',
      'push',
      '--schema',
      path.join(projectRoot, 'prisma/schema.prisma'),
      '--url',
      `file:${destination}`,
    ],
    { env: { ...process.env, RUST_LOG: 'debug' }, stdio: 'ignore' },
  )

  const database = new Database(destination)
  try {
    const schema = await fs.readFile(
      path.join(projectRoot, 'prisma/schema.prisma'),
      'utf8',
    )
    const schemaHash = crypto.createHash('md5').update(schema).digest('hex')
    const upsert = database.prepare(
      'INSERT INTO system_settings (key, value, category, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
    )
    upsert.run('admin_code', JSON.stringify(adminCode), 'system')
    upsert.run('user_code', JSON.stringify(userCode), 'system')
    upsert.run('server_port', JSON.stringify(port), 'server')
    upsert.run('_schema_hash', JSON.stringify(schemaHash), 'system')
  } finally {
    database.close()
  }
}
