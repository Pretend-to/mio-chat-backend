import config from '../../../config.js'
import { getAvailableAdapterTypes } from '../../../chat/llm/adapters/registry.js'
import logger from '../../../../utils/logger.js'

/**
 * 验证配置
 */
export async function validateConfig(configData) {
  const errors = []

  // 验证 server 配置
  if (configData.server) {
    if (configData.server.port && (configData.server.port < 1 || configData.server.port > 65535)) {
      errors.push('server.port 必须在 1-65535 之间')
    }

  }

  // 验证 llm_adapters 配置
  if (configData.llm_adapters) {
    const allAdapterTypes = await getAvailableAdapterTypes()
    for (const adapterType of allAdapterTypes) {
      if (configData.llm_adapters[adapterType]) {
        if (!Array.isArray(configData.llm_adapters[adapterType])) {
          errors.push(`llm_adapters.${adapterType} 必须是数组`)
        } else {
          configData.llm_adapters[adapterType].forEach((inst, index) => {
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
export async function validateConfigSection(section, data) {
  const errors = []

  switch (section) {
    case 'server':
      if (data.port && (data.port < 1 || data.port > 65535)) {
        errors.push('port 必须在 1-65535 之间')
      }

      break

    case 'onebot':
      if (data.enable && !data.reverse_ws_url) {
        errors.push('启用 OneBot 时必须配置 reverse_ws_url')
      }
      break

    case 'llm_adapters':
      const allAdapterTypes = await getAvailableAdapterTypes()
      for (const adapterType of allAdapterTypes) {
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

/**
 * 深度合并对象
 */
export function deepMerge(target, source) {
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
 * 隐藏秘密字符串（显示前后几个字符）
 */
export function maskSecret(secret) {
  if (!secret || secret.length < 8) {
    return '***'
  }
  const start = secret.substring(0, 4)
  const end = secret.substring(secret.length - 4)
  return `${start}...${end}`
}

/**
 * 移除配置中的敏感信息
 */
export function sanitizeConfig(configData) {
  const safeCopy = JSON.parse(JSON.stringify(configData))

  // 不再隐藏 API keys，保留原始值
  if (safeCopy.llm_adapters) {
    for (const adapterType of ['openai', 'gemini', 'vertex']) {
      if (Array.isArray(safeCopy.llm_adapters[adapterType])) {
        safeCopy.llm_adapters[adapterType].forEach((inst) => {
          // api_key 保留原值，不脱敏
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
export async function sanitizeSectionConfig(section, data) {
  const safeCopy = JSON.parse(JSON.stringify(data))

  if (section === 'llm_adapters') {
    const allAdapterTypes = await getAvailableAdapterTypes()
    for (const adapterType of allAdapterTypes) {
      if (Array.isArray(safeCopy[adapterType])) {
        safeCopy[adapterType].forEach((inst) => {
          // api_key 保留原值，不脱敏
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
 * 准备实例配置（处理 Vertex 等特殊配置）
 */
export async function prepareInstanceConfig(adapterType, instanceConfig, fullConfig) {
  const preparedConfig = { ...instanceConfig }

  if (adapterType === 'vertex') {
    // 处理 Vertex 认证配置
    if (instanceConfig.service_account_json && instanceConfig.service_account_json.trim()) {
      try {
        preparedConfig.authConfig = JSON.parse(instanceConfig.service_account_json)
      } catch (error) {
        logger.error('Vertex service_account_json 解析失败:', error.message)
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
 * 获取实例的 displayName（也用作 instanceId）
 */
export function getInstanceDisplayName(adapterType, targetIndex, currentConfig) {
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
 * 广播模型更新消息到所有连接的客户端
 */
export async function broadcastModelUpdate() {
  try {
    // 通过 Socket.IO 向所有客户端广播模型更新
    if (global.middleware && global.middleware.socketServer && global.middleware.socketServer.io) {
      // 获取默认模型
      const default_model = await config.getDefaultModel()

      // 获取所有连接的客户端
      const sockets = await global.middleware.socketServer.io.fetchSockets()

      for (const socket of sockets) {
        const isAdmin = socket.userInfo?.isAdmin || false

        // 使用 LLM 服务的 getModelList 方法获取根据权限筛选的模型列表
        const filteredModels = global.middleware.llm?.getModelList(isAdmin) || {}

        // 根据可用模型过滤提供商
        const providers = config.getProvidersAvailable().filter(provider => {
          const instanceId = provider.displayName
          const models = filteredModels[instanceId]
          return models && models.length > 0
        })

        const updateMessage = {
          protocol: 'system',
          type: 'models_updated',
          data: {
            providers,
            models: filteredModels,
            default_model,
            timestamp: new Date().toISOString()
          }
        }

        socket.emit('message', JSON.stringify(updateMessage))
      }

      logger.info('[broadcastModelUpdate] 已向所有客户端推送模型更新（根据权限筛选）')
    }
  } catch (error) {
    logger.error('[broadcastModelUpdate] 推送模型更新失败:', error)
  }
}

/**
 * 确保 LLM 模块已初始化
 */
export async function ensureLLMInitialized() {
  if (!global.middleware.llm) {
    logger.info('LLM 模块未初始化，正在初始化...')
    global.middleware.llm = (await import('../../../chat/llm/index.js')).default
  }
}

/**
 * 同步 availableInstances 数组与运行中的实例
 */
export function syncAvailableInstances() {
  if (!global.middleware?.llm) {
    config.availableInstances = []
    return
  }

  config.availableInstances = []
  for (const [runningInstanceId, llmInstance] of Object.entries(global.middleware.llm.llms)) {
    const metadata = global.middleware.llm.instanceMetadata[runningInstanceId]
    if (metadata) {
      config.availableInstances.push({
        instanceId: runningInstanceId,
        adapterType: metadata.adapterType,
        displayName: metadata.displayName,
      })
    }
  }
  
  logger.debug(`同步 availableInstances: ${config.availableInstances.length} 个实例`)
}

// ========== 配置管理业务逻辑 ==========

/**
 * 获取模型列表用于配置
 */
export function getModelsForConfig() {
  // 如果 LLM 模块已初始化，获取模型列表
  if (global.middleware && global.middleware.llm) {
    return global.middleware.llm.getModelList(true) // 获取所有模型（管理员视图）
  }
  // 如果 LLM 模块未初始化，返回空对象
  return {}
}

/**
 * 获取完整配置
 */
export async function getFullConfig() {
  try {
    // 从数据库获取系统配置
    const { default: SystemSettingsService } = await import('../../../database/services/SystemSettingsService.js')
    
    // 确保服务已初始化
    if (!SystemSettingsService.prisma) {
      await SystemSettingsService.initialize()
    }
    
    // 构建扁平的配置结构，与原始接口格式一致
    const config = {
      debug: false,
      server: { port: 3000 },
      web: {},
      onebot: { enable: false },
      llm_adapters: {}
    }

    // 从数据库加载各个配置项
    const adminCode = await SystemSettingsService.get('admin_code')
    const userCode = await SystemSettingsService.get('user_code')
    const serverPort = await SystemSettingsService.get('server_port')
    const serverHost = await SystemSettingsService.get('server_host')

    const debugMode = await SystemSettingsService.get('debug_mode')
    const webFullScreen = await SystemSettingsService.get('web_full_screen')
    const webTitle = await SystemSettingsService.get('web_title')
    const webBeian = await SystemSettingsService.get('web_beian')
    const llmAdapters = await SystemSettingsService.get('llm_adapters')
    const onebot = await SystemSettingsService.get('onebot')

    // 应用配置
    if (adminCode && adminCode.value) {
      config.web.admin_code = adminCode.value
    }
    if (userCode && userCode.value) {
      config.web.user_code = userCode.value
    }
    if (serverPort && serverPort.value) {
      config.server.port = serverPort.value
    }
    if (serverHost && serverHost.value) {
      config.server.host = serverHost.value
    }

    if (debugMode && debugMode.value !== null) {
      config.debug = debugMode.value
    }
    if (webFullScreen && webFullScreen.value !== null) {
      config.web.full_screen = webFullScreen.value
    }
    if (webTitle && webTitle.value) {
      config.web.title = webTitle.value
    }
    if (webBeian && webBeian.value) {
      config.web.beian = webBeian.value
    }
    if (llmAdapters && llmAdapters.value) {
      config.llm_adapters = llmAdapters.value
    }
    if (onebot && onebot.value) {
      config.onebot = onebot.value
    }

    // 添加 models 字段
    const models = getModelsForConfig()

    return {
      ...config,
      models
    }
  } catch (error) {
    logger.error('从数据库获取配置失败:', error)
    throw new Error('无法从数据库获取配置: ' + error.message)
  }
}

/**
 * 获取指定配置节点
 */
export async function getConfigSection(section) {
  try {
    // 从完整配置中获取指定节点
    const fullConfig = await getFullConfig()
    
    if (!(section in fullConfig)) {
      throw new Error(`配置节点 ${section} 不存在`)
    }
    
    return fullConfig[section]
  } catch (error) {
    logger.error(`从数据库获取配置节点 ${section} 失败:`, error)
    throw new Error(`无法从数据库获取配置节点 ${section}: ` + error.message)
  }
}

/**
 * 检查值是否为脱敏值
 */
function isMaskedValue(value) {
  if (typeof value !== 'string') return false
  // 检查是否为脱敏格式：xxxx...xxxx
  return /^.{4}\.\.\..{4}$/.test(value) || value === '[HIDDEN]' || value === '***'
}

/**
 * 过滤掉脱敏的字段，避免将脱敏数据写回数据库
 */
function filterMaskedFields(updates) {
  const filtered = {}
  
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'web' && typeof value === 'object') {
      const webFiltered = {}
      for (const [webKey, webValue] of Object.entries(value)) {
        // 跳过脱敏的访问码
        if ((webKey === 'admin_code' || webKey === 'user_code') && isMaskedValue(webValue)) {
          logger.debug(`跳过脱敏字段: web.${webKey}`)
          continue
        }
        webFiltered[webKey] = webValue
      }
      if (Object.keys(webFiltered).length > 0) {
        filtered[key] = webFiltered
      }
    } else if (key === 'onebot' && typeof value === 'object') {
      const onebotFiltered = {}
      for (const [onebotKey, onebotValue] of Object.entries(value)) {
        // 跳过脱敏的 token
        if (onebotKey === 'token' && isMaskedValue(onebotValue)) {
          logger.debug(`跳过脱敏字段: onebot.${onebotKey}`)
          continue
        }
        onebotFiltered[onebotKey] = onebotValue
      }
      if (Object.keys(onebotFiltered).length > 0) {
        filtered[key] = onebotFiltered
      }
    } else if (key === 'llm_adapters' && typeof value === 'object') {
      const adaptersFiltered = {}
      for (const [adapterType, instances] of Object.entries(value)) {
        if (Array.isArray(instances)) {
          const instancesFiltered = instances.map(instance => {
            const instanceFiltered = {}
            for (const [instKey, instValue] of Object.entries(instance)) {
              // 跳过脱敏的 service_account_json
              if (instKey === 'service_account_json' && isMaskedValue(instValue)) {
                logger.debug(`跳过脱敏字段: llm_adapters.${adapterType}[].${instKey}`)
                continue
              }
              instanceFiltered[instKey] = instValue
            }
            return instanceFiltered
          })
          adaptersFiltered[adapterType] = instancesFiltered
        } else {
          adaptersFiltered[adapterType] = instances
        }
      }
      if (Object.keys(adaptersFiltered).length > 0) {
        filtered[key] = adaptersFiltered
      }
    } else {
      // 其他字段直接保留
      filtered[key] = value
    }
  }
  
  return filtered
}

/**
 * 更新配置
 */
export async function updateConfig(updates) {
  if (!updates || typeof updates !== 'object') {
    throw new Error('无效的配置数据')
  }

  // 过滤掉脱敏字段
  const filteredUpdates = filterMaskedFields(updates)
  
  if (Object.keys(filteredUpdates).length === 0) {
    logger.info('没有需要更新的字段（所有字段都是脱敏值）')
    return {
      message: '没有需要更新的字段',
      updated: [],
    }
  }

  // 验证配置
  const validation = await validateConfig(filteredUpdates)
  if (!validation.valid) {
    throw new Error('配置验证失败: ' + validation.errors.join(', '))
  }

  try {
    // 从数据库更新配置
    const { default: SystemSettingsService } = await import('../../../database/services/SystemSettingsService.js')
    
    // 确保服务已初始化
    if (!SystemSettingsService.prisma) {
      await SystemSettingsService.initialize()
    }

    // 将嵌套配置展开为单独的数据库字段
    const settingsToUpdate = []
    
    for (const [key, value] of Object.entries(filteredUpdates)) {
      if (key === 'debug') {
        settingsToUpdate.push({
          key: 'debug_mode',
          value,
          category: 'general',
          description: '调试模式'
        })
      } else if (key === 'server' && typeof value === 'object') {
        if (value.port !== undefined) {
          settingsToUpdate.push({
            key: 'server_port',
            value: value.port,
            category: 'server',
            description: '服务器端口'
          })
        }
        if (value.host !== undefined) {
          settingsToUpdate.push({
            key: 'server_host',
            value: value.host,
            category: 'server',
            description: '服务器主机'
          })
        }

      } else if (key === 'web' && typeof value === 'object') {
        if (value.title !== undefined) {
          settingsToUpdate.push({
            key: 'web_title',
            value: value.title,
            category: 'web',
            description: '网站标题'
          })
        }
        if (value.full_screen !== undefined) {
          settingsToUpdate.push({
            key: 'web_full_screen',
            value: value.full_screen,
            category: 'web',
            description: '全屏模式'
          })
        }
        if (value.beian !== undefined) {
          settingsToUpdate.push({
            key: 'web_beian',
            value: value.beian,
            category: 'web',
            description: '备案号'
          })
        }
        if (value.admin_code !== undefined) {
          settingsToUpdate.push({
            key: 'admin_code',
            value: value.admin_code,
            category: 'auth',
            description: '管理员访问码'
          })
        }
        if (value.user_code !== undefined) {
          settingsToUpdate.push({
            key: 'user_code',
            value: value.user_code,
            category: 'auth',
            description: '用户访问码'
          })
        }
      } else if (key === 'onebot' && typeof value === 'object') {
        settingsToUpdate.push({
          key: 'onebot',
          value,
          category: 'onebot',
          description: 'OneBot 配置'
        })
      } else if (key === 'llm_adapters' && typeof value === 'object') {
        settingsToUpdate.push({
          key: 'llm_adapters',
          value,
          category: 'llm_adapters',
          description: 'LLM 适配器配置'
        })
      } else {
        // 其他直接存储的配置
        settingsToUpdate.push({
          key,
          value,
          category: 'general',
          description: `配置项: ${key}`
        })
      }
    }

    if (settingsToUpdate.length > 0) {
      await SystemSettingsService.setBatch(settingsToUpdate)
      logger.info(`配置已更新到数据库，共 ${settingsToUpdate.length} 项`)
      
      // 重新加载内存中的配置
      await config.reload()
      logger.info('内存配置已重新加载')
      
      // 如果更新了LLM相关配置，推送模型更新到所有客户端
      if (filteredUpdates.llm_adapters) {
        await broadcastModelUpdate()
        logger.info('已推送模型更新到所有客户端')
      }
    }

    return {
      message: '配置更新成功',
      updated: Object.keys(filteredUpdates),
    }
  } catch (error) {
    logger.error('从数据库更新配置失败:', error)
    throw new Error('无法更新配置到数据库: ' + error.message)
  }
}

/**
 * 更新指定配置节点
 */
export async function updateConfigSection(section, sectionData) {
  try {
    // 从数据库更新配置节点
    const { default: SystemSettingsService } = await import('../../../database/services/SystemSettingsService.js')
    
    // 确保服务已初始化
    if (!SystemSettingsService.prisma) {
      await SystemSettingsService.initialize()
    }

    // 过滤掉脱敏字段
    const filteredData = filterMaskedFields({ [section]: sectionData })[section]
    
    if (!filteredData || (typeof filteredData === 'object' && Object.keys(filteredData).length === 0)) {
      logger.info(`配置节点 ${section} 没有需要更新的字段（所有字段都是脱敏值）`)
      return {
        message: `配置节点 ${section} 没有需要更新的字段`,
        section,
      }
    }

    // 验证配置节点
    const validation = await validateConfigSection(section, filteredData)
    if (!validation.valid) {
      throw new Error('配置验证失败: ' + validation.errors.join(', '))
    }

    // 根据不同的配置节点进行不同的处理
    const settingsToUpdate = []
    
    if (section === 'server') {
      if (filteredData.port !== undefined) {
        settingsToUpdate.push({
          key: 'server_port',
          value: filteredData.port,
          category: 'server',
          description: '服务器端口'
        })
      }
      if (filteredData.host !== undefined) {
        settingsToUpdate.push({
          key: 'server_host',
          value: filteredData.host,
          category: 'server',
          description: '服务器主机'
        })
      }

    } else if (section === 'web') {
      if (filteredData.title !== undefined) {
        settingsToUpdate.push({
          key: 'web_title',
          value: filteredData.title,
          category: 'web',
          description: '网站标题'
        })
      }
      if (filteredData.full_screen !== undefined) {
        settingsToUpdate.push({
          key: 'web_full_screen',
          value: filteredData.full_screen,
          category: 'web',
          description: '全屏模式'
        })
      }
      if (filteredData.beian !== undefined) {
        settingsToUpdate.push({
          key: 'web_beian',
          value: filteredData.beian,
          category: 'web',
          description: '备案号'
        })
      }
      if (filteredData.admin_code !== undefined) {
        settingsToUpdate.push({
          key: 'admin_code',
          value: filteredData.admin_code,
          category: 'auth',
          description: '管理员访问码'
        })
      }
      if (filteredData.user_code !== undefined) {
        settingsToUpdate.push({
          key: 'user_code',
          value: filteredData.user_code,
          category: 'auth',
          description: '用户访问码'
        })
      }
    } else if (section === 'llm_adapters') {
      // 对于 llm_adapters，直接存储整个对象
      settingsToUpdate.push({
        key: 'llm_adapters',
        value: filteredData,
        category: 'llm_adapters',
        description: 'LLM 适配器配置'
      })
    } else if (section === 'onebot') {
      settingsToUpdate.push({
        key: 'onebot',
        value: filteredData,
        category: 'onebot',
        description: 'OneBot 配置'
      })
    } else if (section === 'debug') {
      settingsToUpdate.push({
        key: 'debug_mode',
        value: filteredData,
        category: 'general',
        description: '调试模式'
      })
    } else {
      // 其他配置节点直接存储
      settingsToUpdate.push({
        key: section,
        value: filteredData,
        category: 'general',
        description: `${section} 配置节点`
      })
    }

    if (settingsToUpdate.length > 0) {
      await SystemSettingsService.setBatch(settingsToUpdate)
      logger.info(`配置节点 ${section} 已更新到数据库，共 ${settingsToUpdate.length} 项`)
      
      // 重新加载内存中的配置
      await config.reload()
      logger.info('内存配置已重新加载')
      
      // 如果更新了LLM相关配置，推送模型更新到所有客户端
      if (section === 'llm_adapters') {
        await broadcastModelUpdate()
        logger.info('已推送模型更新到所有客户端')
      }
    }

    return {
      message: `配置节点 ${section} 更新成功`,
      section,
    }
  } catch (error) {
    logger.error(`从数据库更新配置节点 ${section} 失败:`, error)
    throw new Error(`无法更新配置节点 ${section} 到数据库: ` + error.message)
  }
}

/**
 * 重置配置到示例配置
 */
export async function resetConfig() {
  throw new Error('配置重置功能已禁用，请通过数据库管理配置')
}

// ========== LLM 适配器管理业务逻辑 ==========

/**
 * 添加 LLM 适配器实例
 */
export async function addLLMInstance(adapterType, instanceConfig) {
  if (!instanceConfig || Object.keys(instanceConfig).length === 0) {
    throw new Error('缺少必要参数: instanceConfig')
  }

  const validAdapterTypes = await getAvailableAdapterTypes()
  if (!validAdapterTypes.includes(adapterType)) {
    throw new Error(`无效的适配器类型，支持: ${validAdapterTypes.join(', ')}`)
  }

  // 从数据库读取当前配置
  const currentConfig = await getFullConfig()

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

  // 保存配置到数据库 - 只保存适配器配置，不包含嵌套结构
  const cleanLLMAdapters = {}
  for (const [type, instances] of Object.entries(currentConfig.llm_adapters)) {
    if (Array.isArray(instances)) {
      cleanLLMAdapters[type] = instances
    }
  }
  await updateConfigSection('llm_adapters', cleanLLMAdapters)

  logger.info(`添加 ${adapterType} 适配器实例 #${instanceIndex}`)

  // 计算实例名称（displayName 也用作 instanceId）
  const displayName = getInstanceDisplayName(adapterType, instanceIndex, currentConfig)
  const instanceId = displayName

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

  // 重新同步 availableInstances，确保所有运行中的实例都在列表中
  syncAvailableInstances()

  // 获取当前所有 providers 和 models
  const providers = config.getProvidersAvailable()
  const models = global.middleware.llm.getModelList(true)

  // 如果添加成功，推送模型更新到所有客户端
  if (result.success) {
    await broadcastModelUpdate()
  }

  // 重新读取配置以获取最新的数据
  const updatedConfig = await getFullConfig()
  const addedInstance = updatedConfig.llm_adapters[adapterType]?.[instanceIndex]

  return {
    message: result.success
      ? `${adapterType} 适配器实例添加成功`
      : `${adapterType} 适配器实例添加失败: ${result.error}`,
    adapterType,
    instanceIndex,
    instance: addedInstance,
    llm_adapters: updatedConfig.llm_adapters,
    providers,
    models,
  }
}

/**
 * 更新 LLM 适配器实例
 */
export async function updateLLMInstance(adapterType, index, instanceConfig) {
  const validAdapterTypes = await getAvailableAdapterTypes()
  if (!validAdapterTypes.includes(adapterType)) {
    throw new Error(`无效的适配器类型，支持: ${validAdapterTypes.join(', ')}`)
  }

  const instanceIndex = parseInt(index)
  if (isNaN(instanceIndex) || instanceIndex < 0) {
    throw new Error('无效的实例索引')
  }

  // 从数据库读取当前配置
  const currentConfig = await getFullConfig()
  if (!currentConfig.llm_adapters?.[adapterType]?.[instanceIndex]) {
    throw new Error(`${adapterType} 适配器实例 #${instanceIndex} 不存在`)
  }

  // 计算旧的 displayName（也是 instanceId）
  const oldDisplayName = getInstanceDisplayName(adapterType, instanceIndex, currentConfig)
  const oldInstanceId = oldDisplayName

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

  // 保存配置到数据库
  await updateConfigSection('llm_adapters', currentConfig.llm_adapters)

  // 计算新的 displayName（也是 instanceId）
  const newDisplayName = getInstanceDisplayName(adapterType, instanceIndex, currentConfig)
  const newInstanceId = newDisplayName

  // 准备实例配置 - 使用合并后的完整配置
  const preparedConfig = await prepareInstanceConfig(adapterType, mergedConfig, currentConfig)

  // 确保 LLM 模块已初始化
  await ensureLLMInitialized()

  // 先删除旧实例（如果存在）
  if (global.middleware.llm.llms[oldInstanceId]) {
    logger.info(`删除旧实例: ${oldInstanceId} (${oldDisplayName})`)
    global.middleware.llm.removeInstance(oldInstanceId)
  }

  // 从 availableInstances 中移除旧实例
  const existingIndex = config.availableInstances.findIndex(
    (inst) => inst.instanceId === oldInstanceId
  )
  if (existingIndex >= 0) {
    config.availableInstances.splice(existingIndex, 1)
  }

  // 只有当 enable 为 true 时才创建新实例
  let result = { success: false }
  if (mergedConfig.enable) {
    logger.info(`创建新实例: ${newInstanceId} (${newDisplayName})`)
    result = await global.middleware.llm.addInstance(
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
      config.availableInstances.push(instanceInfo)
    }
  } else {
    logger.info(`实例 ${newInstanceId} (${newDisplayName}) 已禁用，跳过创建`)
    result = { success: true } // 禁用操作也算成功
  }

  // 获取当前所有 providers 和 models
  const providers = config.getProvidersAvailable()
  const models = global.middleware.llm.getModelList(true)

  // 重新同步 availableInstances，确保所有运行中的实例都在列表中
  syncAvailableInstances()

  // 如果更新成功，推送模型更新到所有客户端
  if (result.success) {
    await broadcastModelUpdate()
  }

  // 重新读取配置以获取最新的数据
  const updatedConfig = await getFullConfig()
  const updatedInstance = updatedConfig.llm_adapters[adapterType]?.[instanceIndex]

  return {
    message: result.success
      ? `${adapterType} 适配器实例 #${instanceIndex} 更新成功`
      : `${adapterType} 适配器实例 #${instanceIndex} 更新失败: ${result.error}`,
    adapterType,
    instanceIndex,
    instance: updatedInstance,
    llm_adapters: updatedConfig.llm_adapters,
    providers,
    models,
  }
}

/**
 * 删除 LLM 适配器实例
 */
export async function deleteLLMInstance(adapterType, index) {
  const validAdapterTypes = await getAvailableAdapterTypes()
  if (!validAdapterTypes.includes(adapterType)) {
    throw new Error(`无效的适配器类型，支持: ${validAdapterTypes.join(', ')}`)
  }

  const instanceIndex = parseInt(index)
  if (isNaN(instanceIndex) || instanceIndex < 0) {
    throw new Error('无效的实例索引')
  }

  // 从数据库读取当前配置
  const currentConfig = await getFullConfig()

  if (!currentConfig.llm_adapters?.[adapterType]?.[instanceIndex]) {
    throw new Error(`${adapterType} 适配器实例 #${instanceIndex} 不存在`)
  }

  // 计算要删除的实例名称（也是 instanceId）
  const displayName = getInstanceDisplayName(adapterType, instanceIndex, currentConfig)
  const instanceId = displayName

  logger.info(`准备删除 ${adapterType} 适配器实例 #${instanceIndex} (${instanceId}: ${displayName})`)

  // 确保 LLM 模块已初始化（可能已经没有实例了）
  await ensureLLMInitialized()

  // 从运行时删除实例
  const removed = global.middleware.llm.removeInstance(instanceId)

  // 重新同步 availableInstances，确保所有运行中的实例都在列表中
  syncAvailableInstances()

  if (!removed) {
    logger.warn(`实例 ${instanceId} 不在运行时中，可能已经被删除`)
  }

  // 从配置中删除
  currentConfig.llm_adapters[adapterType].splice(instanceIndex, 1)

  // 保存配置到数据库
  await updateConfigSection('llm_adapters', currentConfig.llm_adapters)

  logger.info(`删除 ${adapterType} 适配器实例 #${instanceIndex}`)

  // 获取当前所有 providers 和 models
  const providers = config.getProvidersAvailable()
  const models = global.middleware.llm.getModelList(true)

  // 推送模型更新到所有客户端
  await broadcastModelUpdate()

  return {
    message: `${adapterType} 适配器实例 #${instanceIndex} 删除成功`,
    adapterType,
    instanceIndex,
    providers,
    models,
  }
}

/**
 * 刷新 LLM 模型列表
 */
export async function refreshModels(adapterType, index) {
  // 确保 LLM 模块已初始化
  await ensureLLMInitialized()

  let results
  if (adapterType && index !== undefined) {
    // 刷新单个实例
    const instanceIndex = parseInt(index)
    if (isNaN(instanceIndex) || instanceIndex < 0) {
      throw new Error('无效的实例索引')
    }

    const validAdapterTypes = await getAvailableAdapterTypes()
    if (!validAdapterTypes.includes(adapterType)) {
      throw new Error(`无效的适配器类型，支持: ${validAdapterTypes.join(', ')}`)
    }

    const currentConfig = await getFullConfig()
    const instanceConfig = currentConfig.llm_adapters?.[adapterType]?.[instanceIndex]

    if (!instanceConfig) {
      throw new Error(`${adapterType} 适配器实例 #${instanceIndex} 不存在`)
    }

    const displayName = getInstanceDisplayName(adapterType, instanceIndex, currentConfig)
    const instanceId = displayName

    const result = await global.middleware.llm.refreshInstanceModels(instanceId)

    if (!result.success) {
      throw new Error(`模型列表刷新失败: ${result.error}`)
    }

    results = [result]
  } else {
    // 刷新所有实例
    results = await global.middleware.llm.refreshAllModels()
  }

  // 获取当前所有 providers 和 models
  const providers = config.getProvidersAvailable()
  const models = global.middleware.llm.getModelList(true)

  const successCount = results.filter(r => r.success).length
  const failedInstances = results.filter(r => !r.success)

  // 推送模型更新到所有客户端
  await broadcastModelUpdate()

  return {
    message: `所有适配器模型列表刷新成功 (${successCount}/${results.length})`,
    providers,
    models,
    details: failedInstances.length > 0 ? {
      failed: failedInstances.map(f => ({
        instance: f.displayName || f.instanceId,
        error: f.error
      }))
    } : undefined
  }
}

/**
 * 测试 LLM 适配器连接并获取模型列表
 */
export async function testLLMModels(adapterType, testConfig) {
  const validAdapterTypes = await getAvailableAdapterTypes()
  if (!validAdapterTypes.includes(adapterType)) {
    throw new Error(`无效的适配器类型，支持: ${validAdapterTypes.join(', ')}`)
  }

  // 验证必要参数
  if (adapterType === 'vertex') {
    if (!testConfig.region) {
      throw new Error('Vertex AI 需要 region 参数')
    }
    if (!testConfig.service_account_json) {
      throw new Error('Vertex AI 需要 service_account_json')
    }
  } else {
    // OpenAI/Gemini
    if (!testConfig.api_key) {
      throw new Error(`${adapterType} 需要 api_key 参数`)
    }
    if (!testConfig.base_url) {
      throw new Error(`${adapterType} 需要 base_url 参数`)
    }
  }

  logger.info(`[testLLMModels] 测试 ${adapterType} 连接...`)

  // 生成临时实例 ID
  const tempInstanceId = `temp-test-${adapterType}-${Date.now()}`
  const tempDisplayName = tempInstanceId

  // 准备测试配置
  const currentConfig = await getFullConfig()
  const preparedConfig = await prepareInstanceConfig(adapterType, testConfig, currentConfig)

  // 确保 LLM 模块已初始化
  await ensureLLMInitialized()

  let testResult = null
  let models = null

  try {
    // 创建临时实例
    logger.info(`[testLLMModels] 创建临时实例: ${tempInstanceId}`)
    const createResult = await global.middleware.llm.addInstance(
      tempInstanceId,
      adapterType,
      tempDisplayName,
      preparedConfig
    )

    if (!createResult.success) {
      throw new Error(createResult.error || '创建临时实例失败')
    }

    // 获取模型列表
    logger.info('[testLLMModels] 获取模型列表...')
    const llmInstance = global.middleware.llm.llms[tempInstanceId]

    if (!llmInstance || !llmInstance.models) {
      throw new Error('实例创建成功但无法访问模型数据')
    }

    models = llmInstance.models

    testResult = {
      success: true,
      message: '连接测试成功'
    }

    logger.info(`[testLLMModels] 测试成功，获取到 ${models.length} 个模型组`)

  } catch (error) {
    logger.error('[testLLMModels] 测试失败:', error)
    testResult = {
      success: false,
      message: error.message || '连接测试失败'
    }
  } finally {
    // 删除临时实例
    if (global.middleware.llm.llms[tempInstanceId]) {
      logger.info(`[testLLMModels] 删除临时实例: ${tempInstanceId}`)
      global.middleware.llm.removeInstance(tempInstanceId)
    }
  }

  if (!testResult.success) {
    throw new Error(testResult.message)
  }

  return {
    message: testResult.message,
    models: models || []
  }
}

/**
 * 获取可用的适配器类型和元数据
 */
export async function getAdapterTypes() {
  try {
    // 动态导入适配器注册表
    const { getAvailableAdapterTypes, getAdapterMetadataList } = await import('../../../chat/llm/adapters/registry.js')
    
    // 获取适配器类型和元数据
    const [adapterTypes, metadataList] = await Promise.all([
      getAvailableAdapterTypes(),
      getAdapterMetadataList()
    ])

    // 构建返回数据
    const adaptersInfo = metadataList.map(metadata => ({
      type: metadata.type,
      name: metadata.name,
      description: metadata.description,
      supportedFeatures: metadata.supportedFeatures || [],
      initialConfigSchema: metadata.initialConfigSchema || {}
    }))

    return {
      types: adapterTypes,
      adapters: adaptersInfo,
      count: adapterTypes.length
    }
  } catch (error) {
    logger.error('获取适配器类型失败:', error)
    throw new Error('无法获取适配器类型信息: ' + error.message)
  }
}