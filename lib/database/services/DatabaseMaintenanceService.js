import prismaManager from '../prisma.js'
import fs from 'fs'
import path from 'path'
import logger from '../../../utils/logger.js'

/**
 * 数据库维护与数据清退服务 (DatabaseMaintenanceService)
 * 负责定期清理过期审计日志、定时任务执行历史、截断 WAL 及碎片整理 (VACUUM)
 */
class DatabaseMaintenanceService {
  prisma = null

  async initialize() {
    if (!this.prisma) {
      await prismaManager.initialize()
      this.prisma = prismaManager.getClient()
    }
  }

  /**
   * 清理过期的大模型调用日志 (LLMCallLog)
   * @param {Object} options
   * @param {number} [options.days=30] 保留天数，默认 30 天
   * @returns {Promise<number>} 清理的条数
   */
  async cleanupExpiredLogs({ days = 30 } = {}) {
    await this.initialize()
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    try {
      const result = await this.prisma.lLMCallLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      })
      if (result.count > 0) {
        logger.info(`[DBMaintenance] 已清退 ${result.count} 条超过 ${days} 天的 LLM 调用日志 (截止时间: ${cutoffDate.toLocaleDateString()})`)
      }
      return result.count
    } catch (error) {
      logger.error('[DBMaintenance] 清理 LLM 调用日志失败:', error)
      return 0
    }
  }

  /**
   * 清理过期的定时任务执行记录 (TaskExecution)
   * @param {Object} options
   * @param {number} [options.days=7] 保留天数，默认 7 天
   * @returns {Promise<number>} 清理的条数
   */
  async cleanupExpiredTaskExecutions({ days = 7 } = {}) {
    await this.initialize()
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    try {
      const result = await this.prisma.taskExecution.deleteMany({
        where: {
          startedAt: {
            lt: cutoffDate
          },
          status: {
            in: ['completed', 'failed']
          }
        }
      })
      if (result.count > 0) {
        logger.info(`[DBMaintenance] 已清退 ${result.count} 条超过 ${days} 天的定时任务历史执行记录`)
      }
      return result.count
    } catch (error) {
      logger.error('[DBMaintenance] 清理定时任务执行记录失败:', error)
      return 0
    }
  }

  /**
   * 执行 WAL Checkpoint、SQLite 优化与可选的 VACUUM
   * @param {Object} options
   * @param {boolean} [options.vacuum=false] 是否执行物理整理收缩 (VACUUM)
   */
  async checkpointAndOptimize({ vacuum = false } = {}) {
    await this.initialize()
    try {
      // 1. 截断 WAL 文件，合并至主数据库文件
      await this.prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);')
      // 2. 优化 SQLite 查询规划器统计信息
      await this.prisma.$executeRawUnsafe('PRAGMA optimize;')

      // 3. 可选执行物理空间收缩 (VACUUM)
      if (vacuum) {
        logger.info('[DBMaintenance] 正在执行 SQLite VACUUM 磁盘空间物理整理与收缩...')
        const t0 = performance.now()
        await this.prisma.$executeRawUnsafe('VACUUM;')
        const t1 = performance.now()
        logger.info(`[DBMaintenance] SQLite VACUUM 整理完成，耗时: ${(t1 - t0).toFixed(2)}ms`)
      }
    } catch (error) {
      logger.error('[DBMaintenance] 执行 SQLite Checkpoint/VACUUM 失败:', error)
    }
  }

  /**
   * 执行全套数据库维护任务
   * @param {Object} options
   * @param {number} [options.logRetentionDays=30] 调用日志保留天数
   * @param {number} [options.taskRetentionDays=7] 任务历史保留天数
   * @param {boolean} [options.vacuum=false] 是否进行 VACUUM
   */
  async runFullMaintenance({ logRetentionDays = 30, taskRetentionDays = 7, vacuum = false } = {}) {
    logger.info('[DBMaintenance] 开始执行数据库定期清退与健康维护...')
    const t0 = performance.now()

    const dbPath = path.join(process.cwd(), 'prisma/data/app.db')
    let sizeBefore = 0
    try {
      if (fs.existsSync(dbPath)) {
        sizeBefore = fs.statSync(dbPath).size
      }
    } catch {}

    const logsCleaned = await this.cleanupExpiredLogs({ days: logRetentionDays })
    const tasksCleaned = await this.cleanupExpiredTaskExecutions({ days: taskRetentionDays })
    
    // 如果清理了大量数据，或者显式指定了 vacuum，则执行 checkpoint 与 optimize
    await this.checkpointAndOptimize({ vacuum: vacuum || (logsCleaned > 500) })

    let sizeAfter = 0
    try {
      if (fs.existsSync(dbPath)) {
        sizeAfter = fs.statSync(dbPath).size
      }
    } catch {}

    const t1 = performance.now()
    const sizeBeforeMB = (sizeBefore / (1024 * 1024)).toFixed(2)
    const sizeAfterMB = (sizeAfter / (1024 * 1024)).toFixed(2)

    logger.info(`[DBMaintenance] 数据库维护完成! 耗时: ${(t1 - t0).toFixed(2)}ms | 清理日志: ${logsCleaned}条 | 清理任务记录: ${tasksCleaned}条 | 库文件大小: ${sizeBeforeMB}MB -> ${sizeAfterMB}MB`)

    return {
      durationMs: t1 - t0,
      logsCleaned,
      sizeAfterMB,
      sizeBeforeMB,
      tasksCleaned,
    }
  }
}

export default new DatabaseMaintenanceService()
