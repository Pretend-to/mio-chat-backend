import fs from 'fs/promises'
import path from 'path'
import logger from '../../../../utils/logger.js'

// 预设相关常量
const PRESETS_DIR = path.join(process.cwd(), 'presets')
const BUILTIN_DIR = path.join(PRESETS_DIR, 'built-in')
const CUSTOM_DIR = path.join(PRESETS_DIR, 'custom')

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
  FILE_SYSTEM_ERROR: 5002
}

// 预设验证规则
const PRESET_NAME_PATTERN = /^[a-zA-Z0-9\u4e00-\u9fa5_\-\s]+$/
const RESERVED_NAMES = ['system', 'admin', 'default']
const MAX_HISTORY_ITEMS = 100
const MAX_OPENING_LENGTH = 500

/**
 * 获取所有预设（带完整元数据）
 */
export async function getAllPresets() {
  try {
    const presets = global.middleware.llm.getAllPresets()

    // 为每个预设添加完整的元数据
    const presetsWithMetadata = await Promise.all(
      Object.entries(presets).flatMap(([category, categoryPresets]) =>
        categoryPresets.map(async (preset) => {
          const { filePath, preset: fullPreset } = await findPresetWithFile(preset.name)
          const stats = filePath ? await fs.stat(filePath) : null

          return {
            ...preset,
            source: filePath?.includes('built-in') ? 'built-in' : 'custom',
            category: preset.category || category,
            fileName: path.basename(filePath) || '',
            filePath: filePath || '',
            createdAt: stats?.birthtime?.toISOString() || new Date().toISOString(),
            updatedAt: stats?.mtime?.toISOString() || new Date().toISOString(),
            fileSize: stats?.size || 0,
            isReadOnly: filePath?.includes('built-in') || false
          }
        })
      )
    )

    // 按分类整理
    const result = {
      common: [],
      recommended: [],
      hidden: []
    }

    presetsWithMetadata.forEach(preset => {
      if (result[preset.category]) {
        result[preset.category].push(preset)
      }
    })

    return result
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
    source = ''
  } = options

  try {
    // 验证分页参数
    if (nums < 1 || nums > 100) {
      throw new Error('每页数量必须在 1-100 之间')
    }
    if (start < 0) {
      throw new Error('起始位置必须大于等于 0')
    }

    const presets = await getAllPresets()

    // 获取所有预设并应用筛选
    let allPresets = [
      ...presets.common || [],
      ...presets.recommended || [],
      ...presets.hidden || []
    ]

    // 应用筛选条件
    if (category) {
      allPresets = allPresets.filter(p => p.category === category)
    }
    if (source) {
      allPresets = allPresets.filter(p => p.source === source)
    }
    if (keyword) {
      allPresets = allPresets.filter(p =>
        p.name.includes(keyword) ||
        p.opening?.includes(keyword) ||
        p.history.some(h => h.content.includes(keyword))
      )
    }

    // 分页
    const paginatedPresets = allPresets.slice(start, start + nums)

    // 统计信息
    const totalCount = allPresets.length
    const categoryCount = {
      common: (presets.common || []).length,
      recommended: (presets.recommended || []).length,
      hidden: (presets.hidden || []).length
    }
    const sourceCount = {
      'built-in': [...presets.common || [], ...presets.recommended || [], ...presets.hidden || []]
        .filter(p => p.source === 'built-in').length,
      'custom': [...presets.common || [], ...presets.recommended || [], ...presets.hidden || []]
        .filter(p => p.source === 'custom').length
    }

    return {
      presets: paginatedPresets,
      pagination: {
        total: totalCount,
        start,
        nums,
        hasMore: start + nums < totalCount
      },
      summary: {
        totalCount,
        categoryCount,
        sourceCount
      }
    }
  } catch (error) {
    logger.error('获取预设列表失败:', error)
    throw error
  }
}

/**
 * 过滤和搜索预设（保留向后兼容）
 */
