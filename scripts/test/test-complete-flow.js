#!/usr/bin/env node

/**
 * 测试完整的新用户流程
 * 模拟从零开始的用户体验
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import logger from '../utils/logger.js'

async function cleanupTestEnvironment() {
  logger.info('🧹 清理测试环境...')
  
  // 删除数据库文件
  const dbPath = path.join('prisma', 'dev.db')
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath)
    logger.info('   删除数据库文件')
  }
  
  // 删除 Prisma 客户端
  const prismaClientPath = path.join('node_modules', '.prisma')
  if (fs.existsSync(prismaClientPath)) {
    fs.rmSync(prismaClientPath, { recursive: true, force: true })
    logger.info('   删除 Prisma 客户端')
  }
  
  // 删除 .env 文件
  const envPath = '.env'
  if (fs.existsSync(envPath)) {
    fs.unlinkSync(envPath)
    logger.info('   删除 .env 文件')
  }
}

async function testCompleteFlow() {
  logger.info('🧪 测试完整新用户流程...')
  
  try {
    // 1. 清理环境，模拟新用户状态
    await cleanupTestEnvironment()
    
    // 2. 测试 quick-start 命令
    logger.info('🚀 测试 pnpm run quick-start...')
    
    return new Promise((resolve) => {
      const child = spawn('npm', ['run', 'quick-start'], {
        env: { ...process.env, PORT: '3095' },
        stdio: 'pipe'
      })
      
      let output = ''
      let hasStarted = false
      let hasAccessCodes = false
      
      child.stdout.on('data', (data) => {
        const text = data.toString()
        output += text
        console.log(text.trim())
        
        // 检查是否显示了访问码
        if (text.includes('管理员访问码:')) {
          hasAccessCodes = true
          logger.info('✅ 访问码生成成功')
        }
        
        // 检查是否启动成功
        if (text.includes('服务启动成功') && text.includes('3095')) {
          logger.info('✅ 服务启动成功，端口配置正确')
          hasStarted = true
          
          // 等待 2 秒后关闭
          setTimeout(() => {
            child.kill('SIGTERM')
          }, 2000)
        }
      })
      
      child.stderr.on('data', (data) => {
        console.error(data.toString())
      })
      
      child.on('close', (_code) => {
        logger.info('')
        if (hasStarted && hasAccessCodes) {
          logger.info('🎉 完整流程测试通过！')
          logger.info('✅ 新用户可以通过 "pnpm run quick-start" 一键启动')
        } else {
          logger.error('❌ 完整流程测试失败')
          if (!hasAccessCodes) logger.error('   - 访问码未生成')
          if (!hasStarted) logger.error('   - 服务未启动')
        }
        resolve()
      })
      
      // 15秒超时
      setTimeout(() => {
        if (!child.killed) {
          logger.warn('测试超时，强制关闭')
          child.kill('SIGKILL')
        }
      }, 15000)
    })
    
  } catch (error) {
    logger.error('测试失败:', error.message)
  }
}

// 运行测试
testCompleteFlow().catch(error => {
  logger.error('测试执行失败:', error)
  process.exit(1)
})