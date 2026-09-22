import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'
import logger from '../../utils/logger.js'
import { resolveDatabasePath } from '../database/databasePath.js'

export const REQUIRED_PERSISTENCE_TABLES = Object.freeze([
  'agent_meta',
  'agent_channel_bindings',
  'agents',
  'channel_routes',
  'channels',
  'crystals',
  'global_memories',
  'legacy_migrations',
  'message_chunks',
  'messages',
  'pending_memories',
  'session_archives',
  'sessions',
  'task_executions',
  'tasks',
  'tool_calls',
  'trigger_executions',
  'triggers',
])

// 启动时只允许做按 schema diff 的增量同步。整库 reset 必须由人工离线执行，
// 不能因为启动时检测到 hash 变化就静默删除用户数据。
export const SCHEMA_PUSH_COMMAND = 'npx prisma db push --accept-data-loss'

// 只读预检：把「当前库 → schema」的差异渲染成 SQL，用于在执行前识别会重建表/丢数据的变更。
export const SCHEMA_DIFF_COMMAND =
  'npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script'

/**
 * SQLite 上被视为「整表重建」的破坏性 DDL 特征：
 * Prisma 对改列名/改类型/改约束/删列一律走 CREATE new_x → INSERT SELECT → DROP x → RENAME，
 * 配合 `--accept-data-loss` 会静默丢数据，因此命中即拒绝自动执行。
 */
const DESTRUCTIVE_DDL_RULES = [
  {
    re: /DROP\s+TABLE\s+"?([\w]+)"?/gi,
    render: (match) => `DROP TABLE ${match[1]}`,
  },
  {
    re: /CREATE\s+TABLE\s+"?(new_[\w]+)"?/gi,
    render: (match) => `重建表 ${match[1].replace(/^new_/, '')}`,
  },
  {
    re: /DROP\s+COLUMN\s+"?([\w]+)"?/gi,
    render: (match) => `DROP COLUMN ${match[1]}`,
  },
]

/**
 * 只读获取「库 → schema」的 DDL。
 * 取不到（首次安装、库文件不存在、CLI 异常）时返回 null —— 预检只用于
 * 「能确定有风险时拦停」，绝不阻断正常的首次建库。
 */
