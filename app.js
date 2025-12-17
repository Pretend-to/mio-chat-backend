import { statusCheck } from './lib/check.js'
import { startServer } from './lib/server/http/index.js'
import prismaManager from './lib/database/prisma.js'
import PresetService from './lib/database/services/PresetService.js'
import SystemSettingsService from './lib/database/services/SystemSettingsService.js'
import PluginConfigService from './lib/database/services/PluginConfigService.js'
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
  
  try {
    // 1. 停止接受新连接
    if (httpServer) {
      logger.info('正在关闭 HTTP 服务器...')
      await new Promise((resolve, reject) => {
        httpServer.close((err) => {
          if (err) {
            logger.error('HTTP 服务器关闭失败:', err)
            reject(err)
          } else {
            logger.info('HTTP 服务器已关闭')
            resolve()
          }
        })
      })
    }
    
    // 2. 关闭数据库连接
    logger.info('正在关闭数据库连接...')
    await prismaManager.disconnect()
    
    logger.info('应用程序已优雅关闭')
    process.exit(0)
  } catch (error) {
    logger.error('优雅关闭过程中发生错误:', error)
    process.exit(1)
  }
}

// 应用启动流程
async function startApp() {
  try {
    // 初始化数据库
    await initializeDatabase()
    
    // 系统状态检查
    await statusCheck()
    
    // 启动服务器并保存实例
    httpServer = startServer()
    
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
