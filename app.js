import { statusCheck } from './lib/check.js'
import { startServer } from './lib/server/http/index.js'
import prismaManager from './lib/database/prisma.js'
import PresetService from './lib/database/services/PresetService.js'
import SystemSettingsService from './lib/database/services/SystemSettingsService.js'
import PluginConfigService from './lib/database/services/PluginConfigService.js'
import initializeDefaults from './scripts/initialize-defaults.js'
import logger from './utils/logger.js'
// import taskScheduler from './lib/corn.js'

// 全局变量存储服务器实例
let httpServer = null
let isShuttingDown = false

/**
 * 初始化数据库和服务
 */
async function initializeDatabase() {
  try {
    logger.info('初始化数据库连接...')
    
    // 初始化 Prisma 管理器
    await prismaManager.initialize()
    
    // 初始化所有服务
    await PresetService.initialize()
    await SystemSettingsService.initialize()
    await PluginConfigService.initialize()
    
    // 初始化默认配置
    logger.info('初始化默认配置...')
    await initializeDefaults()
    
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
    // 初始化数据库
    await initializeDatabase()
    
    // 等待配置初始化完成
    const config = (await import('./lib/config.js')).default
    await config._waitForInit()
    
    // 系统状态检查
    await statusCheck()
    
    // 启动服务器并保存实例
    httpServer = await startServer()
    
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
