import logger from './utils/logger.js'
// import taskScheduler from './lib/corn.js'

// 全局变量存储服务器实例
let httpServer = null
let isShuttingDown = false

/**
 * 检查并执行自动迁移（包括 OneBot 配置迁移）
 */
async function checkAndPerformAutoMigration(AutoMigrationDetector) {
  try {
    const detector = new AutoMigrationDetector()
    
    // 执行完整的迁移检查和处理
    const result = await detector.checkAndMigrate()
    
    if (!result.success && !result.noMigrationNeeded) {
      logger.error('自动迁移失败，请手动执行迁移')
      logger.error('错误信息:', result.error)
      process.exit(1)
    }
    
    if (result.noMigrationNeeded) {
      logger.debug('无需执行配置迁移，继续正常启动')
    }
  } catch (error) {
    logger.error('自动迁移检测失败:', error)
    // 不退出程序，继续正常启动流程
  }
}

/**
 * 动态导入所有依赖模块
 */
async function importDependencies() {
  const { statusCheck } = await import('./lib/check.js')
  const { startServer } = await import('./lib/server/http/index.js')
  const prismaManager = (await import('./lib/database/prisma.js')).default
  const PresetService = (await import('./lib/database/services/PresetService.js')).default
  const SystemSettingsService = (await import('./lib/database/services/SystemSettingsService.js')).default
  const PluginConfigService = (await import('./lib/database/services/PluginConfigService.js')).default
  const initializeDefaults = (await import('./scripts/initialize-defaults.js')).default
  const AutoMigrationDetector = (await import('./lib/migration/autoMigrationDetector.js')).default
  
  return {
    statusCheck,
    startServer,
    prismaManager,
    PresetService,
    SystemSettingsService,
    PluginConfigService,
    initializeDefaults,
    AutoMigrationDetector
  }
}

/**
 * 初始化数据库和服务
 */
async function initializeDatabase(dependencies) {
  const { 
    prismaManager, 
    PresetService, 
    SystemSettingsService, 
    PluginConfigService, 
    initializeDefaults,
    AutoMigrationDetector
  } = dependencies
  
  try {
    logger.info('初始化数据库连接...')
    
    // 初始化 Prisma 管理器
    await prismaManager.initialize()
    
    // 初始化所有服务
    await PresetService.initialize()
    await SystemSettingsService.initialize()
    await PluginConfigService.initialize()
    
    // 检查并执行自动迁移
    await checkAndPerformAutoMigration(AutoMigrationDetector)
    
    // 初始化默认配置
    logger.info('初始化默认配置...')
    await initializeDefaults()

    // 重新加载内存中的配置以同步刚刚写入数据库的默认值，
    // 避免后续的状态检查重复生成访问码
    try {
      const config = (await import('./lib/config.js')).default
      await config.reload()
      logger.info('配置已从数据库重新加载以应用默认值')
    } catch (err) {
      logger.warn('重新加载配置时发生问题，可能导致配置不同步:', err.message)
    }
    
    logger.info('数据库和服务初始化完成')
  } catch (error) {
    logger.error('数据库初始化失败:', error)
    process.exit(1)
  }
}

/**
 * 优雅关闭应用程序
 */
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn('已在关闭过程中，忽略重复信号')
    return
  }
  
  isShuttingDown = true
  logger.info(`收到 ${signal} 信号，开始优雅关闭...`)
  
  // 设置强制关闭超时（10秒）
  const forceExitTimer = setTimeout(() => {
    logger.warn('优雅关闭超时，强制退出应用程序')
    process.exit(1)
  }, 10000)
  
  try {
    // 1. 关闭 Socket.IO 服务器
    try {
      if (global.middleware && global.middleware.socketServer) {
        logger.info('正在关闭 Socket.IO 服务器...')
        await global.middleware.socketServer.close()
        logger.info('Socket.IO 服务器已关闭')
      }
    } catch (error) {
      logger.warn('Socket.IO 服务器关闭时出现警告:', error.message)
    }
    
    // 2. 停止接受新连接并强制关闭现有连接
    try {
      if (httpServer && httpServer.listening) {
        logger.info('正在关闭 HTTP 服务器...')
        
        // 强制关闭所有连接
        const connections = new Set()
        
        httpServer.on('connection', (connection) => {
          connections.add(connection)
          connection.on('close', () => {
            connections.delete(connection)
          })
        })
        
        // 先尝试优雅关闭
        const closePromise = new Promise((resolve) => {
          const timeout = setTimeout(() => {
            logger.warn('HTTP 服务器关闭超时，强制断开所有连接')
            // 强制断开所有连接
            for (const connection of connections) {
              try {
                connection.destroy()
              } catch {
                // 忽略连接销毁错误
              }
            }
            resolve()
          }, 3000) // 3秒超时
          
          httpServer.close((err) => {
            clearTimeout(timeout)
            if (err) {
              // 如果服务器已经关闭，不视为错误
              if (err.code === 'ERR_SERVER_NOT_RUNNING') {
                logger.info('HTTP 服务器已经关闭')
              } else {
                logger.warn('HTTP 服务器关闭时出现警告:', err.message)
              }
            } else {
              logger.info('HTTP 服务器已关闭')
            }
            resolve()
          })
        })
        
        await closePromise
      } else if (httpServer) {
        logger.info('HTTP 服务器已经关闭')
      }
    } catch (error) {
      logger.warn('HTTP 服务器关闭时出现警告:', error.message)
    }
    
    // 3. 关闭数据库连接
    try {
      logger.info('正在关闭数据库连接...')
      await prismaManager.disconnect()
      logger.info('数据库连接已关闭')
    } catch (error) {
      logger.warn('数据库关闭时出现警告:', error.message)
    }
    
    // 清除强制退出定时器
    clearTimeout(forceExitTimer)
    
    logger.info('应用程序已优雅关闭')
    process.exit(0)
  } catch (error) {
    logger.error('优雅关闭过程中发生错误:', error)
    clearTimeout(forceExitTimer)
    process.exit(1)
  }
}

// 应用启动流程
async function startApp() {
  try {
    // 自动初始化：从 lib/initialization 导入并执行
    const { performFullInitialization } = await import('./lib/initialization/index.js')
    await performFullInitialization()
    
    // 动态导入所有依赖
    const dependencies = await importDependencies()
    
    // 初始化数据库
    await initializeDatabase(dependencies)
    
    // 等待配置初始化完成
    const config = (await import('./lib/config.js')).default
    await config._waitForInit()
    
    // 系统状态检查
    await dependencies.statusCheck()
    
    // 初始化定时任务调度器
    const taskScheduler = (await import('./lib/cron.js')).default
    await taskScheduler.initialize(global.middleware.llm)
    
    // 启动服务器并保存实例
    httpServer = await dependencies.startServer()
    
    logger.info('应用启动完成')
  } catch (error) {
    logger.error('应用启动失败:', error)
    process.exit(1)
  }
}

// 设置信号处理器
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝:', reason, 'at:', promise)
  gracefulShutdown('unhandledRejection')
})

// 启动应用
startApp()

// const scheduler = new taskScheduler()
// scheduler.init()
