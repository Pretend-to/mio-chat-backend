import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'
import logger from '../../utils/logger.js'

/**
 * 获取本地 Prisma 客户端实例的辅助函数
 */
async function getLocalPrismaClient() {
  try {
    const { default: Database } = await import('better-sqlite3')
    const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3')
    
    // 动态导入生成的客户端（Prisma 7 会自动转发）
    const { PrismaClient } = await import('@prisma/client')
    
    const dbPath = path.join(process.cwd(), 'prisma/data/app.db')
    const adapter = new PrismaBetterSqlite3({
      url: `file:${dbPath}`
    })
    
    return new PrismaClient({ adapter })
  } catch (error) {
    if (error.message.includes('better_sqlite3.node') || error.message.includes('bindings')) {
      logger.error('❌ Prisma 驱动加载失败: 无法找到 better-sqlite3 原生模块。')
      logger.error('👉 请尝试在服务器上运行: pnpm install && pnpm rebuild better-sqlite3')
    }
    throw error
  }
}

/**
 * 检查并创建 .env 文件
 * 只有在环境变量、.env 文件以及数据库中均未发现管理员访问码时才自动创建
 */
export async function checkAndCreateEnv() {
  const envPath = path.join(process.cwd(), '.env')
  const envExamplePath = path.join(process.cwd(), '.env.example')

  // 1. 检查环境变量
  if (process.env.ADMIN_CODE) {
    logger.debug('检测到已存在 ADMIN_CODE 环境变量，跳过初始化创建')
    return
  }

  // 2. 检查 .env 文件
  if (fs.existsSync(envPath)) {
    return
  }

  // 3. 检查数据库（存量项目可能直接存数据库了）
  try {
    const prisma = await getLocalPrismaClient()
    const adminSetting = await prisma.systemSetting.findUnique({
      where: { key: 'admin_code' }
    })
    await prisma.$disconnect()
    
    if (adminSetting && adminSetting.value) {
      logger.debug('检测到数据库中已存在管理员访问码，跳过 .env 自动创建')
      return
    }
  } catch {
    // 如果数据库还没初始化或者报错，忽略，继续判断是否需要创建 .env
  }

  // 4. 只有在以上三处都没有时，且存在模板，才创建 .env
  if (fs.existsSync(envExamplePath)) {
    logger.warn('检测到系统未配置管理员访问码，正在自动创建默认配置...')
    
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
    logger.mark('🔐 自动生成的访问码（初次运行专用）：')
    logger.mark(`   管理员访问码: ${adminCode}`)
    logger.mark(`   普通用户访问码: ${userCode}`)
    logger.mark('💡 访问码已保存到 .env 文件中，建议进入后台后及时修改。')
    
    // 只有在变量确实不存在时才设置，避免覆盖
    if (!process.env.ADMIN_CODE) process.env.ADMIN_CODE = adminCode
    if (!process.env.USER_CODE) process.env.USER_CODE = userCode
  }
}

/**
 * 检查并修复 Prisma 客户端和数据库
 */
