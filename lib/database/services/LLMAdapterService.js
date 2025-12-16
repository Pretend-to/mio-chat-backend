// lib/database/services/LLMAdapterService.js
import DatabaseManager from '../prisma.js'
import logger from '../../../utils/logger.js'

class LLMAdapterService {
  constructor() {
    this.prisma = null
  }

  async init() {
    if (!this.prisma) {
      this.prisma = DatabaseManager.getPrisma()
    }
  }

  // 根据适配器类型获取所有实例
  async getByType(adapterType) {
    await this.init()
    try {
      const adapters = await this.prisma.lLMAdapter.findMany({
        where: { adapterType },
        orderBy: { instanceName: 'asc' }
      })
      
      return adapters.map(this._parseAdapter)
    } catch (error) {
      logger.error('根据类型获取LLM适配器失败:', error)
      throw error
    }
  }

  // 根据适配器类型和实例名获取配置
  async getByTypeAndName(adapterType, instanceName) {
    await this.init()
    try {
      const adapter = await this.prisma.lLMAdapter.findUnique({
        where: {
          adapterType_instanceName: {
            adapterType,
            instanceName
          }
        }
      })
      
      return adapter ? this._parseAdapter(adapter) : null
    } catch (error) {
      logger.error('根据类型和名称获取LLM适配器失败:', error)
      throw error
    }
  }

  // 获取所有启用的适配器实例
  async getEnabled() {
    await this.init()
    try {
      const adapters = await this.prisma.lLMAdapter.findMany({
        where: { enabled: true },
        orderBy: [
          { adapterType: 'asc' },
          { instanceName: 'asc' }
        ]
      })
      
      return adapters.map(this._parseAdapter)
    } catch (error) {
      logger.error('获取启用的LLM适配器失败:', error)
      throw error
    }
  }

  // 创建或更新适配器实例
  async upsert(adapterType, instanceName, configData, enabled = true) {
    await this.init()
    try {
      const adapter = await this.prisma.lLMAdapter.upsert({
        where: {
          adapterType_instanceName: {
            adapterType,
            instanceName
          }
        },
        update: {
          configData: JSON.stringify(configData),
          enabled
        },
        create: {
          adapterType,
          instanceName,
          configData: JSON.stringify(configData),
          enabled
        }
      })
      
      logger.info(`保存LLM适配器配置成功: ${adapterType}/${instanceName}`)
      return this._parseAdapter(adapter)
    } catch (error) {
      logger.error('保存LLM适配器配置失败:', error)
      throw error
    }
  }

  // 批量保存适配器配置
  async saveBatch(adapters) {
    await this.init()
    try {
      await DatabaseManager.transaction(async (prisma) => {
        for (const adapter of adapters) {
          await prisma.lLMAdapter.upsert({
            where: {
              adapterType_instanceName: {
                adapterType: adapter.adapter_type,
                instanceName: adapter.instance_name
              }
            },
            update: {
              configData: JSON.stringify(adapter.config_data),
              enabled: adapter.enabled
            },
            create: {
              adapterType: adapter.adapter_type,
              instanceName: adapter.instance_name,
              configData: JSON.stringify(adapter.config_data),
              enabled: adapter.enabled
            }
          })
        }
      })
      
      logger.info(`批量保存LLM适配器配置成功: ${adapters.length} 项`)
      return true
    } catch (error) {
      logger.error('批量保存LLM适配器配置失败:', error)
      throw error
    }
  }

  // 启用/禁用适配器实例
  async setEnabled(adapterType, instanceName, enabled) {
    await this.init()
    try {
      const adapter = await this.prisma.lLMAdapter.update({
        where: {
          adapterType_instanceName: {
            adapterType,
            instanceName
          }
        },
        data: { enabled }
      })
      
      logger.info(`${enabled ? '启用' : '禁用'}LLM适配器成功: ${adapterType}/${instanceName}`)
      return this._parseAdapter(adapter)
    } catch (error) {
      if (error.code === 'P2025') {
        logger.warn(`LLM适配器不存在: ${adapterType}/${instanceName}`)
        return null
      }
      logger.error('设置LLM适配器状态失败:', error)
      throw error
    }
  }

