import PresetService from '../../../database/services/PresetService.js'

// 错误码常量
export const ERROR_CODES = {
  PRESET_NOT_FOUND: 4001,
  PRESET_NAME_EXISTS: 4002,
  PRESET_READ_ONLY: 4003,
  INVALID_PRESET_DATA: 4004,
  PRESET_NAME_INVALID: 4005,
  FILE_UPLOAD_ERROR: 4006,
  FILE_FORMAT_ERROR: 4007,
  INTERNAL_ERROR: 5001,
  FILE_SYSTEM_ERROR: 5002,
}

// 预设验证规则
const RESERVED_NAMES = ['system', 'admin', 'default']
const MAX_HISTORY_ITEMS = 100
const MAX_OPENING_LENGTH = 500

/**
 * 获取所有预设（带完整元数据）
 */
export async function getAllPresets() {
  try {
    const dbPresets = await PresetService.findAll()
    
    // 获取插件提供的静态预设
    const localPresets = global.middleware?.getAllLocalPresets() || []

    // 为每个预设添加完整的元数据
    const addMetadata = (presetList) =>
      presetList.map((preset) => ({
        ...preset,
        source: preset.source || preset.type || 'custom',
        fileName: `${preset.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`,
        filePath: '', 
        createdAt: preset.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: preset.updatedAt?.toISOString() || new Date().toISOString(),
        fileSize: JSON.stringify(preset).length, 
        isReadOnly: preset.type === 'built-in' || preset.source === 'plugin',
      }))

    const allPresets = [...dbPresets, ...localPresets]

    const categorized = {
      common: [],
      recommended: [],
      hidden: [],
    }

    addMetadata(allPresets).forEach((preset) => {
      if (categorized[preset.category]) {
        categorized[preset.category].push(preset)
      } else {
        categorized.common.push(preset)
      }
    })

    return categorized
  } catch (error) {
    logger.error('获取所有预设失败:', error)
    throw error
  }
}

/**
 * 获取预设列表（支持分页、搜索和筛选）
 */
export async function getPresetsList(options = {}) {
  const {
    nums = 50,
    start = 0,
    keyword = '',
    category = '',
    source = '',
  } = options

  try {
    const dbPresets = await PresetService.findAll()
    const localPresets = global.middleware?.getAllLocalPresets() || []
    
    // 汇总并添加元数据
    const allPresets = [...dbPresets, ...localPresets].map((preset) => ({
      ...preset,
      source: preset.source || preset.type || 'custom',
      fileName: `${preset.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`,
      filePath: '',
      createdAt: preset.createdAt || new Date(),
      updatedAt: preset.updatedAt || new Date(),
      fileSize: JSON.stringify(preset).length,
      isReadOnly: preset.type === 'built-in' || preset.source === 'plugin',
    }))

    // 执行过滤
    let filtered = allPresets
    if (category) filtered = filtered.filter(p => p.category === category)
    if (source) filtered = filtered.filter(p => p.source === source || p.type === source)
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(lowerKeyword) || 
        p.opening?.toLowerCase().includes(lowerKeyword)
      )
    }

    // 统计各分类数量
    const categoryCount = {}
    const sourceCount = {}
    allPresets.forEach(p => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1
      sourceCount[p.source] = (sourceCount[p.source] || 0) + 1
    })

    return {
      presets: filtered.slice(start, start + nums),
      pagination: {
        total: filtered.length,
        start,
        nums,
        hasMore: start + nums < filtered.length,
      },
      summary: {
        totalCount: filtered.length,
        categoryCount,
        sourceCount,
      },
    }
  } catch (error) {
    logger.error('获取预设列表失败:', error)
    throw error
  }
}

/**
 * 根据名称查找预设
 */
export async function findPresetById(presetId) {
  try {
    // 1. 先查数据库
    const preset = await PresetService.findByName(presetId)
    if (preset) {
      return {
        ...preset,
        fileName: `${preset.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`,
        path: '',
      }
    }

    // 2. 再查插件静态预设
    const localPresets = global.middleware?.getAllLocalPresets() || []
    const localPreset = localPresets.find(p => p.name === presetId)
    if (localPreset) {
      return {
        ...localPreset,
        source: 'plugin',
        fileName: `${localPreset.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`,
        path: '',
        isReadOnly: true
      }
    }

    return null
  } catch (error) {
    logger.error(`查找预设失败: ${presetId}`, error)
    return null
  }
}