export async function checkAndFixPrisma() {
  let needsFix = false
  let fixReason = ''

  try {
    // 1. 尝试导入 Prisma 客户端并初始化
    const testClient = await getLocalPrismaClient()
    
    try {
      // 2. 尝试执行一个简单的查询来验证数据库表是否存在
      // 我们查一个核心表，比如 system_settings
      await testClient.systemSetting.findFirst()
      await testClient.$disconnect()
      logger.debug('Prisma 客户端和数据库检查通过')
    } catch (dbError) {
      await testClient.$disconnect()
      
      // P2021: The table {table} does not exist in the current database.
      if (dbError.code === 'P2021') {
        needsFix = true
        fixReason = '数据库表结构未初始化'
      } else {
        // 其他错误（如连接失败、权限问题等）不应触发自动修复，直接抛出
        logger.error('❌ 数据库连接测试失败 (非结构问题):', dbError.message)
        throw dbError
      }
    }
  } catch (importError) {
    // 如果是模块找不到，或者是 Prisma 自身报错
    if (importError.message.includes('Cannot find module') || 
        importError.message.includes('.prisma/client')) {
      needsFix = true
      fixReason = 'Prisma 客户端未生成'
    } else {
      throw importError
    }
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
      execSync('npx prisma db push --accept-data-loss', { 
        stdio: 'inherit',
        cwd: process.cwd()
      })
      
      logger.info('✅ Prisma 客户端和数据库修复完成')
      
      // 如果是修复了客户端，建议重启以确保加载最新代码
      logger.info('🚀 数据库结构已更新，正在准备重启应用以加载新版代码...')
      process.exit(0)
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
 * 检查 Schema 是否有更新并执行同步
 * 结合本地文件哈希和数据库哈希，确保代码和数据库均处于最新状态
 */
export async function checkAndSyncSchema() {
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma')
  const localHashPath = path.join(process.cwd(), 'prisma/.schema_hash')
  
  if (!fs.existsSync(schemaPath)) return

  try {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8')
    const currentHash = crypto.createHash('md5').update(schemaContent).digest('hex')
    
    // 1. 检查本地客户端哈希（确保 node_modules 中的客户端是最新的）
    let localHash = null
    if (fs.existsSync(localHashPath)) {
      localHash = fs.readFileSync(localHashPath, 'utf8').trim()
    }

    if (localHash !== currentHash) {
      logger.info('🔄 检测到本地 Prisma 客户端可能已过时，正在重新生成...')
      try {
        execSync('npx prisma generate', { stdio: 'inherit', cwd: process.cwd() })
        fs.writeFileSync(localHashPath, currentHash)
        logger.mark('✅ Prisma 客户端生成成功')
        
        // 生成客户端后，建议重启以确保加载最新代码
        // 如果我们同时也需要执行 db push，可以在下面统一处理
      } catch (genError) {
        logger.error('❌ Prisma 客户端生成失败:', genError.message)
        // 只有在关键失败时才退出
      }
    }

    // 2. 检查数据库哈希（确保数据库结构是最新的）
    const prisma = await getLocalPrismaClient()
    
    try {
      const hashSetting = await prisma.systemSetting.findUnique({
        where: { key: '_schema_hash' }
      })
      
      const storedHash = hashSetting ? JSON.parse(hashSetting.value) : null
      
      if (storedHash !== currentHash) {
        logger.info('🔄 检测到数据库结构变更，正在自动同步结构...')
        
        // 执行同步
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: process.cwd() })
        
        // 更新数据库中的哈希
        await prisma.systemSetting.upsert({
          where: { key: '_schema_hash' },
          update: { value: JSON.stringify(currentHash) },
          create: { 
            key: '_schema_hash', 
            value: JSON.stringify(currentHash),
            category: 'system'
          }
        })
        
        await prisma.$disconnect()
        logger.mark('✅ 数据库结构同步成功，正在重启以应用更改...')
        
        // 关键：必须退出进程，让守护进程重新拉起以加载新版客户端
        process.exit(0)
      }
      
      await prisma.$disconnect()
    } catch (dbError) {
      await prisma.$disconnect()
      // 如果表不存在，交给 checkAndFixPrisma 处理
      if (dbError.code !== 'P2021') {
        throw dbError
      }
    }
    
    // 如果本地哈希变了（说明生成了新客户端）但数据库哈希没变，我们也需要重启
    if (localHash !== currentHash) {
      logger.info('🚀 客户端已重新生成，正在重启以加载新版代码...')
      process.exit(0)
    }

  } catch (error) {
    logger.error('Schema 同步检查失败:', error.message)
    // 如果是由于找不到 Prisma 模块导致的失败，尝试继续让 checkAndFixPrisma 处理
    if (error.message.includes('Cannot find module') || error.message.includes('.prisma/client')) {
      return
    }
    // 其他严重错误则抛出
    throw error
  }
}

/**
 * 执行完整的项目初始化
 */
export async function performFullInitialization() {
  // 1. 首先检查 Schema 同步（如果变更则会在此处 exit）
  await checkAndSyncSchema()
  // 2. 然后执行常规修复（表缺失等）
  await checkAndFixPrisma()
  // 3. 最后检查配置环境
  await checkAndCreateEnv()
}
