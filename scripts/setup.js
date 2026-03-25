#!/usr/bin/env node

/**
 * 项目设置脚本
 * 自动完成新用户的项目初始化
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import logger from '../utils/logger.js'

function generateSecureCode() {
  return crypto.randomBytes(16).toString('base64')
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    logger.info(`执行命令: ${command} ${args.join(' ')}`)
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options
    })
    
    child.on('error', (error) => {
      logger.error(`命令执行失败: ${error.message}`)
      reject(error)
    })
    
    child.on('exit', (code) => {
      if (code === 0) {
        logger.info(`命令执行成功: ${command}`)
        resolve()
      } else {
        logger.error(`命令执行失败，退出码: ${code}`)
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })
  })
}

async function setupPrisma() {
  logger.info('🗄️  正在设置数据库...')
  
  try {
    // 生成 Prisma 客户端
    await runCommand('npm', ['run', 'db:generate'])
    
    // 推送数据库 schema
    await runCommand('npm', ['run', 'db:push'])
    
    logger.info('✅ 数据库设置完成')
  } catch (error) {
    logger.error('数据库设置失败:', error.message)
    throw error
  }
}

async function createEnvFile() {
  const envPath = path.join(process.cwd(), '.env')
  const envExamplePath = path.join(process.cwd(), '.env.example')
  
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    logger.info('📝 创建环境变量文件...')
    
    const adminCode = generateSecureCode()
    const userCode = generateSecureCode()
    
    const envContent = `# 管理员访问码（必须设置！）
ADMIN_CODE=${adminCode}

# 普通用户访问码（可选，留空则允许游客访问）
USER_CODE=${userCode}

# 服务器配置
# PORT=3080                    # 服务端口（默认：3080）
# HOST=0.0.0.0                 # 服务主机（默认：0.0.0.0）

# 其他可选配置
# NODE_ENV=production          # 运行环境
# DEBUG=true                   # 调试模式
# LOG_LEVEL=info              # 日志级别
`
    
    fs.writeFileSync(envPath, envContent)
    
    logger.info('✅ 环境变量文件已创建')
    logger.info('')
    logger.info('🔐 访问码信息：')
    logger.info(`管理员访问码: ${adminCode}`)
    logger.info(`普通用户访问码: ${userCode}`)
    logger.info('')
    logger.info('⚠️  请妥善保存这些访问码！')
    logger.info('💡 访问码已保存到 .env 文件中')
    logger.info('')
  } else if (fs.existsSync(envPath)) {
    logger.info('✅ 环境变量文件已存在')
  }
}

async function setup() {
  try {
    logger.info('🚀 开始设置 Mio-Chat 项目...')
    logger.info('')
    
    // 1. 创建环境变量文件
    await createEnvFile()
    
    // 2. 设置数据库
    await setupPrisma()
    
    logger.info('')
    logger.info('🎉 初始化完成！现在运行以下命令启动服务：')
    logger.info('')
    logger.info('   pnpm run dev')
    logger.info('')
    logger.info('🌐 默认访问地址: http://localhost:3080')
    logger.info('')
    
  } catch (error) {
    logger.error('❌ 项目设置失败:', error.message)
    logger.info('')
    logger.info('🔧 手动设置步骤：')
    logger.info('   1. pnpm install')
    logger.info('   2. pnpm run db:generate')
    logger.info('   3. pnpm run db:push')
    logger.info('   4. 复制 .env.example 到 .env 并设置访问码')
    logger.info('   5. node app.js')
    process.exit(1)
  }
}

// 运行设置
setup()