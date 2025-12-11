import { makeStandardResponse } from '../utils/responseFormatter.js'
import logger from '../../../../utils/logger.js'
import {
  validateConfig,
  sanitizeSectionConfig
} from '../services/configService.js'
import {
  getFullConfig as getConfigService,
  getConfigSection as getConfigSectionService,
  updateConfig as updateConfigService,
  updateConfigSection as updateConfigSectionService,
  resetConfig as resetConfigService,
  addLLMInstance as addLLMInstanceService,
  updateLLMInstance as updateLLMInstanceService,
  deleteLLMInstance as deleteLLMInstanceService,
  refreshModels as refreshModelsService,
  testLLMModels as testLLMModelsService
} from '../services/configService.js'
import {
  getAllPresets,
  getFilteredPresets,
  createPreset as createPresetService,
  findPresetById,
  updatePreset as updatePresetService,
  deletePreset as deletePresetService,
  importPreset as importPresetService,
  exportPreset as exportPresetService,
  reloadPresets as reloadPresetsService
} from '../services/presetService.js'

// ========== 配置管理 API ==========

/**
 * 获取完整配置
 */
export async function getFullConfig(req, res) {
  try {
    const config = getConfigService()
    res.json(makeStandardResponse(config))
  } catch (error) {
    logger.error('获取配置失败:', error)
    res.status(500).json({
      code: 1,
      message: '获取配置失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 获取指定配置节点
 */
export async function getConfigSection(req, res) {
  try {
    const { section } = req.params
    const sectionData = getConfigSectionService(section)
    const safeData = await sanitizeSectionConfig(section, sectionData)

    res.json(makeStandardResponse(safeData))
  } catch (error) {
    logger.error('获取配置节点失败:', error)

    if (error.message.includes('不存在')) {
      return res.status(404).json({
        code: 1,
        message: error.message,
        data: null,
      })
    }

    res.status(500).json({
      code: 1,
      message: '获取配置节点失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 更新配置（支持部分更新）
 */
export async function updateConfig(req, res) {
  try {
    const updates = req.body
    const result = await updateConfigService(updates)

    res.json(makeStandardResponse(result))
  } catch (error) {
    logger.error('更新配置失败:', error)

    if (error.message.includes('无效') || error.message.includes('验证失败')) {
      return res.status(400).json({
        code: 1,
        message: error.message,
        data: null,
      })
    }

    res.status(500).json({
      code: 1,
      message: '更新配置失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 更新指定配置节点
 */
export async function updateConfigSection(req, res) {
  try {
    const { section } = req.params
    const sectionData = req.body

    const result = await updateConfigSectionService(section, sectionData)

    res.json(makeStandardResponse(result))
  } catch (error) {
    logger.error('更新配置节点失败:', error)

    if (error.message.includes('不存在')) {
      return res.status(404).json({
        code: 1,
        message: error.message,
        data: null,
      })
    }

    if (error.message.includes('验证失败')) {
      return res.status(400).json({
        code: 1,
        message: error.message,
        data: null,
      })
    }

    res.status(500).json({
      code: 1,
      message: '更新配置节点失败: ' + error.message,
      data: null,
    })
  }
}

// ========== LLM 适配器管理 API ==========

/**
 * 添加 LLM 适配器实例
 */
export async function addLLMInstance(req, res) {
  try {
    const { adapterType } = req.params
    const instanceConfig = req.body

    const result = await addLLMInstanceService(adapterType, instanceConfig)

    res.json(makeStandardResponse(result))
  } catch (error) {
    logger.error('添加适配器实例失败:', error)

    if (error.message.includes('无效') || error.message.includes('必要参数')) {
      return res.status(400).json({
        code: 1,
        message: error.message,
        data: null,
      })
    }

    res.status(500).json({
      code: 1,
      message: '添加适配器实例失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 更新 LLM 适配器实例
 */
export async function updateLLMInstance(req, res) {
  try {
    const { adapterType, index } = req.params
    const instanceConfig = req.body

    const result = await updateLLMInstanceService(adapterType, index, instanceConfig)

    res.json(makeStandardResponse(result))
  } catch (error) {
    logger.error('更新适配器实例失败:', error)

    if (error.message.includes('无效') || error.message.includes('不存在')) {
      return res.status(error.message.includes('不存在') ? 404 : 400).json({
        code: 1,
        message: error.message,
        data: null,
      })
    }

    res.status(500).json({
      code: 1,
      message: '更新适配器实例失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 删除 LLM 适配器实例
 */
export async function deleteLLMInstance(req, res) {
  try {
    const { adapterType, index } = req.params

    const result = await deleteLLMInstanceService(adapterType, index)

    res.json(makeStandardResponse(result))
  } catch (error) {
    logger.error('删除适配器实例失败:', error)

    if (error.message.includes('无效') || error.message.includes('不存在')) {
      return res.status(error.message.includes('不存在') ? 404 : 400).json({
        code: 1,
        message: error.message,
        data: null,
      })
    }

    res.status(500).json({
      code: 1,
      message: '删除适配器实例失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 重置配置到示例配置
 */
export function resetConfig(req, res) {
  try {
    const result = resetConfigService()

    res.json(makeStandardResponse(result))
  } catch (error) {
    logger.error('重置配置失败:', error)
    res.status(500).json({
      code: 1,
      message: '重置配置失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 验证配置
 */
export async function validateConfigEndpoint(req, res) {
  try {
    const configToValidate = req.body
    const validation = await validateConfig(configToValidate)

    res.json(makeStandardResponse({
      valid: validation.valid,
      errors: validation.errors,
    }))
  } catch (error) {
    logger.error('验证配置失败:', error)
    res.status(500).json({
      code: 1,
      message: '验证配置失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 刷新 LLM 模型列表
 */
export async function refreshModels(req, res) {
  try {
    const { adapterType, index } = req.params

    const result = await refreshModelsService(adapterType, index)

    res.json(makeStandardResponse(result))
  } catch (error) {
    logger.error('刷新模型列表失败:', error)

    if (error.message.includes('无效') || error.message.includes('不存在')) {
      return res.status(error.message.includes('不存在') ? 404 : 400).json({
        code: 1,
        message: error.message,
        data: null,
      })
    }

    res.status(500).json({
      code: 1,
      message: error.message, // 直接传递错误信息，避免重复包装
      data: null,
    })
  }
}

/**
 * 测试 LLM 适配器连接并获取模型列表
 */
export async function testLLMModels(req, res) {
  try {
    const { adapterType } = req.params
    const testConfig = req.body

    const result = await testLLMModelsService(adapterType, testConfig)

    res.json(makeStandardResponse(result))
  } catch (error) {
    logger.error('[testLLMModels] 测试失败:', error)

    if (error.message.includes('无效') || error.message.includes('需要')) {
      return res.status(400).json({
        code: 1,
        message: error.message,
        data: null,
      })
    }

    res.status(500).json({
      code: 1,
      message: '测试失败: ' + error.message,
      data: null,
    })
  }
}

// ========== 预设管理 API ==========

/**
 * 获取所有预设（管理视图）
 */
export async function getPresets(req, res) {
  try {
    const { keyword } = req.query
    const presets = getAllPresets()

    // 统计各类别总数
    const totals = {
      common: presets.common?.length || 0,
      recommended: presets.recommended?.length || 0,
      hidden: presets.hidden?.length || 0
    }

    // 应用过滤和搜索
    const result = getFilteredPresets(presets, keyword)

    res.json(makeStandardResponse({
      ...result,
      total: totals
    }))
  } catch (error) {
    logger.error('获取预设失败:', error)
    res.status(500).json({
      code: 1,
      message: '获取预设失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 获取特定预设详情
 */
export async function getPreset(req, res) {
  try {
    const presetId = req.params.id
    const preset = await findPresetById(presetId)

    if (!preset) {
      return res.status(404).json({
        code: 1,
        message: '预设不存在',
        data: null,
      })
    }

    res.json(makeStandardResponse(preset))
  } catch (error) {
    logger.error('获取预设详情失败:', error)
    res.status(500).json({
      code: 1,
      message: '获取预设详情失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 创建新预设
 */
export async function createPreset(req, res) {
  try {
    const preset = req.body
    const result = await createPresetService(preset)

    res.json(makeStandardResponse({
      message: '预设创建成功',
      fileName: result.fileName
    }))
  } catch (error) {
    logger.error('创建预设失败:', error)

    if (error.message === '预设已存在') {
      return res.status(409).json({
        code: 1,
        message: error.message,
        data: null,
      })
    }

    res.status(500).json({
      code: 1,
      message: '创建预设失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 更新预设
 */
export async function updatePreset(req, res) {
  try {
    const presetId = req.params.id
    const updateData = req.body

    await updatePresetService(presetId, updateData)

    res.json(makeStandardResponse({
      message: '预设更新成功'
    }))
  } catch (error) {
    logger.error('更新预设失败:', error)

    if (error.message === '预设不存在' || error.message === '无法修改内置预设') {
      return res.status(error.message === '预设不存在' ? 404 : 403).json({
        code: 1,
        message: error.message,
        data: null,
      })
    }

    res.status(500).json({
      code: 1,
      message: '更新预设失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 删除预设
 */
export async function deletePreset(req, res) {
  try {
    const presetId = req.params.id

    await deletePresetService(presetId)

    res.json(makeStandardResponse({
      message: '预设删除成功'
    }))
  } catch (error) {
    logger.error('删除预设失败:', error)

    if (error.message === '预设不存在' || error.message === '无法删除内置预设') {
      return res.status(error.message === '预设不存在' ? 404 : 403).json({
        code: 1,
        message: error.message,
        data: null,
      })
    }

    res.status(500).json({
      code: 1,
      message: '删除预设失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 导入预设
 */
export async function importPreset(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 1,
        message: '未上传文件',
        data: null,
      })
    }

    const result = await importPresetService(req.file.buffer)

    res.json(makeStandardResponse({
      message: '预设导入成功',
      data: { fileName: result.fileName, presetName: result.presetName }
    }))
  } catch (error) {
    logger.error('导入预设失败:', error)
    res.status(500).json({
      code: 1,
      message: '导入预设失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 导出预设
 */
export async function exportPreset(req, res) {
  try {
    const presetId = req.params.id
    const preset = await exportPresetService(presetId)

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${preset.name}.json"`)
    res.send(JSON.stringify(preset, null, 2))
  } catch (error) {
    logger.error('导出预设失败:', error)

    if (error.message === '预设不存在') {
      return res.status(404).json({
        code: 1,
        message: error.message,
        data: null,
      })
    }

    res.status(500).json({
      code: 1,
      message: '导出预设失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 重新加载预设
 */
export async function reloadPresetsEndpoint(req, res) {
  try {
    const presets = await reloadPresetsService()

    logger.info('重新加载预设成功')

    res.json(makeStandardResponse({
      message: '预设重新加载成功',
      presets
    }))
  } catch (error) {
    logger.error('重新加载预设失败:', error)
    res.status(500).json({
      code: 1,
      message: '重新加载预设失败: ' + error.message,
      data: null,
    })
  }
}