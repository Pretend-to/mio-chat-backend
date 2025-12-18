#!/usr/bin/env node

/**
 * 测试默认端口配置
 */

import { spawn } from 'child_process'
import logger from '../utils/logger.js'

async function testDefaultPort() {
  logger.info('测试默认端口配置...')
  
  return new Promise((resolve) => {
    // 不设置 PORT 环境变量，使用默认配置
    const env = { ...process.env }
    delete env.PORT  // 确保没有 PORT 环境变量
    
    const serverProcess = spawn('node', ['app.js'], {
      env,
      stdio: 'pipe'
    })
    
    let output = ''
    
    // 监听输出
    serverProcess.stdout.on('data', (data) => {
      const text = data.toString()
      output += text
      console.log(text.trim())
      
      // 检查是否包含端口信息
      if (text.includes('服务启动成功')) {
        logger.info('✅ 检测到服务启动成功消息')
        if (text.includes('3080')) {
          logger.info('✅ 默认端口 3080 配置生效')
        } else {
          logger.warn('⚠️  未检测到默认端口 3080')
        }
        
        // 等待一秒后关闭服务器
        setTimeout(() => {
          serverProcess.kill('SIGTERM')
        }, 1000)
      }
    })
    
    serverProcess.stderr.on('data', (data) => {
      console.error(data.toString())
    })
    
    serverProcess.on('close', (code) => {
      logger.info(`服务器进程退出，退出码: ${code}`)
      resolve()
    })
    
    // 5秒后强制关闭
    setTimeout(() => {
      if (!serverProcess.killed) {
        logger.warn('5秒超时，强制关闭服务器')
        serverProcess.kill('SIGKILL')
      }
    }, 5000)
  })
}

// 运行测试
testDefaultPort().catch(error => {
  logger.error('测试失败:', error)
  process.exit(1)
})