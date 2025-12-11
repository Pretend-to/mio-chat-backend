import fs from 'fs/promises'
import path from 'path'
import logger from '../../../../utils/logger.js'

// 预设相关常量
const PRESETS_DIR = path.join(process.cwd(), 'presets')
const BUILTIN_DIR = path.join(PRESETS_DIR, 'built-in')
const CUSTOM_DIR = path.join(PRESETS_DIR, 'custom')

/**
 * 获取所有预设
 */
export function getAllPresets() {
  return global.middleware.llm.getAllPresets()
}

/**
 * 过滤和搜索预设
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
 * 验证预设数据
 */
export function validatePreset(preset) {
  const required = ['name', 'history']
  for (const field of required) {
    if (!preset[field]) {
      throw new Error(`缺少必填字段: ${field}`)
    }
  }

  if (!Array.isArray(preset.history)) {
    throw new Error('history 必须是数组')
  }

  for (const msg of preset.history) {
    if (!msg.role || !msg.content) {
      throw new Error('history 中的每条消息必须包含 role 和 content')
    }
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
 * 创建预设
 */
export async function createPreset(preset) {
  validatePreset(preset)

  const fileName = `preset_${preset.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`
  const filePath = path.join(CUSTOM_DIR, fileName)

  // 确保目录存在
  await fs.mkdir(CUSTOM_DIR, { recursive: true })

  // 检查是否已存在
  if (await presetExists(preset.name)) {
    throw new Error('预设已存在')
  }

  await fs.writeFile(filePath, JSON.stringify(preset, null, 2), 'utf8')

  // 重新加载预设
  await global.middleware.reloadPresets()

  logger.info(`创建预设成功: ${preset.name}`)

  return { fileName }
}

/**
 * 更新预设
 */
export async function updatePreset(presetId, updateData) {
  validatePreset(updateData)

  const { filePath, preset } = await findPresetWithFile(presetId)
  if (!filePath) {
    throw new Error('预设不存在')
  }

  // 检查是否为内置预设
  if (filePath.startsWith(BUILTIN_DIR)) {
    throw new Error('无法修改内置预设')
  }

  await fs.writeFile(filePath, JSON.stringify(updateData, null, 2), 'utf8')
  await global.middleware.reloadPresets()

  logger.info(`更新预设成功: ${presetId}`)
}

/**
 * 删除预设
 */
export async function deletePreset(presetId) {
  const { filePath } = await findPresetWithFile(presetId)
  if (!filePath) {
    throw new Error('预设不存在')
  }

  // 检查是否为内置预设
  if (filePath.startsWith(BUILTIN_DIR)) {
    throw new Error('无法删除内置预设')
  }

  await fs.unlink(filePath)
  await global.middleware.reloadPresets()

  logger.info(`删除预设成功: ${presetId}`)
}

/**
 * 导入预设
 */
export async function importPreset(fileBuffer) {
  const presetData = JSON.parse(fileBuffer.toString('utf8'))
  validatePreset(presetData)

  // 确保目录存在
  await fs.mkdir(CUSTOM_DIR, { recursive: true })

  const fileName = `preset_import_${Date.now()}.json`
  const filePath = path.join(CUSTOM_DIR, fileName)

  await fs.writeFile(filePath, JSON.stringify(presetData, null, 2), 'utf8')
  await global.middleware.reloadPresets()

  logger.info(`导入预设成功: ${presetData.name}`)

  return { fileName, presetName: presetData.name }
}

/**
 * 导出预设
 */
export async function exportPreset(presetId) {
  const preset = await findPresetById(presetId)

  if (!preset) {
    throw new Error('预设不存在')
  }

  return preset
}

/**
 * 重新加载预设
 */
export async function reloadPresets() {
  await global.middleware.reloadPresets()
  return getAllPresets()
}