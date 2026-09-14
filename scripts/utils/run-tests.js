#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

import { resolveDatabasePath } from '../../lib/database/databasePath.js'
import { discoverTestRuntime, probeMioChat } from './test-runtime.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

function run(command, args, { env = process.env, quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env,
      stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    })
    let output = ''
    if (quiet) {
      child.stdout.on('data', chunk => { output += chunk })
      child.stderr.on('data', chunk => { output += chunk })
    }
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve({ output })
      else reject(new Error(`${command} ${args.join(' ')} exited with ${signal || code}${output ? `\n${output.slice(-8000)}` : ''}`))
    })
  })
}

async function reservePort() {
  const server = net.createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const port = server.address().port
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  return port
}

async function prepareIsolatedDatabase(destination, { adminCode, port, userCode }) {
  const source = resolveDatabasePath({ env: {}, rootDir: projectRoot })
  try {
    await fs.access(source)
  } catch {
    throw new Error(`找不到可用于创建隔离测试快照的数据库：${source}`)
  }

  const sourceDatabase = new Database(source, { readonly: true })
  try {
    await sourceDatabase.backup(destination)
  } finally {
    sourceDatabase.close()
  }

  const database = new Database(destination)
  try {
    const update = database.prepare('UPDATE system_settings SET value = ? WHERE key = ?')
    update.run(JSON.stringify(adminCode), 'admin_code')
    update.run(JSON.stringify(userCode), 'user_code')
    update.run(JSON.stringify(port), 'server_port')
  } finally {
    database.close()
  }
}

async function stopService(child) {
  if (!child || child.exitCode !== null) return
  child.kill('SIGTERM')
  const exited = new Promise(resolve => child.once('exit', resolve))
  const timedOut = new Promise(resolve => setTimeout(() => resolve('timeout'), 12_000))
  if (await Promise.race([exited, timedOut]) === 'timeout' && child.exitCode === null) {
    child.kill('SIGKILL')
    await exited
  }
}

async function launchFreshService(env) {
  const baseUrl = `http://127.0.0.1:${env.PORT}`
  let recentOutput = ''

  for (let attempt = 1; attempt <= 3; attempt++) {
    const child = spawn(process.execPath, ['app.js'], {
      cwd: projectRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const capture = chunk => {
      recentOutput = `${recentOutput}${chunk}`.slice(-12_000)
    }
    child.stdout.on('data', capture)
    child.stderr.on('data', capture)

    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      if (await probeMioChat(baseUrl)) return { baseUrl, child }
      if (child.exitCode !== null) break
      await new Promise(resolve => setTimeout(resolve, 250))
    }

    if (child.exitCode === null) {
      await stopService(child)
      throw new Error(`Fresh MioChat service did not become healthy within 60s.\n${recentOutput}`)
    }
    // First boot may intentionally exit after writing a new schema hash.
    if (child.exitCode !== 0 || attempt === 3) {
      throw new Error(`Fresh MioChat service exited before becoming healthy (code ${child.exitCode}).\n${recentOutput}`)
    }
  }
  throw new Error('Fresh MioChat service could not be started')
}

export async function findExistingService(discover = discoverTestRuntime) {
  return (await discover()).baseUrl || null
}

async function main() {
  const existingService = await findExistingService()
  if (existingService) {
    console.log(`检测到存量 MioChat ${existingService}；它将保持在线，测试会使用独立实例。`)
  }

  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'miochat-test-'))
  const databasePath = path.join(temporaryRoot, 'app.db')
  const port = await reservePort()
  const adminCode = crypto.randomBytes(24).toString('base64url')
  const userCode = crypto.randomBytes(24).toString('base64url')
  const testEnv = {
    ...process.env,
    ADMIN_CODE: adminCode,
    HOST: '127.0.0.1',
    MIOCHAT_DATABASE_PATH: databasePath,
    MIOCHAT_TEST_ISOLATED: '1',
    NODE_ENV: 'test',
    PORT: String(port),
    USER_CODE: userCode,
  }
  let service = null

  try {
    console.log(`正在创建隔离数据库快照并启动全新服务（随机端口 ${port}）…`)
    await prepareIsolatedDatabase(databasePath, { adminCode, port, userCode })
    service = await launchFreshService(testEnv)
    console.log(`全新测试服务已就绪：${service.baseUrl}`)

    if (!process.argv.includes('--integration-only')) {
      // Unit tests own their mocks and temporary stores; do not leak the live
      // fixture's auth/port overrides into those processes.
      await run(pnpmCommand, ['test:unit'])
    }
    await run(process.execPath, ['scripts/utils/run-integration-tests.js'], {
      env: { ...testEnv, BASE_URL: service.baseUrl },
    })
  } finally {
    await stopService(service?.child)
    await fs.rm(temporaryRoot, { force: true, recursive: true })
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(`测试启动器失败：${error.message}`)
    process.exitCode = 1
  })
}