export function filterAndSearchPresets(presets, keyword, start, nums) {
  const allPresets = [
    ...presets.common || [],
    ...presets.recommended || [],
    ...presets.hidden || []
  ]

  // 应用关键词搜索
  if (keyword) {
    const filtered = allPresets.filter(p =>
      p.name.includes(keyword) ||
      p.opening?.includes(keyword) ||
      p.history.some(h => h.content.includes(keyword))
    )
    return filtered.slice(start, start + nums)
  }

  return allPresets.slice(start, start + nums)
}

/**
 * 获取分类的预设数据（用于管理视图）
 */
export function getFilteredPresets(presets, keyword) {
  return {
    common: (presets.common || []).filter(p => !keyword ||
      p.name.includes(keyword) ||
      p.opening?.includes(keyword) ||
      p.history.some(h => h.content.includes(keyword))
    ),
    recommended: (presets.recommended || []).filter(p => !keyword ||
      p.name.includes(keyword) ||
      p.opening?.includes(keyword) ||
      p.history.some(h => h.content.includes(keyword))
    ),
    hidden: (presets.hidden || []).filter(p => !keyword ||
      p.name.includes(keyword) ||
      p.opening?.includes(keyword) ||
      p.history.some(h => h.content.includes(keyword))
    )
  }
}

/**
 * 验证预设数据（增强版）
 */
export function validatePreset(preset) {
  const errors = []

  // 验证必填字段
  if (!preset.name) {
    errors.push('预设名称不能为空')
  } else {
    // 验证名称格式
    if (typeof preset.name !== 'string') {
      errors.push('预设名称必须是字符串')
    } else if (preset.name.length < 1 || preset.name.length > 50) {
      errors.push('预设名称长度必须在 1-50 个字符之间')
    } else if (!PRESET_NAME_PATTERN.test(preset.name)) {
      errors.push('预设名称包含无效字符，仅支持中英文、数字、下划线、连字符和空格')
    } else if (RESERVED_NAMES.includes(preset.name.toLowerCase())) {
      errors.push('预设名称为系统保留名称，请选择其他名称')
    }
  }

  // 验证历史记录
  if (!preset.history) {
    errors.push('对话历史不能为空')
  } else if (!Array.isArray(preset.history)) {
    errors.push('对话历史必须是数组格式')
  } else if (preset.history.length < 1) {
    errors.push('对话历史至少需要一条消息')
  } else if (preset.history.length > MAX_HISTORY_ITEMS) {
    errors.push(`对话历史不能超过 ${MAX_HISTORY_ITEMS} 条消息`)
  } else {
    // 验证每条消息
    const validRoles = ['system', 'user', 'assistant']
    for (let i = 0; i < preset.history.length; i++) {
      const msg = preset.history[i]
      if (!msg.role || !msg.content) {
        errors.push(`第 ${i + 1} 条消息缺少 role 或 content 字段`)
      } else {
        if (!validRoles.includes(msg.role)) {
          errors.push(`第 ${i + 1} 条消息的 role 无效，必须是 system、user 或 assistant 之一`)
        }
        if (typeof msg.content !== 'string' || msg.content.length === 0) {
          errors.push(`第 ${i + 1} 条消息的 content 不能为空`)
        }
        if (typeof msg.content === 'string' && msg.content.length > 30000) {
          errors.push(`第 ${i + 1} 条消息的 content 不能超过 30000 个字符`)
        }
      }
    }

    // 验证第一条消息必须是 system
    if (preset.history.length > 0 && preset.history[0].role !== 'system') {
      errors.push('第一条消息必须是 system 角色')
    }

    // 验证不能有连续相同角色的消息
    for (let i = 1; i < preset.history.length; i++) {
      if (preset.history[i].role === preset.history[i - 1].role) {
        errors.push(`第 ${i} 条消息与第 ${i + 1} 条消息的角色相同，这是不允许的`)
        break
      }
    }
  }

  // 验证开场白
  if (preset.opening !== undefined) {
    if (typeof preset.opening !== 'string') {
      errors.push('开场白必须是字符串')
    } else if (preset.opening.length > MAX_OPENING_LENGTH) {
      errors.push(`开场白不能超过 ${MAX_OPENING_LENGTH} 个字符`)
    }
  }

  // 验证工具配置
  if (preset.tools !== undefined) {
    if (!Array.isArray(preset.tools)) {
      errors.push('工具配置必须是数组')
    } else if (preset.tools.length > 20) {
      errors.push('工具数量不能超过 20 个')
    } else {
      for (let i = 0; i < preset.tools.length; i++) {
        const tool = preset.tools[i]
        if (typeof tool !== 'string') {
          errors.push(`第 ${i + 1} 个工具名称必须是字符串`)
        } else if (tool.length > 50) {
          errors.push(`第 ${i + 1} 个工具名称不能超过 50 个字符`)
        }
      }
    }
  }

  if (errors.length > 0) {
    const error = new Error('预设数据验证失败')
    error.errors = errors
    error.code = ERROR_CODES.INVALID_PRESET_DATA
    throw error
  }
}

