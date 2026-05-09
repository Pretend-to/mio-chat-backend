import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'
import logger from '../../utils/logger.js'

/**
 * 检查并创建 .env 文件
 */
export async function checkAndCreateEnv() {
  const envPath = path.join(process.cwd(), '.env')
  const envExamplePath = path.join(process.cwd(), '.env.example')
  
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    logger.warn('检测到 .env 文件不存在，正在自动从 .env.example 创建...')
    
    const adminCode = crypto.randomBytes(16).toString('base64')
    const userCode = crypto.randomBytes(16).toString('base64')
    
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
    
    logger.mark('✅ .env 文件已自动创建')
    logger.mark('🔐 自动生成的访问码：')
    logger.mark(`   管理员访问码: ${adminCode}`)
    logger.mark(`   普通用户访问码: ${userCode}`)
    logger.mark('💡 访问码已保存到 .env 文件中，你也可以随后手动修改。')
    
    // 强制加载新创建的环境变量到 process.env
    const lines = envContent.split('\n')
    for (const line of lines) {
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, value] = line.split('=')
        process.env[key.trim()] = value.trim()
      }
    }
  }
}

/**
 * 检查并修复 Prisma 客户端和数据库
 */
export async function checkAndFixPrisma() {
  let needsFix = false
  let fixReason = ''

  try {
    // 1. 尝试导入 Prisma 客户端
    const { PrismaClient } = await import('@prisma/client')
    const testClient = new PrismaClient()
    
    try {
      // 2. 尝试执行一个简单的查询来验证数据库表是否存在
      // 我们查一个核心表，比如 system_settings
      await testClient.systemSettings.findFirst()
      await testClient.$disconnect()
      logger.debug('Prisma 客户端和数据库检查通过')
    } catch (dbError) {
      needsFix = true
      fixReason = '数据库表结构未初始化'
      await testClient.$disconnect()
    }
  } catch (importError) {
    needsFix = true
    fixReason = 'Prisma 客户端未生成'
  }

  if (needsFix) {
    logger.warn(`检测到 ${fixReason}，正在自动修复...`)
    
    try {
      // 生成 Prisma 客户端
      logger.info('正在生成 Prisma 客户端...')
      execSync('npx prisma generate', { 
        stdio: 'inherit',
        cwd: process.cwd()
      })
      
      // 推送数据库架构
      logger.info('正在推送数据库架构...')
      execSync('npx prisma db push', { 
        stdio: 'inherit',
        cwd: process.cwd()
      })
      
      logger.info('✅ Prisma 客户端和数据库修复完成')
    } catch (fixError) {
      logger.error('❌ Prisma 客户端修复失败:', fixError.message)
      logger.error('请手动运行以下命令修复：')
      logger.error('  npx prisma generate')
      logger.error('  npx prisma db push')
      throw fixError
    }
  }
}

/**
 * 执行完整的项目初始化
 */
export async function performFullInitialization() {
  await checkAndCreateEnv()
  await checkAndFixPrisma()
}