function getSchemaPushDdl() {
  try {
    return execSync(SCHEMA_DIFF_COMMAND, {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    return null
  }
}

/** 从 DDL 中提取破坏性变更摘要（去重） */
export function findDestructiveSchemaChanges(ddl) {
  if (!ddl) return []
  const found = new Set()
  for (const rule of DESTRUCTIVE_DDL_RULES) {
    for (const match of ddl.matchAll(rule.re)) {
      found.add(rule.render(match))
    }
  }
  return [...found]
}

export function findMissingPersistenceTables(existingTables) {
  const existing = new Set(existingTables)
  return REQUIRED_PERSISTENCE_TABLES.filter(table => !existing.has(table))
}

async function inspectPersistenceSchema(prisma) {
  const rows = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type = 'table'")
  return findMissingPersistenceTables(rows.map(row => row.name))
}

/**
 * 在执行可能重建受影响表的 schema 同步前，创建一个一致的 SQLite 备份。
 *
 * better-sqlite3 的 backup API 会正确处理 WAL，而不是只复制主数据库文件。
 * 这样即使 schema 变更涉及列删除或不兼容类型，仍可以恢复同步前的数据。
 */
async function backupDatabaseBeforeSchemaSync(databasePath) {
  if (!fs.existsSync(databasePath)) return null

  const timestamp = new Date().toISOString().replace(/[.:]/g, '-')
  const backupPath = `${databasePath}.before-schema-sync-${timestamp}.bak`
  const BetterSqlite3 = (await import('better-sqlite3')).default
  const backupDatabase = new BetterSqlite3(databasePath, {
    fileMustExist: true,
    readonly: true,
  })

  try {
    await backupDatabase.backup(backupPath)
    return backupPath
  } finally {
    backupDatabase.close()
  }
}

/**
 * 数据库「被静默重建」保护：
 * data/app.db 不存在时，若同目录还留着备份 / WAL / 密钥等痕迹，说明这是一个
 * 曾经有数据的实例（而不是首次安装），直接拒绝自动创建空库 —— 避免
 * `git clean -xfd`、误删目录、路径改动这类事故被“无声地重置成新实例”。
 */
export function assertDatabaseIntact() {
  const databasePath = resolveDatabasePath()
  if (fs.existsSync(databasePath)) return

  const dataDir = path.dirname(databasePath)
  const leftovers = fs.existsSync(dataDir)
    ? fs.readdirSync(dataDir).filter((file) => file !== '.DS_Store')
    : []
  const backups = leftovers.filter(
    (file) => file.includes('.before-schema-sync-') || file.endsWith('.bak'),
  )
  const traces = leftovers.filter(
    (file) => file.startsWith('app.db-') || file === 'channel-storage.key',
  )
  if (backups.length === 0 && traces.length === 0) return // 真·首次安装

  const newestBackup = backups.toSorted().at(-1)
  throw new Error(
    [
      '❌ 数据库文件不存在，但检测到这是「曾经有数据」的实例，拒绝自动创建空库。',
      `   data 目录: ${dataDir}`,
      `   残留文件: ${leftovers.join(', ') || '(空)'}`,
      newestBackup
        ? `   最新备份: data/${newestBackup}\n   恢复: cp data/${newestBackup} data/app.db`
        : '   未发现 .before-schema-sync-*.bak，请从外部备份恢复',
      '   确认要全新开始时，手动清空 data/ 目录后再启动。',
    ].join('\n'),
  )
}

/**
 * 执行按 schema diff 的增量同步。
 * 未受影响的表和记录会保留；这里绝不能使用 --force-reset，
 * 也不能手动删除 app.db、app.db-wal 或 app.db-shm。
 */
async function pushSchemaIncrementally() {
  const databasePath = resolveDatabasePath()

  // ① 破坏性变更预检（只读）：命中即拒绝自动 push，改由人工确认后手动执行。
  const destructive = findDestructiveSchemaChanges(getSchemaPushDdl())
  if (destructive.length > 0) {
    throw new Error(
      [
        '拒绝自动执行数据库结构同步：检测到破坏性变更（SQLite 会整表重建，可能丢数据）',
        `  受影响: ${destructive.join(', ')}`,
        '  请先备份 data/app.db，确认影响后人工执行：',
        `    ${SCHEMA_PUSH_COMMAND}`,
        '  （本次同步已跳过，应用不会带着未同步的结构继续启动。）',
      ].join('\n'),
    )
  }

  const backupPath = await backupDatabaseBeforeSchemaSync(databasePath)

  if (backupPath) {
    logger.info(`🛡️ Schema 同步前已创建数据库备份: ${backupPath}`)
  }

  execSync(SCHEMA_PUSH_COMMAND, {
    cwd: process.cwd(),
    env: { ...process.env, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes', RUST_LOG: process.env.RUST_LOG || 'debug' },
    stdio: 'inherit'
  })

  return backupPath
}

/**
 * 获取本地 Prisma 客户端实例的辅助函数
 */
async function getLocalPrismaClient() {
  try {
    await import('better-sqlite3')
    const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3')
    
    // 动态导入生成的客户端（Prisma 7 会自动转发）
    const { PrismaClient } = await import('@prisma/client')
    
    const dbPath = resolveDatabasePath()
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
      logger.info(`创建数据库目录: ${dbDir}`)
    }
    const adapter = new PrismaBetterSqlite3({
      url: `file:${dbPath}`
    })
    
    return new PrismaClient({ adapter })
  } catch (error) {
    const msg = error.message || ''
    if (msg.includes('better_sqlite3.node') || msg.includes('bindings')) {
      logger.error('❌ Prisma 驱动加载失败: 无法找到 better-sqlite3 原生模块。')
      logger.error('👉 请尝试在服务器上运行: pnpm install && pnpm rebuild better-sqlite3')
    } else if (msg.includes('NODE_MODULE_VERSION') || msg.includes('compiled against a different Node.js version')) {
      logger.error('❌ Prisma 驱动加载失败: better-sqlite3 原生模块版本与当前 Node.js 版本不匹配。')
      logger.error('👉 这是因为你切换了 Node 版本但没有重新编译。请运行: pnpm rebuild better-sqlite3')
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
    let prisma = await getLocalPrismaClient()
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
    if (!process.env.ADMIN_CODE) {process.env.ADMIN_CODE = adminCode}
    if (!process.env.USER_CODE) {process.env.USER_CODE = userCode}
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
        cwd: process.cwd(),
        env: { ...process.env, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes' },
        stdio: 'inherit'
      })
      
      // 推送数据库架构
      logger.info('正在推送数据库架构...')
      await pushSchemaIncrementally()
      
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
  
  if (!fs.existsSync(schemaPath)) {return}

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
        execSync('npx prisma generate', { 
          cwd: process.cwd(), 
          env: { ...process.env, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes', RUST_LOG: process.env.RUST_LOG || 'debug' },
          stdio: 'inherit' 
        })
        fs.writeFileSync(localHashPath, currentHash)
        logger.mark('✅ Prisma 客户端生成成功')
        
        // 生成客户端后，建议重启以确保加载最新代码
        // 如果我们同时也需要执行 db push，可以在下面统一处理
      } catch (genError) {
        logger.error('❌ Prisma 客户端生成失败:', genError.message)
        throw genError
      }
    }

    // 2. 检查数据库哈希（确保数据库结构是最新的）
    let prisma = await getLocalPrismaClient()
    
    try {
      const hashSetting = await prisma.systemSetting.findUnique({
        where: { key: '_schema_hash' }
      })
      
      const storedHash = hashSetting ? JSON.parse(hashSetting.value) : null
      const missingPersistenceTables = await inspectPersistenceSchema(prisma)
      
      if (storedHash !== currentHash || missingPersistenceTables.length > 0) {
        const reason = storedHash !== currentHash
          ? 'Schema hash 已变化'
          : `Schema hash 一致但缺少实际表: ${missingPersistenceTables.join(', ')}`
        logger.info(`🔄 ${reason}，正在自动同步数据库结构...`)
        
        // SQLite 文件不能在当前进程持有连接时被备份/同步。
        await prisma.$disconnect()
        await pushSchemaIncrementally()
        
        // schema 同步后重新建立客户端，再写入 schema hash。
        prisma = await getLocalPrismaClient()
        await prisma.systemSetting.upsert({
          create: { 
            category: 'system', 
            key: '_schema_hash', 
            value: JSON.stringify(currentHash)
          },
          update: { value: JSON.stringify(currentHash) },
          where: { key: '_schema_hash' }
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
 * 执行完整的初始化流程
 */
export async function performFullInitialization() {
  // 0. 检查 Node.js 版本（Prisma 7 强制要求）
  const version = process.versions.node.split('.').map(Number)
  const isV20Ok = version[0] === 20 && version[1] >= 19
  const isV22Ok = version[0] === 22 && version[1] >= 12
  const isV24PlusOk = version[0] >= 24
  
  if (!isV20Ok && !isV22Ok && !isV24PlusOk) {
    logger.error('❌ 运行环境不匹配: Prisma 7 要求 Node.js 版本 >= 20.19, 22.12 或 24.0+')
    logger.error(`当前 Node.js 版本: v${process.versions.node}`)
    logger.error('👉 请升级 Node.js 后再试。推荐使用 n 或 nvm 安装最新的 LTS 版本。')
    process.exit(1)
  }

  // 1. 数据库文件保护：拒绝在「曾经有数据」的实例上静默创建空库
  assertDatabaseIntact()
  // 2. 首先检查 .env
  await checkAndCreateEnv()
  // 3. 检查 Schema 同步（如果变更则会在此处 exit 并重启）
  await checkAndSyncSchema()
  // 4. 然后执行常规修复（表缺失等）
  await checkAndFixPrisma()
  // 5. 确保 TokenCipher 加解密密钥就绪
  if (process.env.MIOCHAT_TEST_ISOLATED !== '1') {
    const { ensureEncryptionKey } = await import('../chat/persistence/TokenCipher.js')
    await ensureEncryptionKey()
  }
}
