#!/usr/bin/env node

/**
 * 测试新用户体验
 * 模拟新用户克隆项目后的操作流程
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import logger from '../utils/logger.js'

async function testNewUserExperience() {
  logger.info('🧪 测试新用户体验...')
  
  try {
    // 1. 检查 node_modules 是否存在
    const nodeModulesExists = fs.existsSync('node_modules')
    logger.info(`Node modules 存在: ${nodeModulesExists}`)
    
    // 2. 检查 Prisma 客户端是否存在
    const prismaClientPath = path.join('node_modules', '.prisma', 'client')
    const prismaClientExists = fs.existsSync(prismaClientPath)
    logger.info(`Prisma 客户端存在: ${prismaClientExists}`)
    
    // 3. 检查数据库文件是否存在
    const dbPath = path.join('prisma', 'dev.db')
    const dbExists = fs.existsSync(dbPath)
    logger.info(`数据库文件存在: ${dbExists}`)
    
    // 4. 测试 quick-start 脚本
    logger.info('🚀 测试 quick-start 脚本...')
    
    return new Promise((resolve) => {
      const child = spawn('node', ['scripts/quick-start.js'], {
        env: { ...process.env, PORT: '3090' },
        stdio: 'pipe'
      })
      
      let output = ''
      let hasStarted = false
      
      child.stdout.on('data', (data) => {
        const text = data.toString()
        output += text
        console.log(text.trim())
        
        if (text.includes('服务启动成功') && text.includes('3090')) {
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
        if (hasStarted) {
          logger.info('✅ 新用户体验测试通过')
        } else {
          logger.error('❌ 服务未能正常启动')
        }
        resolve()
      })
      
      // 10秒超时
      setTimeout(() => {
        if (!child.killed) {
          logger.warn('测试超时，强制关闭')
          child.kill('SIGKILL')
        }
      }, 10000)
    })
    
  } catch (error) {
    logger.error('测试失败:', error.message)
  }
}

// 运行测试
testNewUserExperience().catch(error => {
  logger.error('测试执行失败:', error)
  process.exit(1)
})