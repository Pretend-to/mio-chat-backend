#!/usr/bin/env node

/**
 * 快速启动脚本
 * 自动生成安全的访问码并启动应用
 */

import { spawn } from 'child_process'
import crypto from 'crypto'
import logger from '../utils/logger.js'

function generateSecureCode() {
  return crypto.randomBytes(16).toString('base64')
}

function startApp() {
  const adminCode = process.env.ADMIN_CODE || generateSecureCode()
  const userCode = process.env.USER_CODE || generateSecureCode()
  
  logger.info('🚀 正在启动 Mio-Chat...')
  logger.info('')
  logger.info('🔐 访问码信息：')
  logger.info(`管理员访问码: ${adminCode}`)
  logger.info(`普通用户访问码: ${userCode}`)
  logger.info('')
  logger.info('⚠️  请妥善保存这些访问码！')
  logger.info('')
  
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

startApp()