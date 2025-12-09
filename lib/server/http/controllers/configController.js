/* eslint-disable camelcase */
import config from '../../../config.js'
import { makeStandardResponse } from '../utils/responseFormatter.js'
import logger from '../../../../utils/logger.js'

/**
 * 确保 LLM 模块已初始化
 */
async function ensureLLMInitialized() {
  if (!global.middleware.llm) {
    logger.info('LLM 模块未初始化，正在初始化...')
    global.middleware.llm = (await import('../../../chat/llm/index.js')).default
  }
}

/**
 * 获取实例的 displayName（也用作 instanceId）
 * @param {string} adapterType - 适配器类型
 * @param {number} targetIndex - 目标实例在配置数组中的索引
 * @param {object} currentConfig - 当前配置对象
 * @returns {string} displayName
 */
function getInstanceDisplayName(adapterType, targetIndex, currentConfig) {
  const instancesList = currentConfig.llm_adapters?.[adapterType]
  if (!Array.isArray(instancesList)) {
    throw new Error(`${adapterType} 配置不存在或格式错误`)
  }

  const instanceConfig = instancesList[targetIndex]
  if (!instanceConfig) {
    throw new Error(`实例索引 ${targetIndex} 不存在`)
  }

  // 计算这是第几个启用的实例（用于生成默认名称）
  let enabledCounter = 0
  for (let i = 0; i <= targetIndex; i++) {
    if (instancesList[i]?.enable) {
      enabledCounter++
    }
  }

  return instanceConfig.name || `${adapterType}-${enabledCounter}`
}

/**
 * 获取完整配置
 */
