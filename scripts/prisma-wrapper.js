#!/usr/bin/env node

/**
 * Prisma 包装器脚本
 * 智能选择使用本地或全局 Prisma
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import logger from '../utils/logger.js'

function findPrisma() {
  // 1. 尝试使用本地 node_modules 中的 prisma
  const localPrisma = path.join(process.cwd(), 'node_modules', '.bin', 'prisma')
  if (existsSync(localPrisma)) {
    return localPrisma
  }
  
  // 2. 尝试使用 pnpm 的 prisma
  const pnpmPrisma = path.join(process.cwd(), 'node_modules', '.pnpm', 'prisma@5.22.0', 'node_modules', '.bin', 'prisma')
  if (existsSync(pnpmPrisma)) {
    return pnpmPrisma
  }
  
  // 3. 使用 npx（但指定版本以避免冲突）
  return 'npx'
}

function runPrisma(args) {
  const prismaCmd = findPrisma()
  const isNpx = prismaCmd === 'npx'
  
  // 如果使用 npx，需要添加 prisma 和版本
  const finalArgs = isNpx ? ['prisma@5.22.0', ...args] : args
  
  logger.info(`执行 Prisma 命令: ${prismaCmd} ${finalArgs.join(' ')}`)
  
  return new Promise((resolve, reject) => {
    const child = spawn(prismaCmd, finalArgs, {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    })
    
    child.on('error', (error) => {
      logger.error(`Prisma 命令执行失败: ${error.message}`)
      reject(error)
    })
    
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Prisma 命令退出码: ${code}`))
      }
    })
  })
}

// 获取命令行参数（去掉 node 和脚本名）
const args = process.argv.slice(2)

if (args.length === 0) {
  logger.error('请提供 Prisma 命令参数')
  process.exit(1)
}

// 运行 Prisma 命令
runPrisma(args).catch(error => {
  logger.error('Prisma 命令执行失败:', error.message)
  process.exit(1)
})