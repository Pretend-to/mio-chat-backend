// lib/database/prisma.js
import { PrismaClient } from '@prisma/client'
import logger from '../../utils/logger.js'

class DatabaseManager {
  constructor() {
    this.prisma = null
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return

    try {
      this.prisma = new PrismaClient({
        log: [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'stdout' },
          { level: 'info', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' },
        ],
      })

      // 监听查询日志（仅在调试模式下）
      if (global.debug) {
        this.prisma.$on('query', (e) => {
          logger.debug(`Query: ${e.query}`)
          logger.debug(`Params: ${e.params}`)
          logger.debug(`Duration: ${e.duration}ms`)
        })
      }

      // 测试连接
      await this.prisma.$connect()
      
      this.isInitialized = true
      logger.info('Prisma 数据库连接初始化完成')
    } catch (error) {
      logger.error('Prisma 数据库初始化失败:', error)
      throw error
    }
  }

  getPrisma() {
    if (!this.isInitialized) {
      throw new Error('数据库未初始化，请先调用 initialize()')
    }
    return this.prisma
  }

  // 事务支持
  async transaction(fn) {
    return await this.prisma.$transaction(fn)
  }

  // 执行原始SQL（如果需要）
  async executeRaw(sql, ...params) {
    return await this.prisma.$executeRaw(sql, ...params)
  }

  // 查询原始SQL（如果需要）
  async queryRaw(sql, ...params) {
    return await this.prisma.$queryRaw(sql, ...params)
  }

  async close() {
    if (this.prisma) {
      await this.prisma.$disconnect()
      this.isInitialized = false
      logger.info('Prisma 数据库连接已关闭')
    }
  }

  // 健康检查
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      logger.error('数据库健康检查失败:', error)
      return false
    }
  }
}

export default new DatabaseManager()