export function getFullConfig(req, res) {
  try {
    // 强制重新从文件读取配置
    const currentConfig = config.loadConfig('default')
    
    logger.info(`[getFullConfig] 读取配置，llm_adapters.openai 数量: ${currentConfig.llm_adapters?.openai?.length || 0}`)
    if (currentConfig.llm_adapters?.openai?.[0]) {
      logger.info(`[getFullConfig] openai[0].name: ${currentConfig.llm_adapters.openai[0].name}`)
    }
    
    // 移除敏感信息
    const safeConfig = sanitizeConfig(currentConfig)
    
    // 添加 models 字段
    const models = getModelsForConfig()
    
    res.json(makeStandardResponse({
      ...safeConfig,
      models
    }))
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
 * 获取模型列表（用于配置接口）
 * @returns {Object} { provider: [{ group, owner, models }] }
 */
function getModelsForConfig() {
  if (!global.middleware.llm) {
    return {}
  }

  const modelsByProvider = global.middleware.llm.getModelList(true)
  const result = {}

  // 转换格式：为每个 owner 添加 group 字段
  for (const [provider, ownerList] of Object.entries(modelsByProvider)) {
    result[provider] = ownerList.map(item => ({
      group: item.owner, // group 和 owner 相同
      owner: item.owner,
      models: item.models
    }))
  }

  return result
}

/**
 * 获取指定配置节点
 */
export function getConfigSection(req, res) {
  try {
    const { section } = req.params
    const currentConfig = config.loadConfig('default')
    
    if (!currentConfig[section]) {
      return res.status(404).json({
        code: 1,
        message: `配置节点 ${section} 不存在`,
        data: null,
      })
    }
    
    const safeData = sanitizeSectionConfig(section, currentConfig[section])
    
    res.json(makeStandardResponse(safeData))
  } catch (error) {
    logger.error('获取配置节点失败:', error)
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
export function updateConfig(req, res) {
  try {
    const updates = req.body
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        code: 1,
        message: '无效的配置数据',
        data: null,
      })
    }
    
    // 验证配置
    const validation = validateConfig(updates)
    if (!validation.valid) {
      return res.status(400).json({
        code: 1,
        message: '配置验证失败: ' + validation.errors.join(', '),
        data: null,
      })
    }
    
    // 读取当前配置
    const currentConfig = config.loadConfig('default')
    
    // 深度合并配置
    const mergedConfig = deepMerge(currentConfig, updates)
    
    // 保存配置
    config.writeYamlFile(config.config_path, mergedConfig)
    
    logger.info('配置已更新')
    
    res.json(makeStandardResponse({
      message: '配置更新成功，请重启服务使配置生效',
      updated: Object.keys(updates),
    }))
  } catch (error) {
    logger.error('更新配置失败:', error)
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
export function updateConfigSection(req, res) {
  try {
    const { section } = req.params
    const sectionData = req.body
    
    // 读取当前配置
    const currentConfig = config.loadConfig('default')
    
    if (!(section in currentConfig)) {
      return res.status(404).json({
        code: 1,
        message: `配置节点 ${section} 不存在`,
        data: null,
      })
    }
    
    // 验证配置节点
    const validation = validateConfigSection(section, sectionData)
    if (!validation.valid) {
      return res.status(400).json({
        code: 1,
        message: '配置验证失败: ' + validation.errors.join(', '),
        data: null,
      })
    }
    
    // 更新配置节点
    currentConfig[section] = sectionData
    
    // 保存配置
    config.writeYamlFile(config.config_path, currentConfig)
    
    logger.info(`配置节点 ${section} 已更新`)
    
    res.json(makeStandardResponse({
      message: `配置节点 ${section} 更新成功，请重启服务使配置生效`,
      section,
    }))
  } catch (error) {
    logger.error('更新配置节点失败:', error)
    res.status(500).json({
      code: 1,
      message: '更新配置节点失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 添加 LLM 适配器实例
 */
export async function addLLMInstance(req, res) {
  try {
    const { adapterType } = req.params
    const instanceConfig = req.body
    
    if (!instanceConfig || Object.keys(instanceConfig).length === 0) {
      return res.status(400).json({
        code: 1,
        message: '缺少必要参数: instanceConfig',
        data: null,
      })
    }
    
    const validAdapterTypes = ['openai', 'gemini', 'vertex']
    if (!validAdapterTypes.includes(adapterType)) {
      return res.status(400).json({
        code: 1,
        message: `无效的适配器类型，支持: ${validAdapterTypes.join(', ')}`,
        data: null,
      })
    }
    
    // 读取当前配置
    const currentConfig = config.loadConfig('default')
    
    // 确保 llm_adapters 存在
    if (!currentConfig.llm_adapters) {
      currentConfig.llm_adapters = {}
    }
    
    // 确保适配器类型数组存在
    if (!Array.isArray(currentConfig.llm_adapters[adapterType])) {
      currentConfig.llm_adapters[adapterType] = []
    }
    
    // 添加新实例
    currentConfig.llm_adapters[adapterType].push(instanceConfig)
    const instanceIndex = currentConfig.llm_adapters[adapterType].length - 1
    
    // 保存配置
    config.writeYamlFile(config.config_path, currentConfig)
    
    // 同步更新 config 对象的属性
    config.llm_adapters = currentConfig.llm_adapters
    
    logger.info(`添加 ${adapterType} 适配器实例 #${instanceIndex}`)
    
    // 计算实例名称（displayName 也用作 instanceId）
    const displayName = getInstanceDisplayName(adapterType, instanceIndex, currentConfig)
    const instanceId = displayName  // instanceId 就是 displayName
    
    // 准备实例配置（需要处理 Vertex 等特殊配置）
    const preparedConfig = await prepareInstanceConfig(adapterType, instanceConfig, currentConfig)
    
    // 确保 LLM 模块已初始化
    await ensureLLMInitialized()
    
    // 只添加这一个新实例
    const result = await global.middleware.llm.addInstance(
      instanceId,
      adapterType,
      displayName,
      preparedConfig
    )
    
    // 如果成功，标记为可用
    if (result.success) {
      config.availableInstances.push({
        instanceId,
        adapterType,
        displayName,
      })
    }
    
    // 获取当前所有 providers 和 models
    const providers = config.getProvidersAvailable()
    const models = global.middleware.llm.getModelList(true)
    
    // 重新读取配置以获取最新的数据
    const updatedConfig = config.loadConfig('default')
    const addedInstance = updatedConfig.llm_adapters[adapterType][instanceIndex]
    
    res.json(makeStandardResponse({
      message: result.success 
        ? `${adapterType} 适配器实例添加成功`
        : `${adapterType} 适配器实例添加失败: ${result.error}`,
      adapterType,
      instanceIndex,
      instance: sanitizeSectionConfig('llm_adapters', { [adapterType]: [addedInstance] })[adapterType][0],
      providers,
      models,
    }))
  } catch (error) {
    logger.error('添加适配器实例失败:', error)
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
    
    const validAdapterTypes = ['openai', 'gemini', 'vertex']
    if (!validAdapterTypes.includes(adapterType)) {
      return res.status(400).json({
        code: 1,
        message: `无效的适配器类型，支持: ${validAdapterTypes.join(', ')}`,
        data: null,
      })
    }
    
    const instanceIndex = parseInt(index)
    if (isNaN(instanceIndex) || instanceIndex < 0) {
      return res.status(400).json({
        code: 1,
        message: '无效的实例索引',
        data: null,
      })
    }
    
    // 读取当前配置
    const currentConfig = config.loadConfig('default')
    
    if (!currentConfig.llm_adapters?.[adapterType]?.[instanceIndex]) {
      return res.status(404).json({
        code: 1,
        message: `${adapterType} 适配器实例 #${instanceIndex} 不存在`,
        data: null,
      })
    }
    
    // 计算旧的 displayName（也是 instanceId）
    const oldDisplayName = getInstanceDisplayName(adapterType, instanceIndex, currentConfig)
    const oldInstanceId = oldDisplayName  // instanceId 就是 displayName
    
    logger.info(`更新 ${adapterType} 适配器实例 #${instanceIndex} (${oldInstanceId})`)
    
    // 过滤掉 undefined 值，避免覆盖原有配置
    const filteredConfig = Object.fromEntries(
      Object.entries(instanceConfig).filter(([_, value]) => value !== undefined)
    )
    
    // 合并更新实例配置（支持部分参数更新）
    const existingConfig = currentConfig.llm_adapters[adapterType][instanceIndex]
    const mergedConfig = {
      ...existingConfig,
      ...filteredConfig
    }
    currentConfig.llm_adapters[adapterType][instanceIndex] = mergedConfig
    
    logger.info(`[updateLLMInstance] 合并后的配置 name: ${mergedConfig.name}`)
    
    // 保存配置
    config.writeYamlFile(config.config_path, currentConfig)
    
    logger.info(`[updateLLMInstance] 配置已写入文件: ${config.config_path}`)
    
    // 同步更新 config 对象的属性，确保后续 GET 请求能获取到最新值
    config.llm_adapters = currentConfig.llm_adapters
    
    // 验证是否真的更新了
    const verifyConfig = config.loadConfig('default')
    logger.info(`[updateLLMInstance] 验证读取 - name: ${verifyConfig.llm_adapters[adapterType][instanceIndex].name}`)
    
    // 计算新的 displayName（也是 instanceId）
    const newDisplayName = getInstanceDisplayName(adapterType, instanceIndex, currentConfig)
    const newInstanceId = newDisplayName  // instanceId 就是 displayName
    
    // 准备实例配置 - 使用合并后的完整配置
    const preparedConfig = await prepareInstanceConfig(adapterType, mergedConfig, currentConfig)
    
    // 确保 LLM 模块已初始化
    await ensureLLMInitialized()
    
    // 先删除旧实例（如果存在）
    if (global.middleware.llm.llms[oldInstanceId]) {
      logger.info(`删除旧实例: ${oldInstanceId} (${oldDisplayName})`)
      global.middleware.llm.removeInstance(oldInstanceId)
    }
    
    // 用新配置创建新实例
    logger.info(`创建新实例: ${newInstanceId} (${newDisplayName})`)
    const result = await global.middleware.llm.addInstance(
      newInstanceId,
      adapterType,
      newDisplayName,
      preparedConfig
    )
    
    // 如果成功，标记为可用
    if (result.success) {
      const instanceInfo = {
        instanceId: newInstanceId,
        adapterType,
        displayName: newDisplayName,
      }
      // 更新 config.availableInstances
      const existingIndex = config.availableInstances.findIndex(
        (inst) => inst.instanceId === oldInstanceId
      )
      if (existingIndex >= 0) {
        config.availableInstances[existingIndex] = instanceInfo
      } else {
        config.availableInstances.push(instanceInfo)
      }
    }
    
    // 获取当前所有 providers 和 models
    const providers = config.getProvidersAvailable()
    const models = global.middleware.llm.getModelList(true)
    
    // 重新读取配置以获取最新的数据
    const updatedConfig = config.loadConfig('default')
    const updatedInstance = updatedConfig.llm_adapters[adapterType][instanceIndex]
    
    res.json(makeStandardResponse({
      message: result.success
        ? `${adapterType} 适配器实例 #${instanceIndex} 更新成功`
        : `${adapterType} 适配器实例 #${instanceIndex} 更新失败: ${result.error}`,
      adapterType,
      instanceIndex,
      instance: sanitizeSectionConfig('llm_adapters', { [adapterType]: [updatedInstance] })[adapterType][0],
      providers,
      models,
    }))
  } catch (error) {
    logger.error('更新适配器实例失败:', error)
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
    
    const validAdapterTypes = ['openai', 'gemini', 'vertex']
    if (!validAdapterTypes.includes(adapterType)) {
      return res.status(400).json({
        code: 1,
        message: `无效的适配器类型，支持: ${validAdapterTypes.join(', ')}`,
        data: null,
      })
    }
    
    const instanceIndex = parseInt(index)
    if (isNaN(instanceIndex) || instanceIndex < 0) {
      return res.status(400).json({
        code: 1,
        message: '无效的实例索引',
        data: null,
      })
    }
    
    // 读取当前配置
    const currentConfig = config.loadConfig('default')
    
    if (!currentConfig.llm_adapters?.[adapterType]?.[instanceIndex]) {
      return res.status(404).json({
        code: 1,
        message: `${adapterType} 适配器实例 #${instanceIndex} 不存在`,
        data: null,
      })
    }
    
    // 计算要删除的实例名称（也是 instanceId）
    const displayName = getInstanceDisplayName(adapterType, instanceIndex, currentConfig)
    const instanceId = displayName  // instanceId 就是 displayName
    
    logger.info(`准备删除 ${adapterType} 适配器实例 #${instanceIndex} (${instanceId}: ${displayName})`)
    
    // 确保 LLM 模块已初始化（可能已经没有实例了）
    await ensureLLMInitialized()
    
    // 从运行时删除实例
    const removed = global.middleware.llm.removeInstance(instanceId)
    
    // 从 config.availableInstances 中移除
    config.availableInstances = config.availableInstances.filter(
      (inst) => inst.instanceId !== instanceId
    )
    
    if (!removed) {
      logger.warn(`实例 ${instanceId} 不在运行时中，可能已经被删除`)
    }
    
    // 从配置文件删除
    currentConfig.llm_adapters[adapterType].splice(instanceIndex, 1)
    
    // 保存配置
    config.writeYamlFile(config.config_path, currentConfig)
    
    // 同步更新 config 对象的属性
    config.llm_adapters = currentConfig.llm_adapters
    
    logger.info(`删除 ${adapterType} 适配器实例 #${instanceIndex}`)
    
    // 获取当前所有 providers 和 models
    const providers = config.getProvidersAvailable()
    const models = global.middleware.llm.getModelList(true)
    
    res.json(makeStandardResponse({
      message: `${adapterType} 适配器实例 #${instanceIndex} 删除成功`,
      adapterType,
      instanceIndex,
      providers,
      models,
    }))
  } catch (error) {
    logger.error('删除适配器实例失败:', error)
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
    const exampleConfig = config.loadYamlFile(config.example_path)
    
    // 保存到配置文件
    config.writeYamlFile(config.config_path, exampleConfig)
    
    logger.warn('配置已重置为示例配置')
    
    res.json(makeStandardResponse({
      message: '配置已重置为示例配置，请重启服务使配置生效',
    }))
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
export function validateConfigEndpoint(req, res) {
  try {
    const configToValidate = req.body
    
    const validation = validateConfig(configToValidate)
    
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
 * 刷新 LLM 模型列表（不修改配置，只重新获取模型）
 */
export async function refreshModels(req, res) {
  try {
    const { adapterType, index } = req.params
    
    // 如果指定了适配器类型和索引，只刷新该实例
    if (adapterType && index !== undefined) {
      const instanceIndex = parseInt(index)
      if (isNaN(instanceIndex) || instanceIndex < 0) {
        return res.status(400).json({
          code: 1,
          message: '无效的实例索引',
          data: null,
        })
      }
      
      const validAdapterTypes = ['openai', 'gemini', 'vertex']
      if (!validAdapterTypes.includes(adapterType)) {
        return res.status(400).json({
          code: 1,
          message: `无效的适配器类型，支持: ${validAdapterTypes.join(', ')}`,
          data: null,
        })
      }
      
      // 获取当前配置中的实例
      const currentConfig = config.loadConfig('default')
      const instanceConfig = currentConfig.llm_adapters?.[adapterType]?.[instanceIndex]
      
      if (!instanceConfig) {
        return res.status(404).json({
          code: 1,
          message: `${adapterType} 适配器实例 #${instanceIndex} 不存在`,
          data: null,
        })
      }
      
      // 计算实例名称（也是 instanceId）
      const displayName = getInstanceDisplayName(adapterType, instanceIndex, currentConfig)
      const instanceId = displayName  // instanceId 就是 displayName
      
      logger.info(`刷新 ${adapterType} 适配器实例 #${instanceIndex} (${instanceId}: ${displayName}) 的模型列表`)
      
      // 确保 LLM 模块已初始化
      await ensureLLMInitialized()
      
      // 只刷新这个实例的模型列表
      const result = await global.middleware.llm.refreshInstanceModels(instanceId)
      
      if (!result.success) {
        return res.status(500).json({
          code: 1,
          message: `模型列表刷新失败: ${result.error}`,
          data: null,
        })
      }
      
      // 获取当前所有 providers 和 models
      const providers = config.getProvidersAvailable()
      const models = global.middleware.llm.getModelList(true)
      
      res.json(makeStandardResponse({
        message: `${adapterType} 适配器实例 #${instanceIndex} 模型列表刷新成功`,
        providers,
        models,
      }))
    } else {
      // 刷新所有实例
      logger.info('刷新所有 LLM 适配器的模型列表')
      
      // 确保 LLM 模块已初始化
      await ensureLLMInitialized()
      
      const results = await global.middleware.llm.refreshAllModels()
      
      // 获取当前所有 providers 和 models
      const providers = config.getProvidersAvailable()
      const models = global.middleware.llm.getModelList(true)
      
      const successCount = results.filter(r => r.success).length
      const failedInstances = results.filter(r => !r.success)
      
      res.json(makeStandardResponse({
        message: `所有适配器模型列表刷新成功 (${successCount}/${results.length})`,
        providers,
        models,
        details: failedInstances.length > 0 ? {
          failed: failedInstances.map(f => ({
            instance: f.displayName || f.instanceId,
            error: f.error
          }))
        } : undefined
      }))
    }
  } catch (error) {
    logger.error('刷新模型列表失败:', error)
    res.status(500).json({
      code: 1,
      message: '刷新模型列表失败: ' + error.message,
      data: null,
    })
  }
}

// ========== 辅助函数 ==========

/**
 * 准备实例配置（处理 Vertex 等特殊配置）
 */
async function prepareInstanceConfig(adapterType, instanceConfig, fullConfig) {
  const preparedConfig = { ...instanceConfig }
  
  if (adapterType === 'vertex') {
    // 处理 Vertex 认证配置
    if (instanceConfig.service_account_json && instanceConfig.service_account_json.trim()) {
      try {
        preparedConfig.authConfig = JSON.parse(instanceConfig.service_account_json)
      } catch (error) {
        logger.error('Vertex service_account_json 解析失败:', error.message)
      }
    } else if (instanceConfig.auth_file_path && instanceConfig.auth_file_path.trim()) {
      try {
        preparedConfig.authConfig = config.loadJsonFile(instanceConfig.auth_file_path)
      } catch (error) {
        logger.warn(`Vertex 密钥文件加载失败: ${instanceConfig.auth_file_path}`, error.message)
      }
    }
    
    // 添加 Gemini 配置作为备用
    const geminiInst = fullConfig.llm_adapters?.gemini?.[0]
    if (geminiInst) {
      preparedConfig.geminiConfig = geminiInst
    }
  }
  
  return preparedConfig
}

/**
 * 移除配置中的敏感信息
 */
function sanitizeConfig(config) {
  const safeCopy = JSON.parse(JSON.stringify(config))
  
  // 隐藏 API keys
  if (safeCopy.llm_adapters) {
    for (const adapterType of ['openai', 'gemini', 'vertex']) {
      if (Array.isArray(safeCopy.llm_adapters[adapterType])) {
        safeCopy.llm_adapters[adapterType].forEach((inst) => {
          if (inst.api_key) {
            inst.api_key = maskSecret(inst.api_key)
          }
          if (inst.service_account_json) {
            inst.service_account_json = '[HIDDEN]'
          }
        })
      }
    }
  }
  
  // 隐藏 OneBot token
  if (safeCopy.onebot?.token) {
    safeCopy.onebot.token = maskSecret(safeCopy.onebot.token)
  }
  
  // 隐藏管理员访问码
  if (safeCopy.web?.admin_code) {
    safeCopy.web.admin_code = maskSecret(safeCopy.web.admin_code)
  }
  
  if (safeCopy.web?.user_code) {
    safeCopy.web.user_code = maskSecret(safeCopy.web.user_code)
  }
  
  return safeCopy
}

/**
 * 移除指定配置节点的敏感信息
 */
function sanitizeSectionConfig(section, data) {
  const safeCopy = JSON.parse(JSON.stringify(data))
  
  if (section === 'llm_adapters') {
    for (const adapterType of ['openai', 'gemini', 'vertex']) {
      if (Array.isArray(safeCopy[adapterType])) {
        safeCopy[adapterType].forEach((inst) => {
          if (inst.api_key) {
            inst.api_key = maskSecret(inst.api_key)
          }
          if (inst.service_account_json) {
            inst.service_account_json = '[HIDDEN]'
          }
        })
      }
    }
  } else if (section === 'onebot') {
    if (safeCopy.token) {
      safeCopy.token = maskSecret(safeCopy.token)
    }
  } else if (section === 'web') {
    if (safeCopy.admin_code) {
      safeCopy.admin_code = maskSecret(safeCopy.admin_code)
    }
    if (safeCopy.user_code) {
      safeCopy.user_code = maskSecret(safeCopy.user_code)
    }
  }
  
  return safeCopy
}

/**
 * 隐藏秘密字符串（显示前后几个字符）
 */
function maskSecret(secret) {
  if (!secret || secret.length < 8) {
    return '***'
  }
  const start = secret.substring(0, 4)
  const end = secret.substring(secret.length - 4)
  return `${start}...${end}`
}

/**
 * 深度合并对象
 */
function deepMerge(target, source) {
  const output = { ...target }
  
  for (const key in source) {
    if (Object.hasOwnProperty.call(source, key)) {
      const isTargetObject = typeof output[key] === 'object' && output[key] !== null && !Array.isArray(output[key])
      const isSourceObject = typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])
      
      if (isTargetObject && isSourceObject) {
        output[key] = deepMerge(output[key], source[key])
      } else {
        output[key] = source[key]
      }
    }
  }
  
  return output
}

/**
 * 验证配置
 */
function validateConfig(config) {
  const errors = []
  
  // 验证 server 配置
  if (config.server) {
    if (config.server.port && (config.server.port < 1 || config.server.port > 65535)) {
      errors.push('server.port 必须在 1-65535 之间')
    }
    if (config.server.max_rate_pre_min && config.server.max_rate_pre_min < 1) {
      errors.push('server.max_rate_pre_min 必须大于 0')
    }
  }
  
  // 验证 llm_adapters 配置
  if (config.llm_adapters) {
    for (const adapterType of ['openai', 'gemini', 'vertex']) {
      if (config.llm_adapters[adapterType]) {
        if (!Array.isArray(config.llm_adapters[adapterType])) {
          errors.push(`llm_adapters.${adapterType} 必须是数组`)
        } else {
          config.llm_adapters[adapterType].forEach((inst, index) => {
            if (typeof inst.enable !== 'boolean') {
              errors.push(`llm_adapters.${adapterType}[${index}].enable 必须是布尔值`)
            }
          })
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 验证配置节点
 */
function validateConfigSection(section, data) {
  const errors = []
  
  switch (section) {
    case 'server':
      if (data.port && (data.port < 1 || data.port > 65535)) {
        errors.push('port 必须在 1-65535 之间')
      }
      if (data.max_rate_pre_min && data.max_rate_pre_min < 1) {
        errors.push('max_rate_pre_min 必须大于 0')
      }
      break
      
    case 'onebot':
      if (data.enable && !data.reverse_ws_url) {
        errors.push('启用 OneBot 时必须配置 reverse_ws_url')
      }
      break
      
    case 'llm_adapters':
      for (const adapterType of ['openai', 'gemini', 'vertex']) {
        if (data[adapterType] && !Array.isArray(data[adapterType])) {
          errors.push(`${adapterType} 必须是数组`)
        }
      }
      break
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}
