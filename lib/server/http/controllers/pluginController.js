import { makeStandardResponse } from '../utils/responseFormatter.js'
import logger from '../../../../utils/logger.js'
import fs from 'fs'
import path from 'path'

/**
 * 获取所有插件列表
 * GET /api/plugins
 */
export async function listPlugins(req, res) {
  try {
    const plugins = global.middleware.plugins || []
    
    const pluginList = plugins.map(plugin => {
      const metadata = plugin.getMetaData()
      const toolsMap = plugin.getTools()
      
      // 计算工具总数
      let toolCount = 0
      for (const tools of toolsMap.values()) {
        toolCount += Array.from(tools).length
      }
      
      return {
        name: plugin.name,
        displayName: metadata.name || plugin.name,
        description: metadata.description || '',
        version: metadata.version || 'unknown',
        author: metadata.author || 'unknown',
        enabled: plugin.config?.enabled !== false, // 默认启用
        toolCount,
        type: plugin.constructor.name === 'singleTools' ? 'custom' : 'standard',
        hasConfig: !!plugin.configPath && fs.existsSync(plugin.configPath),
      }
    })
    
    res.json(makeStandardResponse({
      plugins: pluginList,
      total: pluginList.length,
    }))
  } catch (error) {
    logger.error('获取插件列表失败:', error)
    res.status(500).json({
      code: 1,
      message: '获取插件列表失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 获取单个插件详情
 * GET /api/plugins/:pluginName
 */
export async function getPlugin(req, res) {
  try {
    const { pluginName } = req.params
    const plugin = findPluginByName(pluginName)
    
    if (!plugin) {
      return res.status(404).json({
        code: 1,
        message: `插件 ${pluginName} 不存在`,
        data: null,
      })
    }
    
    const metadata = plugin.getMetaData()
    const config = plugin.getConfig()
    const toolsMap = plugin.getTools()
    
    // 收集工具信息
    const tools = []
    for (const [group, toolsIterator] of toolsMap.entries()) {
      const toolsArray = Array.from(toolsIterator)
      tools.push({
        group,
        tools: toolsArray.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
      })
    }
    
    const pluginInfo = {
      name: plugin.name,
      displayName: metadata.name || plugin.name,
      description: metadata.description || '',
      version: metadata.version || 'unknown',
      author: metadata.author || 'unknown',
      enabled: config?.enabled !== false,
      config,
      tools,
      pluginPath: plugin.pluginPath,
      configPath: plugin.configPath,
      toolsPath: plugin.toolsPath,
    }
    
    res.json(makeStandardResponse(pluginInfo))
  } catch (error) {
    logger.error(`获取插件 ${req.params.pluginName} 详情失败:`, error)
    res.status(500).json({
      code: 1,
      message: '获取插件详情失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 更新插件配置
 * PUT /api/plugins/:pluginName/config
 */
export async function updatePluginConfig(req, res) {
  try {
    const { pluginName } = req.params
    const newConfig = req.body
    
    const plugin = findPluginByName(pluginName)
    
    if (!plugin) {
      return res.status(404).json({
        code: 1,
        message: `插件 ${pluginName} 不存在`,
        data: null,
      })
    }
    
    // 写入配置文件
    const configDir = path.dirname(plugin.configPath)
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }
    
    fs.writeFileSync(
      plugin.configPath,
      JSON.stringify(newConfig, null, 2),
      'utf-8'
    )
    
    // 重新加载配置 (会触发 chokidar 监听)
    logger.info(`[${pluginName}] 配置已更新，等待热更新...`)
    
    // 等待一小段时间让 chokidar 处理
    await new Promise(resolve => setTimeout(resolve, 600))
    
    const updatedConfig = plugin.getConfig()
    
    res.json(makeStandardResponse({
      message: '配置更新成功',
      config: updatedConfig,
    }))
  } catch (error) {
    logger.error(`更新插件 ${req.params.pluginName} 配置失败:`, error)
    res.status(500).json({
      code: 1,
      message: '更新插件配置失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 获取插件配置
 * GET /api/plugins/:pluginName/config
 */
export async function getPluginConfig(req, res) {
  try {
    const { pluginName } = req.params
    const plugin = findPluginByName(pluginName)
    
    if (!plugin) {
      return res.status(404).json({
        code: 1,
        message: `插件 ${pluginName} 不存在`,
        data: null,
      })
    }
    
    const config = plugin.getConfig()
    
    res.json(makeStandardResponse(config))
  } catch (error) {
    logger.error(`获取插件 ${req.params.pluginName} 配置失败:`, error)
    res.status(500).json({
      code: 1,
      message: '获取插件配置失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 重载插件 (重新加载工具)
 * POST /api/plugins/:pluginName/reload
 */
export async function reloadPlugin(req, res) {
  try {
    const { pluginName } = req.params
    const plugin = findPluginByName(pluginName)
    
    if (!plugin) {
      return res.status(404).json({
        code: 1,
        message: `插件 ${pluginName} 不存在`,
        data: null,
      })
    }
    
    logger.info(`[${pluginName}] 开始重载插件...`)
    
    // 重新加载工具
    await plugin.loadTools()
    
    // 如果插件有自定义的 initialize 方法，也调用它
    if (typeof plugin.initialize === 'function') {
      await plugin.initialize()
    }
    
    // 更新 LLM 适配器的插件列表
    if (global.middleware.llm) {
      global.middleware.llm.setPlugins(global.middleware.plugins)
    }
    
    const toolsMap = plugin.getTools()
    let toolCount = 0
    for (const tools of toolsMap.values()) {
      toolCount += Array.from(tools).length
    }
    
    logger.info(`[${pluginName}] 重载完成，加载了 ${toolCount} 个工具`)
    
    res.json(makeStandardResponse({
      message: '插件重载成功',
      pluginName,
      toolCount,
    }))
  } catch (error) {
    logger.error(`重载插件 ${req.params.pluginName} 失败:`, error)
    res.status(500).json({
      code: 1,
      message: '重载插件失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 启用/禁用插件
 * POST /api/plugins/:pluginName/toggle
 */
export async function togglePlugin(req, res) {
  try {
    const { pluginName } = req.params
    const { enabled } = req.body
    
    const plugin = findPluginByName(pluginName)
    
    if (!plugin) {
      return res.status(404).json({
        code: 1,
        message: `插件 ${pluginName} 不存在`,
        data: null,
      })
    }
    
    // 更新配置中的 enabled 字段
    const currentConfig = plugin.getConfig()
    const newConfig = {
      ...currentConfig,
      enabled: enabled === true,
    }
    
    // 写入配置文件
    const configDir = path.dirname(plugin.configPath)
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }
    
    fs.writeFileSync(
      plugin.configPath,
      JSON.stringify(newConfig, null, 2),
      'utf-8'
    )
    
    logger.info(`[${pluginName}] 插件已${enabled ? '启用' : '禁用'}`)
    
    // 等待配置更新
    await new Promise(resolve => setTimeout(resolve, 600))
    
    res.json(makeStandardResponse({
      message: `插件已${enabled ? '启用' : '禁用'}`,
      pluginName,
      enabled,
    }))
  } catch (error) {
    logger.error(`切换插件 ${req.params.pluginName} 状态失败:`, error)
    res.status(500).json({
      code: 1,
      message: '切换插件状态失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 获取插件的工具列表
 * GET /api/plugins/:pluginName/tools
 */
export async function getPluginTools(req, res) {
  try {
    const { pluginName } = req.params
    const plugin = findPluginByName(pluginName)
    
    if (!plugin) {
      return res.status(404).json({
        code: 1,
        message: `插件 ${pluginName} 不存在`,
        data: null,
      })
    }
    
    const toolsMap = plugin.getTools()
    const tools = []
    
    for (const [group, toolsIterator] of toolsMap.entries()) {
      const toolsArray = Array.from(toolsIterator)
      tools.push({
        group,
        count: toolsArray.length,
        tools: toolsArray.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
      })
    }
    
    res.json(makeStandardResponse({
      pluginName,
      tools,
      totalCount: tools.reduce((sum, group) => sum + group.count, 0),
    }))
  } catch (error) {
    logger.error(`获取插件 ${req.params.pluginName} 工具列表失败:`, error)
    res.status(500).json({
      code: 1,
      message: '获取插件工具列表失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 重载所有插件
 * POST /api/plugins/reload-all
 */
export async function reloadAllPlugins(req, res) {
  try {
    logger.info('开始重载所有插件...')
    
    const plugins = global.middleware.plugins || []
    const results = []
    
    for (const plugin of plugins) {
      try {
        await plugin.loadTools()
        
        if (typeof plugin.initialize === 'function') {
          await plugin.initialize()
        }
        
        const toolsMap = plugin.getTools()
        let toolCount = 0
        for (const tools of toolsMap.values()) {
          toolCount += Array.from(tools).length
        }
        
        results.push({
          name: plugin.name,
          success: true,
          toolCount,
        })
        
        logger.info(`[${plugin.name}] 重载成功，加载了 ${toolCount} 个工具`)
      } catch (error) {
        results.push({
          name: plugin.name,
          success: false,
          error: error.message,
        })
        logger.error(`[${plugin.name}] 重载失败:`, error)
      }
    }
    
    // 更新 LLM 适配器的插件列表
    if (global.middleware.llm) {
      global.middleware.llm.setPlugins(global.middleware.plugins)
    }
    
    const successCount = results.filter(r => r.success).length
    logger.info(`所有插件重载完成: ${successCount}/${results.length} 成功`)
    
    res.json(makeStandardResponse({
      message: '插件重载完成',
      results,
      successCount,
      totalCount: results.length,
    }))
  } catch (error) {
    logger.error('重载所有插件失败:', error)
    res.status(500).json({
      code: 1,
      message: '重载所有插件失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 调试工具执行
 * POST /api/plugins/:pluginName/tools/:toolName/debug
 */
export async function debugTool(req, res) {
  try {
    const { pluginName, toolName } = req.params
    const { parameters, user } = req.body
    
    // 查找插件
    const plugin = findPluginByName(pluginName)
    
    if (!plugin) {
      return res.status(404).json({
        code: 1,
        message: `插件 ${pluginName} 不存在`,
        data: null,
      })
    }
    
    // 查找工具
    let foundTool = null
    const toolsMap = plugin.getTools()
    
    for (const tools of toolsMap.values()) {
      const toolsArray = Array.from(tools)
      foundTool = toolsArray.find(t => t.name === toolName)
      if (foundTool) break
    }
    
    if (!foundTool) {
      return res.status(404).json({
        code: 1,
        message: `工具 ${toolName} 在插件 ${pluginName} 中不存在`,
        data: null,
      })
    }
    
    // 验证参数 schema
    const validationResult = validateToolParameters(foundTool, parameters)
    if (!validationResult.valid) {
      return res.status(400).json({
        code: 1,
        message: '参数验证失败',
        data: {
          errors: validationResult.errors,
          schema: foundTool.parameters,
        },
      })
    }
    
    // 从请求中获取 origin
    const protocol = req.protocol || 'http'
    const host = req.get('host') || 'localhost'
    const origin = `${protocol}://${host}`
    
    // 准备执行上下文
    const executionContext = {
      params: parameters || {},
      user: user || {
        isAdmin: true, // 调试模式默认管理员权限
        userId: 'debug-user',
        origin: origin, // 提供给需要 baseUrl 的工具使用
      },
    }
    
    // 执行工具
    logger.info(`[调试] 执行工具: ${pluginName}.${toolName}`)
    logger.json(executionContext.params)
    
    const startTime = Date.now()
    let result
    let error = null
    let timedOut = false
    
    // 设置超时保护（5分钟）
    const timeoutMs = 5 * 60 * 1000
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        timedOut = true
        reject(new Error(`工具执行超时 (>${timeoutMs / 1000}秒)`))
      }, timeoutMs)
    })
    
    try {
      // 兼容 func/run 两种方法
      const execMethod = typeof foundTool.func === 'function'
        ? foundTool.func
        : (typeof foundTool.run === 'function' ? foundTool.run : null)
      if (!execMethod) {
        throw new TypeError('工具没有可执行方法 (func/run)')
      }
      result = await Promise.race([
        execMethod.call(foundTool, executionContext),
        timeoutPromise
      ])
    } catch (err) {
      error = err
      logger.error('[调试] 工具执行失败:', err)
    }
    
    const executionTime = Date.now() - startTime
    
    // 返回调试结果
    if (error) {
      res.json(makeStandardResponse({
        success: false,
        pluginName,
        toolName,
        executionTime: `${executionTime}ms`,
        timedOut,
        error: {
          message: error.message,
          stack: error.stack,
        },
        input: executionContext.params,
      }))
    } else {
      res.json(makeStandardResponse({
        success: true,
        pluginName,
        toolName,
        executionTime: `${executionTime}ms`,
        result,
        input: executionContext.params,
      }))
    }
  } catch (error) {
    logger.error('工具调试失败:', error)
    res.status(500).json({
      code: 1,
      message: '工具调试失败: ' + error.message,
      data: null,
    })
  }
}

/**
 * 验证工具参数
 * @param {Object} tool - 工具对象
 * @param {Object} parameters - 用户提供的参数
 * @returns {Object} { valid: boolean, errors: Array }
 */
function validateToolParameters(tool, parameters) {
  const errors = []
  const schema = tool.parameters
  
  if (!schema) {
    return { valid: true, errors: [] }
  }
  
  // 检查必需参数
  if (schema.required && Array.isArray(schema.required)) {
    for (const requiredField of schema.required) {
      if (parameters[requiredField] === undefined || parameters[requiredField] === null) {
        errors.push({
          field: requiredField,
          message: `缺少必需参数: ${requiredField}`,
          type: 'required',
        })
      }
    }
  }
  
  // 检查参数类型
  if (schema.properties) {
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      const value = parameters[fieldName]
      
      // 如果参数不存在且不是必需的，跳过
      if (value === undefined || value === null) {
        continue
      }
      
      // 类型检查
      const expectedType = fieldSchema.type
      const actualType = Array.isArray(value) ? 'array' : typeof value
      
      if (expectedType && !isTypeValid(value, expectedType)) {
        errors.push({
          field: fieldName,
          message: `参数类型错误: 期望 ${expectedType}，实际 ${actualType}`,
          type: 'type_mismatch',
          expected: expectedType,
          actual: actualType,
        })
      }
      
      // 数组项类型检查
      if (expectedType === 'array' && fieldSchema.items) {
        const itemType = fieldSchema.items.type
        if (itemType && Array.isArray(value)) {
          value.forEach((item, index) => {
            if (!isTypeValid(item, itemType)) {
              errors.push({
                field: `${fieldName}[${index}]`,
                message: `数组项类型错误: 期望 ${itemType}`,
                type: 'array_item_type_mismatch',
                expected: itemType,
                actual: typeof item,
              })
            }
          })
        }
      }
      
      // 枚举值检查
      if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
        errors.push({
          field: fieldName,
          message: `参数值不在枚举范围内: ${fieldSchema.enum.join(', ')}`,
          type: 'enum_violation',
          allowedValues: fieldSchema.enum,
        })
      }
      
      // 字符串长度检查
      if (expectedType === 'string' && typeof value === 'string') {
        if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
          errors.push({
            field: fieldName,
            message: `字符串长度小于最小值 ${fieldSchema.minLength}`,
            type: 'min_length_violation',
          })
        }
        if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
          errors.push({
            field: fieldName,
            message: `字符串长度大于最大值 ${fieldSchema.maxLength}`,
            type: 'max_length_violation',
          })
        }
      }
      
      // 数值范围检查
      if ((expectedType === 'number' || expectedType === 'integer') && typeof value === 'number') {
        if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
          errors.push({
            field: fieldName,
            message: `数值小于最小值 ${fieldSchema.minimum}`,
            type: 'minimum_violation',
          })
        }
        if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
          errors.push({
            field: fieldName,
            message: `数值大于最大值 ${fieldSchema.maximum}`,
            type: 'maximum_violation',
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
 * 检查值是否符合类型
 */
function isTypeValid(value, expectedType) {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number' && !isNaN(value)
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'array':
      return Array.isArray(value)
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value)
    case 'null':
      return value === null
    default:
      return true
  }
}

/**
 * 辅助函数：根据名称查找插件
 */
function findPluginByName(pluginName) {
  const plugins = global.middleware.plugins || []
  return plugins.find(p => p.name === pluginName)
}
