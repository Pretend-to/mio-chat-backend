import prismaManager from '../prisma.js'
import logger from '../../../utils/logger.js'

/**
 * 插件配置服务层
 * 使用 Prisma ORM 管理插件配置数据
 */
class PluginConfigService {
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
   * 获取所有插件配置
   */
  async findAll() {
    try {
      const configs = await this.prisma.pluginConfig.findMany({
        orderBy: { pluginName: 'asc' }
      })

      return configs.map(config => this._parseConfig(config))
    } catch (error) {
      logger.error('查询所有插件配置失败:', error)
      throw error
    }
  }

  /**
   * 根据插件名称获取配置
   */
  async findByName(pluginName) {
    try {
      const config = await this.prisma.pluginConfig.findUnique({
        where: { pluginName }
      })

      return config ? this._parseConfig(config) : null
    } catch (error) {
      logger.error(`根据名称查询插件配置失败: ${pluginName}`, error)
      throw error
    }
  }

  /**
   * 获取启用的插件配置
   */
  async findEnabled() {
    try {
      const configs = await this.prisma.pluginConfig.findMany({
        where: { enabled: true },
        orderBy: { pluginName: 'asc' }
      })

      return configs.map(config => this._parseConfig(config))
    } catch (error) {
      logger.error('查询启用的插件配置失败:', error)
      throw error
    }
  }

  /**
   * 创建插件配置
   */
  async create(pluginName, configData, enabled = true) {
    try {
      const config = await this.prisma.pluginConfig.create({
        data: {
          pluginName,
          configData: JSON.stringify(configData),
          enabled
        }
      })

      logger.info(`创建插件配置成功: ${pluginName}`)
      return this._parseConfig(config)
    } catch (error) {
      logger.error('创建插件配置失败:', error)
      throw error
    }
  }

  /**
   * 更新插件配置
   */
  async update(pluginName, configData, enabled = null) {
    try {
      const updateData = {
        configData: JSON.stringify(configData)
      }

      if (enabled !== null) {
        updateData.enabled = enabled
      }

      const config = await this.prisma.pluginConfig.update({
        where: { pluginName },
        data: updateData
      })

      logger.info(`更新插件配置成功: ${pluginName}`)
      return this._parseConfig(config)
    } catch (error) {
      if (error.code === 'P2025') {
        logger.warn(`插件配置不存在: ${pluginName}`)
        return null
      }
      logger.error('更新插件配置失败:', error)
      throw error
    }
  }

  /**
   * 设置插件启用状态
   */
  async setEnabled(pluginName, enabled) {
    try {
      const config = await this.prisma.pluginConfig.update({
        where: { pluginName },
        data: { enabled }
      })

      logger.info(`设置插件状态成功: ${pluginName} -> ${enabled ? '启用' : '禁用'}`)
      return this._parseConfig(config)
    } catch (error) {
      if (error.code === 'P2025') {
        logger.warn(`插件配置不存在: ${pluginName}`)
        return null
      }
      logger.error('设置插件状态失败:', error)
      throw error
    }
  }

  /**
   * 删除插件配置
   */
  async delete(pluginName) {
    try {
      await this.prisma.pluginConfig.delete({
        where: { pluginName }
      })

      logger.info(`删除插件配置成功: ${pluginName}`)
      return true
    } catch (error) {
      if (error.code === 'P2025') {
        logger.warn(`插件配置不存在: ${pluginName}`)
        return false
      }
      logger.error('删除插件配置失败:', error)
      throw error
    }
  }

  /**
   * 检查插件配置是否存在
   */
  async exists(pluginName) {
    try {
      const count = await this.prisma.pluginConfig.count({
        where: { pluginName }
      })
      return count > 0
    } catch (error) {
      logger.error('检查插件配置存在性失败:', error)
      throw error
    }
  }

  /**
   * 获取插件配置统计信息
   */
  async getStats() {
    try {
      const [total, enabled, disabled] = await Promise.all([
        this.prisma.pluginConfig.count(),
        this.prisma.pluginConfig.count({ where: { enabled: true } }),
        this.prisma.pluginConfig.count({ where: { enabled: false } })
      ])

      return {
        total,
        enabled,
        disabled
      }
    } catch (error) {
      logger.error('获取插件配置统计信息失败:', error)
      throw error
    }
  }

  /**
   * 搜索插件配置
   */
  async search(keyword, limit = 50) {
    try {
      const configs = await this.prisma.pluginConfig.findMany({
        where: {
          pluginName: { contains: keyword }
        },
        orderBy: { pluginName: 'asc' },
        take: limit
      })

      return configs.map(config => this._parseConfig(config))
    } catch (error) {
      logger.error('搜索插件配置失败:', error)
      throw error
    }
  }

  /**
   * 批量创建插件配置
   */
  async createMany(pluginConfigs) {
    try {
      const data = pluginConfigs.map(config => ({
        pluginName: config.pluginName,
        configData: JSON.stringify(config.configData),
        enabled: config.enabled !== undefined ? config.enabled : true
      }))

      const result = await this.prisma.pluginConfig.createMany({
        data,
        skipDuplicates: true
      })

      logger.info(`批量创建插件配置成功: ${result.count} 个`)
      return result
    } catch (error) {
      logger.error('批量创建插件配置失败:', error)
      throw error
    }
  }

  /**
   * 批量更新插件状态
   */
  async updateManyEnabled(pluginNames, enabled) {
    try {
      const result = await this.prisma.pluginConfig.updateMany({
        where: {
          pluginName: { in: pluginNames }
        },
        data: { enabled }
      })

      logger.info(`批量更新插件状态成功: ${result.count} 个插件 -> ${enabled ? '启用' : '禁用'}`)
      return result.count
    } catch (error) {
      logger.error('批量更新插件状态失败:', error)
      throw error
    }
  }

  /**
   * 导出插件配置
   */
  async exportConfigs() {
    try {
      const configs = await this.findAll()
      const exported = {}

      configs.forEach(config => {
        exported[config.pluginName] = {
          configData: config.configData,
          enabled: config.enabled
        }
      })

      return exported
    } catch (error) {
      logger.error('导出插件配置失败:', error)
      throw error
    }
  }

  /**
   * 导入插件配置
   */
  async importConfigs(configs, overwrite = false) {
    try {
      const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
      }

      for (const [pluginName, config] of Object.entries(configs)) {
        try {
          const exists = await this.exists(pluginName)
          
          if (exists && !overwrite) {
            results.skipped++
            continue
          }

          if (exists) {
            await this.update(pluginName, config.configData, config.enabled)
            results.updated++
          } else {
            await this.create(pluginName, config.configData, config.enabled)
            results.created++
          }
        } catch (error) {
          results.errors.push({
            pluginName,
            error: error.message
          })
        }
      }

      logger.info(`导入插件配置完成: 创建 ${results.created}, 更新 ${results.updated}, 跳过 ${results.skipped}, 错误 ${results.errors.length}`)
      return results
    } catch (error) {
      logger.error('导入插件配置失败:', error)
      throw error
    }
  }

  /**
   * 解析配置数据（将 JSON 字符串转换为对象）
   * @private
   */
  _parseConfig(config) {
    if (!config) return null

    try {
      return {
        ...config,
        configData: JSON.parse(config.configData)
      }
    } catch (error) {
      logger.error(`解析插件配置数据失败: ${config.pluginName}`, error)
      return {
        ...config,
        configData: {} // 如果解析失败，返回空对象
      }
    }
  }
}

export default new PluginConfigService()