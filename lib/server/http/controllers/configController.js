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
  testLLMModels as testLLMModelsService,
  getAdapterTypes as getAdapterTypesService
} from '../services/configService.js'
import {
  getPresetsList,
  createPreset as createPresetService,
  findPresetById,
  updatePreset as updatePresetService,
  deletePreset as deletePresetService,
  importPreset as importPresetService,
  exportPreset as exportPresetService,
  reloadPresets as reloadPresetsService,
  validatePresetData,
  batchDeletePresets,
  ERROR_CODES
} from '../services/presetService.js'

// ========== 配置管理 API ==========

/**
 * 获取完整配置
 */
export async function getFullConfig(req, res) {
  try {
    const config = await getConfigService()
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
    const sectionData = await getConfigSectionService(section)

    res.json(makeStandardResponse(sectionData))
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

/**
 * 获取可用的适配器类型和元数据
 */
export async function getAdapterTypes(req, res) {
  try {
    const result = await getAdapterTypesService()

    res.json(makeStandardResponse(result))
  } catch (error) {
    logger.error('获取适配器类型失败:', error)
    res.status(500).json({
      code: 1,
      message: '获取适配器类型失败: ' + error.message,
      data: null,
    })
  }
}

// ========== 预设管理 API ==========

/**
 * 获取预设列表（管理接口，支持分页和筛选）
 */
export async function getPresets(req, res) {
  try {
    const { nums, start, keyword, category, source } = req.query

    const result = await getPresetsList({
      nums: nums ? parseInt(nums) : undefined,
      start: start ? parseInt(start) : undefined,
      keyword,
      category,
      source
    })

    res.json(makeStandardResponse(result))
  } catch (error) {
    logger.error('获取预设列表失败:', error)

    const statusCode = error.code === ERROR_CODES.INVALID_PRESET_DATA ? 400 : 500
    res.status(statusCode).json({
      success: false,
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      message: error.message || '获取预设列表失败',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * 获取特定预设详情
 */
export async function getPreset(req, res) {
  try {
    const presetName = req.params.name
    const preset = await findPresetById(presetName)

    if (!preset) {
      return res.status(404).json({
        success: false,
        code: ERROR_CODES.PRESET_NOT_FOUND,
        message: '预设不存在',
        error: 'PRESET_NOT_FOUND',
        details: {
          name: presetName
        },
        timestamp: new Date().toISOString()
      })
    }

    res.json(makeStandardResponse(preset))
  } catch (error) {
    logger.error('获取预设详情失败:', error)
    res.status(500).json({
      success: false,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '获取预设详情失败',
      error: error.message,
      timestamp: new Date().toISOString()
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

    res.status(201).json(makeStandardResponse(result))
  } catch (error) {
    logger.error('创建预设失败:', error)

    let statusCode = 500
    let errorCode = ERROR_CODES.INTERNAL_ERROR

    if (error.code === ERROR_CODES.PRESET_NAME_EXISTS) {
      statusCode = 409
      errorCode = error.code
    } else if (error.code === ERROR_CODES.INVALID_PRESET_DATA) {
      statusCode = 400
      errorCode = error.code
    }

    res.status(statusCode).json({
      success: false,
      code: errorCode,
      message: error.message || '创建预设失败',
      error: error.message,
      details: error.errors ? { errors: error.errors } : undefined,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * 更新预设
 */
export async function updatePreset(req, res) {
  try {
    const presetName = req.params.name
    const updateData = req.body

    const result = await updatePresetService(presetName, updateData)

    res.json(makeStandardResponse(result))
  } catch (error) {
    logger.error('更新预设失败:', error)

    let statusCode = 500
    let errorCode = ERROR_CODES.INTERNAL_ERROR

    if (error.code === ERROR_CODES.PRESET_NOT_FOUND) {
      statusCode = 404
      errorCode = error.code
    } else if (error.code === ERROR_CODES.PRESET_READ_ONLY) {
      statusCode = 403
      errorCode = error.code
    } else if (error.code === ERROR_CODES.PRESET_NAME_EXISTS || error.code === ERROR_CODES.INVALID_PRESET_DATA) {
      statusCode = 400
      errorCode = error.code
    }

    res.status(statusCode).json({
      success: false,
      code: errorCode,
      message: error.message || '更新预设失败',
      error: error.message,
      details: error.errors ? { errors: error.errors } : undefined,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * 删除预设
 */
export async function deletePreset(req, res) {
  try {
    const presetName = req.params.name

    const result = await deletePresetService(presetName)

    res.json(makeStandardResponse(result))
  } catch (error) {
    logger.error('删除预设失败:', error)

    let statusCode = 500
    let errorCode = ERROR_CODES.INTERNAL_ERROR

    if (error.code === ERROR_CODES.PRESET_NOT_FOUND) {
      statusCode = 404
      errorCode = error.code
    } else if (error.code === ERROR_CODES.PRESET_READ_ONLY) {
      statusCode = 403
      errorCode = error.code
    }

    res.status(statusCode).json({
      success: false,
      code: errorCode,
      message: error.message || '删除预设失败',
      error: error.message,
      timestamp: new Date().toISOString()
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
        success: false,
        code: ERROR_CODES.FILE_UPLOAD_ERROR,
        message: '未上传文件',
        error: 'FILE_UPLOAD_ERROR',
        timestamp: new Date().toISOString()
      })
    }

    const result = await importPresetService(req.file.buffer)

    res.status(201).json(makeStandardResponse(result))
  } catch (error) {
    logger.error('导入预设失败:', error)

    let statusCode = 500
    let errorCode = ERROR_CODES.INTERNAL_ERROR

    if (error.code === ERROR_CODES.FILE_FORMAT_ERROR || error.code === ERROR_CODES.INVALID_PRESET_DATA) {
      statusCode = 400
      errorCode = error.code
    }

    res.status(statusCode).json({
      success: false,
      code: errorCode,
      message: error.message || '导入预设失败',
      error: error.message,
      details: error.errors ? { errors: error.errors } : undefined,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * 导出预设
 */
export async function exportPreset(req, res) {
  const presetName = req.params.name
  try {
    const preset = await exportPresetService(presetName)

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${preset.name}.json"`)
    res.send(JSON.stringify(preset, null, 2))
  } catch (error) {
    logger.error('导出预设失败:', error)

    if (error.code === ERROR_CODES.PRESET_NOT_FOUND) {
      return res.status(404).json({
        success: false,
        code: ERROR_CODES.PRESET_NOT_FOUND,
        message: '预设不存在',
        error: 'PRESET_NOT_FOUND',
        details: {
          name: presetName
        },
        timestamp: new Date().toISOString()
      })
    }

    res.status(500).json({
      success: false,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '导出预设失败',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * 重新加载预设
 */
export async function reloadPresetsEndpoint(req, res) {
  try {
    const result = await reloadPresetsService()

    logger.info('重新加载预设成功')

    res.json(makeStandardResponse(result))
  } catch (error) {
    logger.error('重新加载预设失败:', error)
    res.status(500).json({
      success: false,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '重新加载预设失败',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * 验证预设数据
 */
export async function validatePresetEndpoint(req, res) {
  try {
    const presetData = req.body
    const result = await validatePresetData(presetData)

    const statusCode = result.valid ? 200 : 400
    res.status(statusCode).json(makeStandardResponse(result))
  } catch (error) {
    logger.error('验证预设数据失败:', error)
    res.status(500).json({
      success: false,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '验证预设数据失败',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * 批量删除预设
 */
export async function batchDeletePresetsEndpoint(req, res) {
  try {
    const { presetIds } = req.body

    if (!presetIds) {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.INVALID_PRESET_DATA,
        message: '缺少预设ID列表',
        error: 'MISSING_PRESET_IDS',
        timestamp: new Date().toISOString()
      })
    }

    const result = await batchDeletePresets(presetIds)

    res.json(makeStandardResponse(result))
  } catch (error) {
    logger.error('批量删除预设失败:', error)

    let statusCode = 500
    let errorCode = ERROR_CODES.INTERNAL_ERROR

    if (error.code === ERROR_CODES.INVALID_PRESET_DATA) {
      statusCode = 400
      errorCode = error.code
    }

    res.status(statusCode).json({
      success: false,
      code: errorCode,
      message: error.message || '批量删除预设失败',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}