/**
 * 检查预设是否存在
 */
export async function presetExists(name) {
  try {
    const searchDirs = [CUSTOM_DIR, BUILTIN_DIR]

    for (const dir of searchDirs) {
      const files = await fs.readdir(dir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(dir, file)
          const content = await fs.readFile(filePath, 'utf8')
          const preset = JSON.parse(content)

          if (preset.name === name) {
            return true
          }
        }
      }
    }

    return false
  } catch (error) {
    return false
  }
}

/**
 * 根据名称查找预设
 */
export async function findPresetById(presetId) {
  try {
    const searchDirs = [CUSTOM_DIR, BUILTIN_DIR]

    for (const dir of searchDirs) {
      const files = await fs.readdir(dir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(dir, file)
          const content = await fs.readFile(filePath, 'utf8')
          const preset = JSON.parse(content)

          if (preset.name === presetId || file === presetId || file === `${presetId}.json`) {
            // 添加元数据
            preset.type = dir === BUILTIN_DIR ? 'built-in' : 'custom'
            preset.fileName = file
            preset.path = filePath
            return preset
          }
        }
      }
    }

    return null
  } catch (error) {
    logger.error(`查找预设失败: ${presetId}`, error)
    return null
  }
}

/**
 * 根据名称查找预设及文件路径
 */