/**
 * 过滤和搜索预设（双源搜索）
 */
export async function filterAndSearchPresets(presets, keyword, start, nums) {
  try {
    const { common, recommended, hidden } = await getAllPresets()
    const all = [...common, ...recommended, ...hidden]
    
    if (keyword) {
      const lower = keyword.toLowerCase()
      return all.filter(p => 
        p.name.toLowerCase().includes(lower) || 
        p.opening?.toLowerCase().includes(lower)
      ).slice(start, start + nums)
    }

    return all.slice(start, start + nums)
  } catch (error) {
    logger.error('过滤和搜索预设失败:', error)
    return []
  }
}

/**
 * 获取分类的预设数据（用于管理视图，双源聚合）
 */
export async function getFilteredPresets(presets, keyword) {
  try {
    const categorized = await getAllPresets()
    if (!keyword) return categorized

    const lower = keyword.toLowerCase()
    const filterFn = p => p.name.toLowerCase().includes(lower) || p.opening?.toLowerCase().includes(lower)

    return {
      common: categorized.common.filter(filterFn),
      recommended: categorized.recommended.filter(filterFn),
      hidden: categorized.hidden.filter(filterFn),
    }
  } catch (error) {
    logger.error('获取分类预设失败:', error)
    return { common: [], recommended: [], hidden: [] }
  }
}

/**
 * 验证预设数据
 */
export function validatePreset(preset) {
  const errors = []
  if (!preset.name) {
    errors.push('预设名称不能为空')
  } else if (typeof preset.name !== 'string') {
    errors.push('预设名称必须是字符串')
  }

  if (!preset.history || !Array.isArray(preset.history)) {
    errors.push('对话历史必须是数组格式')
  }

  if (errors.length > 0) {
    const error = new Error('预设数据验证失败')
    error.errors = errors
    error.code = ERROR_CODES.INVALID_PRESET_DATA
    throw error
  }
}

/**
 * 检查预设是否存在（双源检查）
 */
export async function presetExists(name) {
  try {
    const dbExists = await PresetService.exists(name)
    if (dbExists) return true
    
    const localPresets = global.middleware?.getAllLocalPresets() || []
    return localPresets.some(p => p.name === name)
  } catch (error) {
    logger.error('检查预设存在性失败:', error)
    return false
  }
}

/**
 * 根据名称查找预设及文件路径（兼容性方法）
 */
export async function findPresetWithFile(presetId) {
  try {
    const preset = await PresetService.findByName(presetId)

    if (preset) {
      return {
        filePath: '', // 数据库模式下不再有文件路径
        preset,
      }
    }

    return { filePath: null, preset: null }
  } catch (error) {
    logger.error(`查找预设文件失败: ${presetId}`, error)
    return { filePath: null, preset: null }
  }
}

/**
 * 创建预设（增强版）
 */
export async function createPreset(preset) {
  try {
    // 验证预设数据
    validatePreset(preset)

    // 检查是否已存在
    if (await presetExists(preset.name)) {
      const error = new Error('预设名称已存在')
      error.code = ERROR_CODES.PRESET_NAME_EXISTS
      throw error
    }

    // 构建完整的预设数据
    const fullPreset = {
      name: preset.name,
      type: 'custom', // 新创建的预设都是自定义类型
      category: preset.category || 'common',
      history: preset.history,
      opening: preset.opening,
      tools: preset.tools || [],
      avatar: preset.avatar || '',
    }

    // 保存到数据库
    const createdPreset = await PresetService.create(fullPreset)

    // 重新加载预设（如果有全局中间件）
    if (global.middleware?.reloadPresets) {
      await global.middleware.reloadPresets()
    }

    logger.info(`创建预设成功: ${preset.name}`)

    return {
      name: createdPreset.name,
      source: 'custom',
      category: createdPreset.category,
      fileName: `${createdPreset.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`,
      filePath: '', // 数据库模式下不再有文件路径
      createdAt:
        createdPreset.createdAt?.toISOString() || new Date().toISOString(),
      fileSize: JSON.stringify(createdPreset).length,
    }
  } catch (error) {
    logger.error('创建预设失败:', error)

    // 如果是我们自定义的错误，直接抛出
    if (error.code) {
      throw error
    }

    // 其他错误包装为内部错误
    const wrappedError = new Error('创建预设失败: ' + error.message)
    wrappedError.code = ERROR_CODES.INTERNAL_ERROR
    throw wrappedError
  }
}

