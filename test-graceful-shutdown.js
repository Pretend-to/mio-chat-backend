#!/usr/bin/env node

/**
 * 测试优雅关闭功能的脚本
 * 使用方法：node test-graceful-shutdown.js
 * 然后按 Ctrl+C 测试优雅关闭
 */

import { spawn } from 'child_process'
import path from 'path'

console.log('启动应用程序进行优雅关闭测试...')
console.log('应用启动后，请按 Ctrl+C 测试优雅关闭功能')
console.log('观察日志输出，确认所有资源都被正确清理')
console.log('=' * 50)

const appProcess = spawn('node', ['app.js'], {
  stdio: 'inherit',
  cwd: process.cwd()
})

appProcess.on('exit', (code, signal) => {
  console.log('\n' + '=' * 50)
  if (code === 0) {
    console.log('✅ 应用程序优雅关闭成功！')
  } else if (signal) {
    console.log(`⚠️  应用程序被信号 ${signal} 终止`)
  } else {
    console.log(`❌ 应用程序异常退出，退出码: ${code}`)
  }
})

appProcess.on('error', (error) => {
  console.error('❌ 启动应用程序失败:', error)
})

// 转发信号给子进程
process.on('SIGINT', () => {
  console.log('\n收到 SIGINT，转发给应用程序...')
  appProcess.kill('SIGINT')
})

process.on('SIGTERM', () => {
  console.log('\n收到 SIGTERM，转发给应用程序...')
  appProcess.kill('SIGTERM')
})