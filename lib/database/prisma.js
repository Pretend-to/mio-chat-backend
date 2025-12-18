import pkg from '@prisma/client'
const { PrismaClient } = pkg
import logger from '../../utils/logger.js'

/**
 * Prisma 数据库管理器
 * 负责数据库连接、断开和客户端实例管理
 */
class PrismaManager {
  constructor() {
    this.prisma = null
    this.isConnected = false
  }

  /**
   * 初始化 Prisma Client
   */
  async initialize() {
    if (this.prisma) {
      return this.prisma
    }

    try {
      this.prisma = new PrismaClient({
        log: [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'info' },
          { emit: 'event', level: 'warn' },
        ],
        datasources: {
          db: {
            url: 'file:./data/app.db'
          }
        }
      })

      // 设置日志事件监听
      this.prisma.$on('error', (e) => {
        logger.error('Prisma 错误:', e)
      })

      this.prisma.$on('warn', (e) => {
        logger.warn('Prisma 警告:', e)
      })

      this.prisma.$on('info', (e) => {
        logger.info('Prisma 信息:', e)
      })

      // 在调试模式下记录查询
      if (global.debug) {
        this.prisma.$on('query', (e) => {
          logger.debug(`Prisma 查询: ${e.query} - 参数: ${e.params} - 耗时: ${e.duration}ms`)
        })
      }

      await this.connect()
      logger.info('Prisma 数据库管理器初始化完成')
      
      return this.prisma
    } catch (error) {
      logger.error('Prisma 初始化失败:', error)
      throw error
    }
  }

  /**
   * 连接数据库
   */
  async connect() {
    if (this.isConnected) {
      return
    }

    try {
      await this.prisma.$connect()
      this.isConnected = true
      logger.info('Prisma 数据库连接成功')
    } catch (error) {
      logger.error('Prisma 数据库连接失败:', error)
      throw error
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect() {
    if (!this.prisma || !this.isConnected) {
      return
    }

    try {
      await this.prisma.$disconnect()
      this.isConnected = false
      logger.info('Prisma 数据库连接已关闭')
    } catch (error) {
      logger.error('Prisma 数据库断开连接失败:', error)
    }
  }

  /**
   * 获取 Prisma Client 实例
   */
  getClient() {
    if (!this.prisma) {
      throw new Error('Prisma 未初始化，请先调用 initialize()')
    }
    return this.prisma
  }

  /**
   * 检查数据库连接状态
   */
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { healthy: true, message: '数据库连接正常' }
    } catch (error) {
      return { healthy: false, message: `数据库连接异常: ${error.message}` }
    }
  }

  /**
   * 执行事务
   */
  async transaction(fn) {
    return await this.prisma.$transaction(fn)
  }
}

// 创建单例实例
const prismaManager = new PrismaManager()

// 注意：优雅关闭处理已移至主应用文件中统一管理

export default prismaManager