/**
 * 更新预设（增强版）
 */
export async function updatePreset(presetId, updateData) {
  try {
    // 验证更新数据
    validatePreset(updateData)

    const preset = await PresetService.findByName(presetId)
    if (!preset) {
      const error = new Error('预设不存在')
      error.code = ERROR_CODES.PRESET_NOT_FOUND
      throw error
    }

    // 检查是否为内置预设
    if (preset.type === 'built-in') {
      const error = new Error('内置预设无法修改')
      error.code = ERROR_CODES.PRESET_READ_ONLY
      throw error
    }

    // 检查名称冲突（如果修改了名称）
    if (updateData.name && updateData.name !== preset.name) {
      if (await presetExists(updateData.name)) {
        const error = new Error('预设名称已存在')
        error.code = ERROR_CODES.PRESET_NAME_EXISTS
        throw error
      }
    }

    // 更新预设
    const updatedPreset = await PresetService.update(presetId, updateData)

    if (!updatedPreset) {
      const error = new Error('预设不存在')
      error.code = ERROR_CODES.PRESET_NOT_FOUND
      throw error
    }

    // 重新加载预设（如果有全局中间件）
    if (global.middleware?.reloadPresets) {
      await global.middleware.reloadPresets()
    }

    logger.info(`更新预设成功: ${presetId}`)

    return {
      name: updatedPreset.name,
      source: 'custom',
      category: updatedPreset.category,
      updatedAt:
        updatedPreset.updatedAt?.toISOString() || new Date().toISOString(),
    }
  } catch (error) {
    logger.error('更新预设失败:', error)

    // 如果是我们自定义的错误，直接抛出
    if (error.code) {
      throw error
    }

    // 其他错误包装为内部错误
    const wrappedError = new Error('更新预设失败: ' + error.message)
    wrappedError.code = ERROR_CODES.INTERNAL_ERROR
    throw wrappedError
  }
}

/**
 * 删除预设（增强版）
 */
export async function deletePreset(presetId) {
  try {
    const preset = await PresetService.findByName(presetId)
    if (!preset) {
      const error = new Error('预设不存在')
      error.code = ERROR_CODES.PRESET_NOT_FOUND
      throw error
    }

    // 检查是否为内置预设
    if (preset.type === 'built-in') {
      const error = new Error('内置预设无法删除')
      error.code = ERROR_CODES.PRESET_READ_ONLY
      throw error
    }

    // 删除预设
    const success = await PresetService.deleteByName(presetId)

    if (!success) {
      const error = new Error('预设不存在')
      error.code = ERROR_CODES.PRESET_NOT_FOUND
      throw error
    }

    // 重新加载预设（如果有全局中间件）
    if (global.middleware?.reloadPresets) {
      await global.middleware.reloadPresets()
    }

    logger.info(`删除预设成功: ${presetId}`)

    return {
      name: preset.name,
      deletedAt: new Date().toISOString(),
    }
  } catch (error) {
    logger.error('删除预设失败:', error)

    // 如果是我们自定义的错误，直接抛出
    if (error.code) {
      throw error
    }

    // 其他错误包装为内部错误
    const wrappedError = new Error('删除预设失败: ' + error.message)
    wrappedError.code = ERROR_CODES.INTERNAL_ERROR
    throw wrappedError
  }
}

/**
 * 导入预设（增强版）
 */
