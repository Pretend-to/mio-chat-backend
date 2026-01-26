import prismaManager from '../prisma.js'
import logger from '../../../utils/logger.js'

/**
 * 系统配置服务层
 * 使用 Prisma ORM 管理系统配置数据
 */
class SystemSettingsService {
  constructor() {
    this.prisma = null
  }

  /**
   * 初始化服务
   */
  async initialize() {
    if (!this.prisma) {
      await prismaManager.initialize()
      this.prisma = prismaManager.getClient()
    }
  }

  /**
   * 获取所有配置
   */
  async findAll() {
    try {
      const settings = await this.prisma.systemSetting.findMany({
        orderBy: { key: 'asc' }
      })

      return settings.map(setting => this._parseSetting(setting))
    } catch (error) {
      logger.error('查询所有系统配置失败:', error)
      throw error
    }
  }

  /**
   * 根据键获取配置
   */
  async get(key) {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key }
      })

      return setting ? this._parseSetting(setting) : null
    } catch (error) {
      logger.error(`获取系统配置失败: ${key}`, error)
      throw error
    }
  }

  /**
   * 根据分类获取配置
   */
  async getByCategory(category) {
    try {
      const settings = await this.prisma.systemSetting.findMany({
        where: { category },
        orderBy: { key: 'asc' }
      })

      return settings.map(setting => this._parseSetting(setting))
    } catch (error) {
      logger.error(`根据分类获取系统配置失败: ${category}`, error)
      throw error
    }
  }

  /**
   * 获取按分类分组的所有配置
   */
  async getAllGroupedByCategory() {
    try {
      const settings = await this.findAll()
      const grouped = {}

      settings.forEach(setting => {
        if (!grouped[setting.category]) {
          grouped[setting.category] = {}
        }
        grouped[setting.category][setting.key] = setting.value
      })

      return grouped
    } catch (error) {
      logger.error('获取分组系统配置失败:', error)
      throw error
    }
  }

  /**
   * 设置配置值
   */
  async set(key, value, category = 'general', description = null) {
    try {
      const setting = await this.prisma.systemSetting.upsert({
        where: { key },
        update: {
          value: JSON.stringify(value),
          category,
          description
        },
        create: {
          key,
          value: JSON.stringify(value),
          category,
          description
        }
      })

      logger.info(`设置系统配置成功: ${key}`)
      return this._parseSetting(setting)
    } catch (error) {
      logger.error('设置系统配置失败:', error)
      throw error
    }
  }

  /**
   * 批量设置配置
   */
  async setBatch(settings) {
    try {
      const results = []

      for (const setting of settings) {
        const result = await this.set(
          setting.key,
          setting.value,
          setting.category || 'general',
          setting.description
        )
        results.push(result)
      }

      logger.info(`批量设置系统配置成功: ${results.length} 项`)
      return results
    } catch (error) {
      logger.error('批量设置系统配置失败:', error)
      throw error
    }
  }

  /**
   * 删除配置
   */
  async delete(key) {
    try {
      await this.prisma.systemSetting.delete({
        where: { key }
      })

      logger.info(`删除系统配置成功: ${key}`)
      return true
    } catch (error) {
      if (error.code === 'P2025') {
        logger.warn(`系统配置不存在: ${key}`)
        return false
      }
      logger.error('删除系统配置失败:', error)
      throw error
    }
  }

  /**
   * 检查配置是否存在
   */
  async exists(key) {
    try {
      const count = await this.prisma.systemSetting.count({
        where: { key }
      })
      return count > 0
    } catch (error) {
      logger.error('检查系统配置存在性失败:', error)
      throw error
    }
  }

  /**
   * 获取配置统计信息
   */
  async getStats() {
    try {
      const stats = await this.prisma.systemSetting.groupBy({
        by: ['category'],
        _count: {
          id: true
        },
        orderBy: {
          category: 'asc'
        }
      })

      return stats.map(stat => ({
        category: stat.category,
        count: stat._count.id
      }))
    } catch (error) {
      logger.error('获取系统配置统计信息失败:', error)
      throw error
    }
  }

  /**
   * 搜索配置
   */
  async search(keyword, limit = 50) {
    try {
      const settings = await this.prisma.systemSetting.findMany({
        where: {
          OR: [
            { key: { contains: keyword } },
            { description: { contains: keyword } }
          ]
        },
        orderBy: { key: 'asc' },
        take: limit
      })

      return settings.map(setting => this._parseSetting(setting))
    } catch (error) {
      logger.error('搜索系统配置失败:', error)
      throw error
    }
  }

  /**
   * 重置分类配置
   */
  async resetCategory(category) {
    try {
      const result = await this.prisma.systemSetting.deleteMany({
        where: { category }
      })

      logger.info(`重置分类配置成功: ${category}, 删除 ${result.count} 项`)
      return result.count
    } catch (error) {
      logger.error(`重置分类配置失败: ${category}`, error)
      throw error
    }
  }

  /**
   * 导出配置
   */
  async exportSettings(category = null) {
    try {
      const where = category ? { category } : {}
      const settings = await this.prisma.systemSetting.findMany({
        where,
        orderBy: { key: 'asc' }
      })

      const exported = {}
      settings.forEach(setting => {
        const parsedSetting = this._parseSetting(setting)
        exported[setting.key] = {
          value: parsedSetting.value,
          category: setting.category,
          description: setting.description
        }
      })

      return exported
    } catch (error) {
      logger.error('导出系统配置失败:', error)
      throw error
    }
  }

  /**
   * 导入配置
   */
  async importSettings(settings, overwrite = false) {
    try {
      const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
      }

      for (const [key, config] of Object.entries(settings)) {
        try {
          const exists = await this.exists(key)
          
          if (exists && !overwrite) {
            results.skipped++
            continue
          }

          await this.set(
            key,
            config.value,
            config.category || 'general',
            config.description
          )

          if (exists) {
            results.updated++
          } else {
            results.created++
          }
        } catch (error) {
          results.errors.push({
            key,
            error: error.message
          })
        }
      }

      logger.info(`导入系统配置完成: 创建 ${results.created}, 更新 ${results.updated}, 跳过 ${results.skipped}, 错误 ${results.errors.length}`)
      return results
    } catch (error) {
      logger.error('导入系统配置失败:', error)
      throw error
    }
  }

  /**
   * 解析配置数据（将 JSON 字符串转换为对象）
   * @private
   */
  _parseSetting(setting) {
    if (!setting) return null

    try {
      return {
        ...setting,
        value: JSON.parse(setting.value)
      }
    } catch (error) {
      logger.error(`解析系统配置数据失败: ${setting.key}`, error)
      return {
        ...setting,
        value: setting.value // 如果解析失败，返回原始字符串
      }
    }
  }
}

export default new SystemSettingsService()