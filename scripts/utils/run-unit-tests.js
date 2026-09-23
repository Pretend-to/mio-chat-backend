#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

import {
  createIsolatedRoot,
  prepareTestDatabaseFixture,
  projectRoot,
  randomCredentials,
  removeIsolatedRoot,
} from './testIsolation.js'

/** 单测每个用例的默认死线（可用 TEST_TIMEOUT_MS 覆盖，0 = 不超时）*/
const DEFAULT_TEST_TIMEOUT_MS = 60_000

/** 递归收集测试文件：不依赖 shell glob，换 cwd 后依然稳定 */
async function collectTestFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectTestFiles(full)))
    } else if (entry.name.endsWith('.test.js')) {
      files.push(full)
    }
  }
  return files
}

/**
 * 目标可以是文件或目录。目录递归展开成 *.test.js 列表 ——
 * node --test 在隔离 cwd 下不接受裸目录（会报 test failed，什么也不跑）。
 */
async function expandTargets(targets) {
  const files = []
  for (const target of targets) {
    const absolute = path.resolve(projectRoot, target)
    const stat = await fs.stat(absolute).catch(() => null)
    if (stat?.isDirectory()) {
      files.push(...(await collectTestFiles(absolute)))
    } else {
      files.push(absolute)
    }
  }
  return files
}

/**
 * 单元测试启动器：让单测跑在**隔离库**上。
 *
 * 背景：单测以前直接以仓库为 cwd 运行，凡是 import Prisma 的用例都会写进
 * `data/app.db`（曾把 `legacy_migrations`/`test-multimodal-agent-*` 这类痕迹
 * 写进真库）。运行时库路径已收敛为 `<cwd>/data/app.db`，因此这里用「换 cwd」
 * 的方式隔离，不再依赖任何环境变量。
 *
 * 用法：pnpm test:unit [额外传给 node --test 的参数或测试文件]
 */
async function main() {
  const root = await createIsolatedRoot()
  const { adminCode, userCode } = randomCredentials()
  const databasePath = path.join(root, 'data', 'app.db')

  try {
    const fixture = await prepareTestDatabaseFixture(databasePath, {
      adminCode,
      userCode,
    })
    console.log(
      `🧪 单元测试运行于隔离环境: ${root}（数据库 fixture: ${fixture.source === 'live-copy' ? '真库一致副本' : '全新空库'}）`,
    )

    const targets = process.argv.slice(2)
    const testFiles =
      targets.length > 0
        ? await expandTargets(targets)
        : await collectTestFiles(path.join(projectRoot, 'tests'))

    // 每个用例的死线：Node 默认不超时，一个挂死的用例（漏了 close 的 setInterval /
    // 长连接）会让整个套件永生 —— 曾见测试进程挂死 5 天无人发现。
    // TEST_TIMEOUT_MS=0 可关掉（恢复 Node 默认行为）。
    const testTimeout = Number(
      process.env.TEST_TIMEOUT_MS ?? DEFAULT_TEST_TIMEOUT_MS,
    )
    if (testTimeout !== DEFAULT_TEST_TIMEOUT_MS) {
      console.log(`⏱  单测用例超时: ${testTimeout || '关闭'}`)
    }

    const child = spawn(
      process.execPath,
      [
        '--test',
        `--test-timeout=${testTimeout}`,
        // 光有超时不够：用例被判定失败后，它泄漏的 interval / socket 仍会撑住
        // 事件循环，进程照样不退出（僵尸就是这么来的）。force-exit 让套件跑完后
        // 直接退出，把「挂死」变成「失败 + 退出码非 0」。
        '--test-force-exit',
        ...testFiles,
      ],
      {
        cwd: root,
        // 不注入任何 env：单测里大量用例会 mock config / 鉴权，注入 ADMIN_CODE /
        // USER_CODE / NODE_ENV 会把它们 mock 掉的状态盖回去（曾导致 29 个用例失败）。
        stdio: 'inherit',
      },
    )

    const code = await new Promise((resolve) => {
      child.once('error', () => resolve(1))
      child.once('exit', (exitCode, signal) =>
        resolve(signal ? 1 : (exitCode ?? 1)),
      )
    })
    process.exitCode = code
  } finally {
    await removeIsolatedRoot(root)
  }
}

main().catch((error) => {
  console.error(`单元测试隔离启动失败: ${error.message}`)
  process.exitCode = 1
})
