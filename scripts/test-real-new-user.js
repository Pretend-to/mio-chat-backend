#!/usr/bin/env node

/**
 * 测试真实新用户体验
 * 使用正确的数据库文件路径
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import logger from '../utils/logger.js'

async function cleanupNewUserEnvironment() {
  logger.info('🧹 清理新用户环境...')
  
  // 删除正确的数据库文件
  const dbPath = path.join('prisma', 'data', 'app.db')
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath)
    logger.info('   删除数据库文件: prisma/data/app.db')
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

async function testRealNewUser() {
  logger.info('🧪 测试真实新用户流程...')
  
  try {
    // 1. 清理环境，模拟新用户状态
    await cleanupNewUserEnvironment()
    
    // 2. 测试 quick-start 命令
    logger.info('🚀 测试 npm run quick-start...')
    
    return new Promise((resolve) => {
      const child = spawn('npm', ['run', 'quick-start'], {
        env: { ...process.env, PORT: '3099' },
        stdio: 'pipe'
      })
      
      let output = ''
      let hasStarted = false
      let hasAccessCodes = false
      let hasOwnersLoaded = false
      
      child.stdout.on('data', (data) => {
        const text = data.toString()
        output += text
        console.log(text.trim())
        
        // 检查是否显示了访问码
        if (text.includes('管理员访问码:')) {
          hasAccessCodes = true
          logger.info('✅ 访问码生成成功')
        }
        
        // 检查是否加载了 owners 配置
        if (text.includes('从数据库加载了') && text.includes('个模型所有者配置')) {
          const match = text.match(/从数据库加载了 (\d+) 个模型所有者配置/)
          if (match && parseInt(match[1]) > 0) {
            hasOwnersLoaded = true
            logger.info(`✅ 成功加载了 ${match[1]} 个模型所有者配置`)
          }
        }
        
        // 检查是否启动成功
        if (text.includes('服务启动成功') && text.includes('3099')) {
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
      
      child.on('close', (code) => {
        logger.info('')
        logger.info('📊 测试结果：')
        logger.info(`   访问码生成: ${hasAccessCodes ? '✅' : '❌'}`)
        logger.info(`   Owners 配置: ${hasOwnersLoaded ? '✅' : '❌'}`)
        logger.info(`   服务启动: ${hasStarted ? '✅' : '❌'}`)
        
        if (hasStarted && hasAccessCodes && hasOwnersLoaded) {
          logger.info('🎉 真实新用户流程测试通过！')
          logger.info('✅ 新用户可以正常启动并获得完整配置')
        } else {
          logger.error('❌ 真实新用户流程测试失败')
          if (!hasAccessCodes) logger.error('   - 访问码未生成')
          if (!hasOwnersLoaded) logger.error('   - Owners 配置未加载')
          if (!hasStarted) logger.error('   - 服务未启动')
        }
        resolve()
      })
      
      // 20秒超时
      setTimeout(() => {
        if (!child.killed) {
          logger.warn('测试超时，强制关闭')
          child.kill('SIGKILL')
        }
      }, 20000)
    })
    
  } catch (error) {
    logger.error('测试失败:', error.message)
  }
}

// 运行测试
testRealNewUser().catch(error => {
  logger.error('测试执行失败:', error)
  process.exit(1)
})