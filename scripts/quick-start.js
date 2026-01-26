#!/usr/bin/env node

/**
 * 快速启动脚本
 * 自动检查环境并启动应用
 */

import { spawn, execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import logger from '../utils/logger.js'

function generateSecureCode() {
  return crypto.randomBytes(16).toString('base64')
}

function checkPrismaClient() {
  try {
    // 检查 Prisma 客户端是否已生成
    const prismaClientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client')
    const prismaClientExists = fs.existsSync(prismaClientPath)
    
    // 同时检查数据库文件是否存在
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
    const dbExists = fs.existsSync(dbPath)
    
    return prismaClientExists && dbExists
  } catch (error) {
    return false
  }
}

function findPrismaCommand() {
  // 尝试不同的 Prisma 命令路径
  const commands = [
    'pnpm run db:generate',  // 使用 pnpm script
    'npx prisma@5.22.0 generate',  // 指定版本的 npx
    'pnpx prisma generate',  // pnpm 的 npx
    './node_modules/.bin/prisma generate'  // 本地二进制文件
  ]
  
  for (const cmd of commands) {
    try {
      execSync(cmd.replace('generate', '--help'), { stdio: 'pipe' })
      return cmd
    } catch {
      continue
    }
  }
  
  return 'pnpm run db:generate'  // 默认回退
}

async function ensurePrismaReady() {
  if (!checkPrismaClient()) {
    logger.info('🔧 检测到数据库未初始化，正在自动设置...')
    logger.info('   这可能需要几秒钟时间...')
    
    try {
      const baseCmd = findPrismaCommand()
      
      logger.info('   正在生成 Prisma 客户端...')
      execSync(baseCmd, { stdio: 'pipe' })
      
      logger.info('   正在初始化数据库...')
      execSync(baseCmd.replace('generate', 'db push'), { stdio: 'pipe' })
      
      logger.info('✅ 数据库设置完成')
    } catch (error) {
      logger.error('❌ 数据库设置失败')
      logger.error('错误信息:', error.message)
      logger.info('')
      logger.info('🔧 请尝试手动运行以下命令：')
      logger.info('   pnpm run setup')
      logger.info('   或者：')
      logger.info('   pnpm install && pnpm run db:generate && pnpm run db:push')
      process.exit(1)
    }
  }
}

function startApp() {
  const adminCode = process.env.ADMIN_CODE || generateSecureCode()
  const userCode = process.env.USER_CODE || generateSecureCode()
  
  logger.info('🚀 正在启动 Mio-Chat...')
  
  // 只在没有设置环境变量时显示生成的访问码
  if (!process.env.ADMIN_CODE) {
    logger.info('')
    logger.info('🔐 访问码信息：')
    logger.info(`管理员访问码: ${adminCode}`)
    logger.info(`普通用户访问码: ${userCode}`)
    logger.info('')
    logger.info('⚠️  请妥善保存这些访问码！')
    logger.info('💡 建议运行 "pnpm run setup" 来永久保存访问码')
    logger.info('')
  }
  
  const env = {
    ...process.env,
    ADMIN_CODE: adminCode,
    USER_CODE: userCode
  }
  
  const child = spawn('node', ['app.js'], {
    env,
    stdio: 'inherit'
  })
  
  child.on('error', (error) => {
    logger.error('启动失败:', error)
    process.exit(1)
  })
  
  child.on('exit', (code) => {
    logger.info(`应用已退出，退出码: ${code}`)
    process.exit(code)
  })
  
  // 处理退出信号
  process.on('SIGINT', () => {
    logger.info('收到退出信号，正在关闭应用...')
    child.kill('SIGINT')
  })
  
  process.on('SIGTERM', () => {
    logger.info('收到终止信号，正在关闭应用...')
    child.kill('SIGTERM')
  })
}

async function main() {
  try {
    await ensurePrismaReady()
    startApp()
  } catch (error) {
    logger.error('启动失败:', error.message)
    logger.info('')
    logger.info('🔧 请尝试运行以下命令来解决问题：')
    logger.info('   pnpm run setup    - 完整项目设置')
    logger.info('   pnpm install      - 安装依赖')
    logger.info('   npx prisma generate && npx prisma db push - 设置数据库')
    process.exit(1)
  }
}

main()