  // 删除适配器实例
  async delete(adapterType, instanceName) {
    await this.init()
    try {
      await this.prisma.lLMAdapter.delete({
        where: {
          adapterType_instanceName: {
            adapterType,
            instanceName
          }
        }
      })
      
      logger.info(`删除LLM适配器成功: ${adapterType}/${instanceName}`)
      return true
    } catch (error) {
      if (error.code === 'P2025') {
        logger.warn(`LLM适配器不存在: ${adapterType}/${instanceName}`)
        return false
      }
      logger.error('删除LLM适配器失败:', error)
      throw error
    }
  }

  // 获取所有适配器配置，按类型组织
  async getAllGroupedByType() {
    await this.init()
    try {
      const adapters = await this.prisma.lLMAdapter.findMany({
        orderBy: [
          { adapterType: 'asc' },
          { instanceName: 'asc' }
        ]
      })
      
      const grouped = {}
      adapters.forEach(adapter => {
        if (!grouped[adapter.adapterType]) {
          grouped[adapter.adapterType] = []
        }
        
        grouped[adapter.adapterType].push(this._parseAdapter(adapter))
      })
      
      return grouped
    } catch (error) {
      logger.error('获取分组LLM适配器配置失败:', error)
      throw error
    }
  }

  // 检查适配器实例是否存在
  async exists(adapterType, instanceName) {
    await this.init()
    try {
      const count = await this.prisma.lLMAdapter.count({
        where: {
          adapterType,
          instanceName
        }
      })
      return count > 0
    } catch (error) {
      logger.error('检查LLM适配器存在性失败:', error)
      throw error
    }
  }

  // 获取适配器统计信息
  async getStats() {
    await this.init()
    try {
      const stats = await this.prisma.lLMAdapter.groupBy({
        by: ['adapterType'],
        _count: {
          id: true
        },
        _sum: {
          enabled: true
        },
        orderBy: {
          adapterType: 'asc'
        }
      })
      
      return stats.map(stat => ({
        adapterType: stat.adapterType,
        totalCount: stat._count.id,
        enabledCount: stat._sum.enabled || 0
      }))
    } catch (error) {
      logger.error('获取LLM适配器统计信息失败:', error)
      throw error
    }
  }

  // 获取所有适配器类型
  async getAdapterTypes() {
    await this.init()
    try {
      const types = await this.prisma.lLMAdapter.findMany({
        select: {
          adapterType: true
        },
        distinct: ['adapterType'],
        orderBy: {
          adapterType: 'asc'
        }
      })
      
      return types.map(type => type.adapterType)
    } catch (error) {
      logger.error('获取适配器类型失败:', error)
      throw error
    }
  }

  // 搜索适配器
  async search(keyword, limit = 50) {
    await this.init()
    try {
      const adapters = await this.prisma.lLMAdapter.findMany({
        where: {
          OR: [
            { adapterType: { contains: keyword } },
            { instanceName: { contains: keyword } }
          ]
        },
        orderBy: [
          { adapterType: 'asc' },
          { instanceName: 'asc' }
        ],
        take: limit
      })
      
      return adapters.map(this._parseAdapter)
    } catch (error) {
      logger.error('搜索LLM适配器失败:', error)
      throw error
    }
  }

  // 分页查询
  async findWithPagination(page = 1, pageSize = 20, filters = {}) {
    await this.init()
    try {
      const skip = (page - 1) * pageSize
      const where = {}
      
      if (filters.adapterType) where.adapterType = filters.adapterType
      if (filters.enabled !== undefined) where.enabled = filters.enabled
      if (filters.search) {
        where.OR = [
          { adapterType: { contains: filters.search } },
          { instanceName: { contains: filters.search } }
        ]
      }
      
      const [adapters, total] = await Promise.all([
        this.prisma.lLMAdapter.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: [
            { adapterType: 'asc' },
            { instanceName: 'asc' }
          ]
        }),
        this.prisma.lLMAdapter.count({ where })
      ])
      
      return {
        items: adapters.map(this._parseAdapter),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    } catch (error) {
      logger.error('分页查询LLM适配器失败:', error)
      throw error
    }
  }

  // 解析适配器数据（将JSON字符串转换为对象）
  _parseAdapter(adapter) {
    if (!adapter) return null
    
    try {
      return {
        ...adapter,
        configData: JSON.parse(adapter.configData)
      }
    } catch (error) {
      logger.warn(`解析适配器配置失败: ${adapter.adapterType}/${adapter.instanceName}`, error)
      return {
        ...adapter,
        configData: {}
      }
    }
  }
}

export default new LLMAdapterService()