// lib/database/services/PresetService.js
import DatabaseManager from '../prisma.js'
import logger from '../../../utils/logger.js'

class PresetService {
  constructor() {
    this.prisma = null
  }

  async init() {
    if (!this.prisma) {
      this.prisma = DatabaseManager.getPrisma()
    }
  }

  // 获取所有预设
  async findAll(orderBy = 'name') {
    await this.init()
    try {
      const presets = await this.prisma.preset.findMany({
        orderBy: { [orderBy]: 'asc' }
      })
      
      return presets.map(this._parsePreset)
    } catch (error) {
      logger.error('获取所有预设失败:', error)
      throw error
    }
  }

  // 根据名称查找预设
  async findByName(name) {
    await this.init()
    try {
      const preset = await this.prisma.preset.findUnique({
        where: { name }
      })
      
      return preset ? this._parsePreset(preset) : null
    } catch (error) {
      logger.error('根据名称查找预设失败:', error)
      throw error
    }
  }

  // 根据类型查找预设
  async findByType(type) {
    await this.init()
    try {
      const presets = await this.prisma.preset.findMany({
        where: { type },
        orderBy: { name: 'asc' }
      })
      
      return presets.map(this._parsePreset)
    } catch (error) {
      logger.error('根据类型查找预设失败:', error)
      throw error
    }
  }

  // 根据分类查找预设
  async findByCategory(category) {
    await this.init()
    try {
      const presets = await this.prisma.preset.findMany({
        where: { category },
        orderBy: { name: 'asc' }
      })
      
      return presets.map(this._parsePreset)
    } catch (error) {
      logger.error('根据分类查找预设失败:', error)
      throw error
    }
  }

  // 创建预设
  async create(presetData) {
    await this.init()
    try {
      const preset = await this.prisma.preset.create({
        data: {
          name: presetData.name,
          type: presetData.type || 'custom',
          category: presetData.category || 'common',
          history: JSON.stringify(presetData.history || []),
          opening: presetData.opening || '',
          textwrapper: presetData.textwrapper || '',
          tools: JSON.stringify(presetData.tools || []),
          recommended: presetData.recommended || false,
          hidden: presetData.hidden || false
        }
      })
      
      logger.info(`创建预设成功: ${presetData.name}`)
      return this._parsePreset(preset)
    } catch (error) {
      logger.error('创建预设失败:', error)
      throw error
    }
  }

  // 更新预设
  async update(name, presetData) {
    await this.init()
    try {
      const preset = await this.prisma.preset.update({
        where: { name },
        data: {
          history: JSON.stringify(presetData.history || []),
          opening: presetData.opening || '',
          textwrapper: presetData.textwrapper || '',
          tools: JSON.stringify(presetData.tools || []),
          recommended: presetData.recommended || false,
          hidden: presetData.hidden || false
        }
      })
      
      logger.info(`更新预设成功: ${name}`)
      return this._parsePreset(preset)
    } catch (error) {
      logger.error('更新预设失败:', error)
      throw error
    }
  }

  // 删除预设
  async delete(name) {
    await this.init()
    try {
      await this.prisma.preset.delete({
        where: { name }
      })
      
      logger.info(`删除预设成功: ${name}`)
      return true
    } catch (error) {
      if (error.code === 'P2025') {
        logger.warn(`预设不存在: ${name}`)
        return false
      }
      logger.error('删除预设失败:', error)
      throw error
    }
  }

  // 检查预设是否存在
  async exists(name) {
    await this.init()
    try {
      const count = await this.prisma.preset.count({
        where: { name }
      })
      return count > 0
    } catch (error) {
      logger.error('检查预设存在性失败:', error)
      throw error
    }
  }

  // 获取预设统计信息
  async getStats() {
    await this.init()
    try {
      const stats = await this.prisma.preset.groupBy({
        by: ['type', 'category'],
        _count: {
          id: true
        },
        orderBy: [
          { type: 'asc' },
          { category: 'asc' }
        ]
      })
      
      return stats.map(stat => ({
        type: stat.type,
        category: stat.category,
        count: stat._count.id
      }))
    } catch (error) {
      logger.error('获取预设统计信息失败:', error)
      throw error
    }
  }

  // 搜索预设
  async search(keyword, limit = 50) {
    await this.init()
    try {
      const presets = await this.prisma.preset.findMany({
        where: {
          OR: [
            { name: { contains: keyword } },
            { textwrapper: { contains: keyword } }
          ]
        },
        orderBy: { name: 'asc' },
        take: limit
      })
      
      return presets.map(this._parsePreset)
    } catch (error) {
      logger.error('搜索预设失败:', error)
      throw error
    }
  }

  // 分页查询
  async findWithPagination(page = 1, pageSize = 20, filters = {}) {
    await this.init()
    try {
      const skip = (page - 1) * pageSize
      const where = {}
      
      if (filters.type) where.type = filters.type
      if (filters.category) where.category = filters.category
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search } },
          { textwrapper: { contains: filters.search } }
        ]
      }
      
      const [presets, total] = await Promise.all([
        this.prisma.preset.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { name: 'asc' }
        }),
        this.prisma.preset.count({ where })
      ])
      
      return {
        items: presets.map(this._parsePreset),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    } catch (error) {
      logger.error('分页查询预设失败:', error)
      throw error
    }
  }

  // 批量创建预设
  async createMany(presets) {
    await this.init()
    try {
      const data = presets.map(preset => ({
        name: preset.name,
        type: preset.type || 'custom',
        category: preset.category || 'common',
        history: JSON.stringify(preset.history || []),
        opening: preset.opening || '',
        textwrapper: preset.textwrapper || '',
        tools: JSON.stringify(preset.tools || []),
        recommended: preset.recommended || false,
        hidden: preset.hidden || false
      }))
      
      const result = await this.prisma.preset.createMany({
        data,
        skipDuplicates: true
      })
      
      logger.info(`批量创建预设成功: ${result.count} 项`)
      return result.count
    } catch (error) {
      logger.error('批量创建预设失败:', error)
      throw error
    }
  }

  // 获取分类预设（兼容旧API）
  async getAllGroupedByCategory() {
    await this.init()
    try {
      const presets = await this.findAll()
      
      const grouped = {
        common: [],
        recommended: [],
        hidden: []
      }
      
      presets.forEach(preset => {
        if (grouped[preset.category]) {
          grouped[preset.category].push(preset)
        }
      })
      
      return grouped
    } catch (error) {
      logger.error('获取分组预设失败:', error)
      throw error
    }
  }

  // 解析预设数据（将JSON字符串转换为对象）
  _parsePreset(preset) {
    if (!preset) return null
    
    try {
      return {
        ...preset,
        history: JSON.parse(preset.history),
        tools: JSON.parse(preset.tools)
      }
    } catch (error) {
      logger.warn(`解析预设数据失败: ${preset.name}`, error)
      return {
        ...preset,
        history: [],
        tools: []
      }
    }
  }
}

export default new PresetService()