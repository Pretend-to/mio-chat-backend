#!/usr/bin/env node

/**
 * 开发模式启动脚本
 * 直接启动应用，自动处理访问码生成
 */

import { spawn } from 'child_process'
import logger from '../utils/logger.js'

function startApp() {
  logger.info('🚀 启动 Mio-Chat 开发服务器...')
  
  const child = spawn('node', ['app.js'], {
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

startApp()