export async function findPresetWithFile(presetId) {
  try {
    const searchDirs = [CUSTOM_DIR, BUILTIN_DIR]

    for (const dir of searchDirs) {
      const files = await fs.readdir(dir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(dir, file)
          const content = await fs.readFile(filePath, 'utf8')
          const preset = JSON.parse(content)

          if (preset.name === presetId || file === presetId || file === `${presetId}.json`) {
            return { filePath, preset }
          }
        }
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

    // 确保目录存在
    await fs.mkdir(CUSTOM_DIR, { recursive: true })

    // 检查是否已存在
    if (await presetExists(preset.name)) {
      const error = new Error('预设名称已存在')
      error.code = ERROR_CODES.PRESET_NAME_EXISTS
      throw error
    }

    // 生成文件名
    const sanitizedName = preset.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
    const fileName = `${sanitizedName}.json`
    const filePath = path.join(CUSTOM_DIR, fileName)

    // 构建完整的预设数据
    const fullPreset = {
      name: preset.name,
      source: 'custom',
      category: preset.category || 'common',
      history: preset.history,
      opening: preset.opening,
      tools: preset.tools || []
    }

    // 写入文件
    await fs.writeFile(filePath, JSON.stringify(fullPreset, null, 2), 'utf8')

    // 重新加载预设
    await global.middleware.reloadPresets()

    logger.info(`创建预设成功: ${preset.name}`)

    // 获取文件统计信息
    const stats = await fs.stat(filePath)

    return {
      name: preset.name,
      source: 'custom',
      category: preset.category || 'common',
      fileName,
      filePath,
      createdAt: stats.birthtime.toISOString(),
      fileSize: stats.size
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

    const { filePath, preset } = await findPresetWithFile(presetId)
    if (!filePath) {
      const error = new Error('预设不存在')
      error.code = ERROR_CODES.PRESET_NOT_FOUND
      throw error
    }

    // 检查是否为内置预设
    if (filePath.startsWith(BUILTIN_DIR)) {
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

    // 构建更新后的预设数据
    const updatedPreset = {
      ...preset,
      ...updateData,
      source: 'custom', // 确保source标记正确
      updatedAt: new Date().toISOString()
    }

    // 写入文件
    await fs.writeFile(filePath, JSON.stringify(updatedPreset, null, 2), 'utf8')

    // 重新加载预设
    await global.middleware.reloadPresets()

    logger.info(`更新预设成功: ${presetId}`)

    // 获取更新后的文件统计信息
    const stats = await fs.stat(filePath)

    return {
      name: updatedPreset.name,
      source: 'custom',
      category: updatedPreset.category,
      updatedAt: stats.mtime.toISOString()
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
    const { filePath, preset } = await findPresetWithFile(presetId)
    if (!filePath) {
      const error = new Error('预设不存在')
      error.code = ERROR_CODES.PRESET_NOT_FOUND
      throw error
    }

    // 检查是否为内置预设
    if (filePath.startsWith(BUILTIN_DIR)) {
      const error = new Error('内置预设无法删除')
      error.code = ERROR_CODES.PRESET_READ_ONLY
      throw error
    }

    // 删除文件
    await fs.unlink(filePath)

    // 重新加载预设
    await global.middleware.reloadPresets()

    logger.info(`删除预设成功: ${presetId}`)

    return {
      name: preset?.name || presetId,
      deletedAt: new Date().toISOString()
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
    } catch (parseError) {
      const error = new Error('文件格式错误：不是有效的 JSON 格式')
      error.code = ERROR_CODES.FILE_FORMAT_ERROR
      throw error
    }

    // 验证预设数据
    validatePreset(presetData)

    // 确保目录存在
    await fs.mkdir(CUSTOM_DIR, { recursive: true })

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

    // 生成文件名
    const sanitizedName = presetData.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
    const fileName = `${sanitizedName}.json`
    const filePath = path.join(CUSTOM_DIR, fileName)

    // 构建完整的预设数据
    const fullPreset = {
      name: presetData.name,
      source: 'custom',
      category: presetData.category || 'common',
      history: presetData.history,
      opening: presetData.opening,
      tools: presetData.tools || []
    }

    // 写入文件
    await fs.writeFile(filePath, JSON.stringify(fullPreset, null, 2), 'utf8')

    // 重新加载预设
    await global.middleware.reloadPresets()

    logger.info(`导入预设成功: ${presetData.name}`)

    // 获取文件统计信息
    const stats = await fs.stat(filePath)

    return {
      imported: [{
        name: presetData.name,
        status: 'created',
        fileName,
        fileSize: stats.size,
        createdAt: stats.birthtime.toISOString()
      }],
      failed: [],
      summary: {
        total: 1,
        success: 1,
        failed: 0
      }
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
      tools: preset.tools || []
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
    await global.middleware.reloadPresets()
    const presets = await getAllPresets()

    const totalCount = Object.values(presets).reduce((sum, category) => sum + category.length, 0)
    const builtInCount = Object.values(presets).reduce(
      (sum, category) => sum + category.filter(p => p.source === 'built-in').length, 0
    )
    const customCount = totalCount - builtInCount

    return {
      reloadedAt: new Date().toISOString(),
      summary: {
        totalCount,
        builtInCount,
        customCount
      },
      presets
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
      message: '预设数据有效'
    }
  } catch (error) {
    return {
      valid: false,
      message: error.message,
      errors: error.errors || [error.message],
      code: error.code || ERROR_CODES.INVALID_PRESET_DATA
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
        failed: 0
      }
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
          code: error.code
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