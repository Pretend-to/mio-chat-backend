// lib/database/services/SystemSettingsService.js
import DatabaseManager from '../prisma.js'
import logger from '../../../utils/logger.js'

class SystemSettingsService {
  constructor() {
    this.prisma = null
  }

  async init() {
    if (!this.prisma) {
      this.prisma = DatabaseManager.getPrisma()
    }
  }

  // 根据键名获取配置
  async get(key) {
    await this.init()
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key }
      })
      
      return setting ? this._parseSetting(setting) : null
    } catch (error) {
      logger.error('获取系统配置失败:', error)
      throw error
    }
  }

  // 根据分类获取配置
  async getByCategory(category) {
    await this.init()
    try {
      const settings = await this.prisma.systemSetting.findMany({
        where: { category },
        orderBy: { key: 'asc' }
      })
      
      const result = {}
      settings.forEach(setting => {
        const parsed = this._parseSetting(setting)
        result[parsed.key] = parsed.value
      })
      
      return result
    } catch (error) {
      logger.error('根据分类获取系统配置失败:', error)
      throw error
    }
  }

  // 设置配置值
  async set(key, value, category = 'general', description = '') {
    await this.init()
    try {
      const jsonValue = typeof value === 'string' ? value : JSON.stringify(value)
      
      const setting = await this.prisma.systemSetting.upsert({
        where: { key },
        update: {
          value: jsonValue,
          category,
          description
        },
        create: {
          key,
          value: jsonValue,
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

  // 批量设置配置
  async setBatch(configs) {
    await this.init()
    try {
      await DatabaseManager.transaction(async (prisma) => {
        for (const config of configs) {
          const jsonValue = typeof config.value === 'string' ? config.value : JSON.stringify(config.value)
          
          await prisma.systemSetting.upsert({
            where: { key: config.key },
            update: {
              value: jsonValue,
              category: config.category || 'general',
              description: config.description || ''
            },
            create: {
              key: config.key,
              value: jsonValue,
              category: config.category || 'general',
              description: config.description || ''
            }
          })
        }
      })
      
      logger.info(`批量设置系统配置成功: ${configs.length} 项`)
      return true
    } catch (error) {
      logger.error('批量设置系统配置失败:', error)
      throw error
    }
  }

  // 删除配置
  async delete(key) {
    await this.init()
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

  // 获取所有配置，按分类组织
  async getAllGroupedByCategory() {
    await this.init()
    try {
      const settings = await this.prisma.systemSetting.findMany({
        orderBy: [
          { category: 'asc' },
          { key: 'asc' }
        ]
      })
      
      const grouped = {}
      settings.forEach(setting => {
        if (!grouped[setting.category]) {
          grouped[setting.category] = {}
        }
        
        const parsed = this._parseSetting(setting)
        grouped[setting.category][setting.key] = parsed.value
      })
      
      return grouped
    } catch (error) {
      logger.error('获取分组系统配置失败:', error)
      throw error
    }
  }

  // 检查配置是否存在
  async exists(key) {
    await this.init()
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

  // 获取所有配置
  async getAll() {
    await this.init()
    try {
      const settings = await this.prisma.systemSetting.findMany({
        orderBy: { key: 'asc' }
      })
      
      return settings.map(this._parseSetting)
    } catch (error) {
      logger.error('获取所有系统配置失败:', error)
      throw error
    }
  }

  // 搜索配置
  async search(keyword, limit = 50) {
    await this.init()
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
      
      return settings.map(this._parseSetting)
    } catch (error) {
      logger.error('搜索系统配置失败:', error)
      throw error
    }
  }

  // 获取配置统计信息
  async getStats() {
    await this.init()
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

  // 导出配置为JSON
  async exportToJson() {
    await this.init()
    try {
      const grouped = await this.getAllGroupedByCategory()
      return JSON.stringify(grouped, null, 2)
    } catch (error) {
      logger.error('导出系统配置失败:', error)
      throw error
    }
  }

  // 从JSON导入配置
  async importFromJson(jsonData) {
    await this.init()
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
      const configs = []
      
      for (const [category, settings] of Object.entries(data)) {
        for (const [key, value] of Object.entries(settings)) {
          configs.push({
            key,
            value,
            category,
            description: `从JSON导入的${category}配置`
          })
        }
      }
      
      await this.setBatch(configs)
      logger.info(`从JSON导入系统配置成功: ${configs.length} 项`)
      return configs.length
    } catch (error) {
      logger.error('从JSON导入系统配置失败:', error)
      throw error
    }
  }

  // 解析配置数据（将JSON字符串转换为对象）
  _parseSetting(setting) {
    if (!setting) return null
    
    try {
      return {
        ...setting,
        value: JSON.parse(setting.value)
      }
    } catch {
      // 如果不是JSON，保持原值
      return {
        ...setting,
        value: setting.value
      }
    }
  }
}

export default new SystemSettingsService()