export async function importPreset(fileBuffer) {
  try {
    let presetData

    // 解析 JSON 数据
    try {
      const jsonStr = fileBuffer.toString('utf8')
      presetData = JSON.parse(jsonStr)
    } catch {
      const error = new Error('文件格式错误：不是有效的 JSON 格式')
      error.code = ERROR_CODES.FILE_FORMAT_ERROR
      throw error
    }

    // 验证预设数据
    validatePreset(presetData)

    // 检查名称是否已存在
    if (await presetExists(presetData.name)) {
      // 生成唯一名称
      let uniqueName = `${presetData.name}_import_${Date.now()}`
      let counter = 1
      while (await presetExists(uniqueName)) {
        uniqueName = `${presetData.name}_import_${counter++}`
      }
      presetData.name = uniqueName
    }

    // 构建完整的预设数据
    const fullPreset = {
      name: presetData.name,
      type: 'custom', // 导入的预设都是自定义类型
      category: presetData.category || 'common',
      history: presetData.history,
      opening: presetData.opening,
      tools: presetData.tools || [],
      avatar: presetData.avatar || '',
    }

    // 保存到数据库
    const createdPreset = await PresetService.create(fullPreset)

    // 重新加载预设
    if (global.middleware?.reloadPresets) {
      await global.middleware.reloadPresets()
    }

    logger.info(`导入预设成功: ${presetData.name}`)

    return {
      imported: [
        {
          name: createdPreset.name,
          status: 'created',
          fileName: `${createdPreset.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`,
          fileSize: JSON.stringify(createdPreset).length,
          createdAt:
            createdPreset.createdAt?.toISOString() || new Date().toISOString(),
        },
      ],
      failed: [],
      summary: {
        total: 1,
        success: 1,
        failed: 0,
      },
    }
  } catch (error) {
    logger.error('导入预设失败:', error)

    // 如果是我们自定义的错误，直接抛出
    if (error.code) {
      throw error
    }

    // 其他错误包装为内部错误
    const wrappedError = new Error('导入预设失败: ' + error.message)
    wrappedError.code = ERROR_CODES.INTERNAL_ERROR
    throw wrappedError
  }
}

/**
 * 导出预设（增强版）
 */
export async function exportPreset(presetId) {
  try {
    const preset = await findPresetById(presetId)

    if (!preset) {
      const error = new Error('预设不存在')
      error.code = ERROR_CODES.PRESET_NOT_FOUND
      throw error
    }

    // 返回纯净的预设数据（不包含元数据）
    return {
      name: preset.name,
      history: preset.history,
      opening: preset.opening,
      tools: preset.tools || [],
      avatar: preset.avatar || '',
    }
  } catch (error) {
    logger.error('导出预设失败:', error)

    // 如果是我们自定义的错误，直接抛出
    if (error.code) {
      throw error
    }

    // 其他错误包装为内部错误
    const wrappedError = new Error('导出预设失败: ' + error.message)
    wrappedError.code = ERROR_CODES.INTERNAL_ERROR
    throw wrappedError
  }
}

/**
 * 重新加载预设（增强版）
 */
export async function reloadPresets() {
  try {
    // 重新加载全局中间件（如果存在）
    if (global.middleware?.reloadPresets) {
      await global.middleware.reloadPresets()
    }

    const presets = await getAllPresets()

    const totalCount = Object.values(presets).reduce(
      (sum, category) => sum + category.length,
      0,
    )
    const builtInCount = Object.values(presets).reduce(
      (sum, category) =>
        sum + category.filter((p) => p.source === 'built-in').length,
      0,
    )
    const customCount = totalCount - builtInCount

    return {
      reloadedAt: new Date().toISOString(),
      summary: {
        totalCount,
        builtInCount,
        customCount,
      },
      presets,
    }
  } catch (error) {
    logger.error('重新加载预设失败:', error)

    const wrappedError = new Error('重新加载预设失败: ' + error.message)
    wrappedError.code = ERROR_CODES.INTERNAL_ERROR
    throw wrappedError
  }
}

/**
 * 验证预设数据（独立函数）
 */
export async function validatePresetData(presetData) {
  try {
    validatePreset(presetData)
    return {
      valid: true,
      message: '预设数据有效',
    }
  } catch (error) {
    return {
      valid: false,
      message: error.message,
      errors: error.errors || [error.message],
      code: error.code || ERROR_CODES.INVALID_PRESET_DATA,
    }
  }
}

/**
 * 批量删除预设
 */
export async function batchDeletePresets(presetIds) {
  try {
    if (!Array.isArray(presetIds)) {
      throw new Error('预设ID列表必须是数组')
    }

    if (presetIds.length === 0) {
      throw new Error('预设ID列表不能为空')
    }

    const results = {
      deleted: [],
      failed: [],
      summary: {
        total: presetIds.length,
        success: 0,
        failed: 0,
      },
    }

    for (const presetId of presetIds) {
      try {
        const result = await deletePreset(presetId)
        results.deleted.push(result)
        results.summary.success++
      } catch (error) {
        results.failed.push({
          id: presetId,
          error: error.message,
          code: error.code,
        })
        results.summary.failed++
      }
    }

    return results
  } catch (error) {
    logger.error('批量删除预设失败:', error)

    const wrappedError = new Error('批量删除预设失败: ' + error.message)
    wrappedError.code = ERROR_CODES.INTERNAL_ERROR
    throw wrappedError
  }
}
