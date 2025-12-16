import config from '../../config.js'

class LLMChatService {
  constructor() {
    this.llms = {} // key: instanceId, value: adapter instance
    this.instanceMetadata = {} // key: instanceId, value: { adapterType, displayName }
    this.presets = null
    this.plugins = []
  }

  /**
   * 清空所有适配器实例（用于热重载）
   */
  clearAll() {
    logger.info('清空所有LLM适配器实例...')
    this.llms = {}
    this.instanceMetadata = {}
  }

  /**
   * 删除单个适配器实例
   */
  removeInstance(instanceId) {
    if (this.llms[instanceId]) {
      logger.info(`删除适配器实例: ${instanceId}`)
      delete this.llms[instanceId]
      delete this.instanceMetadata[instanceId]
      return true
    }
    return false
  }

  /**
   * 更新单个适配器实例
   */
  async updateInstance(instanceId, adapterType, displayName, instanceConfig) {
    logger.info(`更新适配器实例: ${instanceId}`)
    
    // 先删除旧实例
    this.removeInstance(instanceId)
    
    // 重新初始化
    return new Promise((resolve) => {
      this.initServer(instanceId, adapterType, displayName, instanceConfig, (error) => {
        if (error) {
          logger.error(`实例 ${instanceId} 更新失败:`, error)
          resolve({ success: false, error: error.message })
        } else {
          logger.info(`实例 ${instanceId} 更新成功`)
          resolve({ success: true })
        }
      })
    })
  }

  /**
   * 添加单个适配器实例
   */
  async addInstance(instanceId, adapterType, displayName, instanceConfig) {
    logger.info(`添加适配器实例: ${instanceId}`)
    
    return new Promise((resolve) => {
      this.initServer(instanceId, adapterType, displayName, instanceConfig, (error) => {
        if (error) {
          logger.error(`实例 ${instanceId} 添加失败:`, error)
          resolve({ success: false, error: error.message })
        } else {
          logger.info(`实例 ${instanceId} 添加成功`)
          resolve({ success: true })
        }
      })
    })
  }

  /**
   * 刷新单个实例的模型列表
   */
  async refreshInstanceModels(instanceId) {
    const llm = this.llms[instanceId]
    if (!llm) {
      logger.warn(`实例 ${instanceId} 不存在`)
      return { success: false, error: '实例不存在' }
    }

    // 获取实例的显示名称
    const displayName = this.instanceMetadata[instanceId]?.displayName || instanceId

    try {
      logger.info(`刷新实例 ${displayName} 的模型列表`)
      // 使用 refreshModels 而不是 loadModels
      if (typeof llm.refreshModels === 'function') {
        await llm.refreshModels()
      } else {
        // 如果适配器没有实现 refreshModels，则使用 loadModels
        await llm.loadModels()
      }
      logger.info(`实例 ${displayName} 模型列表刷新成功`)
      return { success: true, displayName }
    } catch (error) {
      logger.error(`实例 ${displayName} 模型列表刷新失败:`, error)
      return { success: false, error: error.message, displayName }
    }
  }

  /**
   * 刷新所有实例的模型列表
   */
  async refreshAllModels() {
    logger.info('刷新所有实例的模型列表')
    const results = []
    
    for (const instanceId of Object.keys(this.llms)) {
      const result = await this.refreshInstanceModels(instanceId)
      results.push({
        instanceId,
        displayName: this.instanceMetadata[instanceId]?.displayName,
        ...result
      })
    }
    
    const successCount = results.filter(r => r.success).length
    logger.info(`模型列表刷新完成: ${successCount}/${results.length} 成功`)
    
    return results
  }

  async initServer(instanceId, adapterType, displayName, instanceConfig, finalCallback) {
    try {
      // 动态导入适配器 - 不再硬编码
      const adapterPath = `./adapters/${adapterType}.js`
      let AdapterClass
      
      try {
        const module = await import(adapterPath)
        AdapterClass = module.default
      } catch (importError) {
        const errorMessage = `Failed to import adapter: ${adapterType} (${adapterPath})`
        logger.error(errorMessage, importError)
        throw new Error(errorMessage)
      }
      
      if (!AdapterClass) {
        const errorMessage = `Adapter class not found for type: ${adapterType}`
        logger.error(errorMessage)
        throw new Error(errorMessage)
      }
      
      // 实例化适配器
      const llm = new AdapterClass(instanceConfig)

      if (!llm) {
        const errorMessage = `Failed to initialize LLM of type: ${adapterType}`
        logger.error(errorMessage)
        throw new Error(errorMessage)
      }

      // 先创建实例，再尝试加载模型
      this.llms[instanceId] = llm
      this.instanceMetadata[instanceId] = { adapterType, displayName }

      // 尝试加载模型（失败不影响实例创建）
      const modelLoadResult = await llm.loadModels()
      if (modelLoadResult.success) {
        logger.info(`[${displayName}] 模型加载成功`)
      } else {
        logger.warn(`[${displayName}] 模型加载失败，但实例已创建: ${modelLoadResult.error}`)
      }

      finalCallback()
      return llm
    } catch (error) {
      finalCallback(error)
    }
  }

  handleMessage(e) {
    try {
      const { settings } = e.body
      const providerName = settings?.provider || this._getDefaultProvider()

      // 通过 displayName 查找 instanceId
      const instanceId = this._findInstanceIdByDisplayName(providerName)
      const llm = this.llms[instanceId]

      if (!llm) {
        // 发送错误消息给用户
        const errorMessage = `您选择的模型或渠道 "${providerName}" 已失效，请重新选择模型。`
        e.error(new Error(errorMessage))

        // 推送最新的模型列表给所有客户端
        this._broadcastModelsUpdate()

        return
      }

      // 检查游客权限
      if (!e.user.isAdmin) {
        const model = settings.base.model
        if (model) {
          // 检查模型是否在游客可用列表中
          const isModelAllowed = this._isGuestModelAllowed(instanceId, model)

          if (!isModelAllowed) {
            const errorMessage = `模型 "${model}" 不在游客可用范围内，请选择其他模型。`
            e.error(new Error(errorMessage))
            return
          }
        }
      }

      llm.handleChatRequest(e)
    } catch (error) {
      logger.error(error)
      e.error(error)
    }
  }

  /**
   * 通过 displayName 查找 instanceId
   * @private
   */
  _findInstanceIdByDisplayName(displayName) {
    for (const [instanceId, metadata] of Object.entries(this.instanceMetadata)) {
      if (metadata.displayName === displayName) {
        return instanceId
      }
    }
    // 如果找不到，尝试直接使用 displayName 作为 instanceId（兼容旧逻辑）
    return displayName
  }

  /**
   * 获取默认的 provider
   * @private
   */
  _getDefaultProvider() {
    // 返回第一个可用的实例的 displayName
    const firstInstanceId = Object.keys(this.llms)[0]
    if (firstInstanceId && this.instanceMetadata[firstInstanceId]) {
      return this.instanceMetadata[firstInstanceId].displayName
    }
    return 'openai' // 后备默认值
  }

  getModelList(isAdmin) {
    const models = {}
    for (const instanceId in this.llms) {
      const metadata = this.instanceMetadata[instanceId]
      const displayName = metadata?.displayName || instanceId

      models[displayName] = isAdmin
        ? [...this.llms[instanceId].models]
        : [...this.llms[instanceId].guestModels]
    }
    return models
  }

  /**
   * 检查模型是否在游客可用列表中
   * @param {string} instanceId - 实例ID
   * @param {string} modelName - 模型名称
   * @returns {boolean} 是否允许游客使用
   * @private
   */
  _isGuestModelAllowed(instanceId, modelName) {
    try {
      const llm = this.llms[instanceId]
      if (!llm || !llm.guestModels) {
        return false
      }

      // 遍历游客模型列表，检查是否包含指定模型
      for (const owner of llm.guestModels) {
        if (owner.models && owner.models.includes(modelName)) {
          return true
        }
      }

      return false
    } catch (error) {
      logger.error(`检查游客模型权限失败: ${error.message}`)
      return false
    }
  }

  /**
   * 广播模型更新到所有客户端（根据权限筛选）
   * @private
   */
  _broadcastModelsUpdate() {
    try {
      const providers = config.getProvidersAvailable()
      const default_model = config.getDefaultModel()

      if (global.middleware?.socketServer?.io) {
        // 异步获取所有连接的客户端
        global.middleware.socketServer.io.fetchSockets().then(sockets => {
          for (const socket of sockets) {
            const isAdmin = socket.userInfo?.isAdmin || false

            // 使用 getModelList 获取根据权限筛选的模型列表
            const filteredModels = this.getModelList(isAdmin)

            // 根据可用模型过滤提供商
            const filteredProviders = providers.filter(provider => {
              const instanceId = provider.displayName
              const models = filteredModels[instanceId]
              return models && models.length > 0
            })

            const updateMessage = {
              protocol: 'system',
              type: 'models_updated',
              data: {
                providers: filteredProviders,
                models: filteredModels,
                default_model,
                timestamp: new Date().toISOString()
              }
            }

            socket.emit('message', JSON.stringify(updateMessage))
          }

          logger.info('[LLMChatService] 已向所有客户端推送模型更新（根据权限筛选）')
        }).catch(error => {
          logger.error('[LLMChatService] 获取客户端列表失败:', error)
        })
      }
    } catch (error) {
      logger.error('[LLMChatService] 推送模型更新失败:', error)
    }
  }

  
  getAllPresets() {
    return config.getAllPresets()
  }

  setPlugins(plugins) {
    this.plugins = plugins
  }

  serveToolsList() {
    const availableParams = ['name', 'description', 'parameters']
    const list = {}
    for (const plugin of this.plugins) {
      const pluginTools = plugin.getTools()
      for (const [pluginName, tools] of pluginTools) {
        const pluginList = {}
        for (const tool of tools) {
          const safeTool = {}
          for (const param of availableParams) {
            if (tool[param] !== undefined) {
              safeTool[param] = tool[param]
            }
          }
          pluginList[tool.name] = safeTool
        }
        list[pluginName] = pluginList
      }
    }
    return list
  }

  /**
   * Retrieves a list of LLM tools based on availability and provider.
   * @param {string[]} availableApps - An array of available application names.
   * @param {string} [provider='openai'] - The LLM provider ('openai' or 'gemini').
   * @returns {object[]} An array of LLM tool configurations.
   */
  getLLMTools(availableApps, provider) {
    const tools = []
    // 插件数组（this.plugins）reduce为Map，键为工具名，值为工具对象
    const allTools = this.getAllTools()

    // 遍历可用的应用名，检查是否有对应的工具
    for (const name of availableApps) {
      if (allTools.has(name)) {
        const tool = allTools.get(name)
        let toolConfig = tool.json(provider)
        tools.push(toolConfig)
      }
    }
    return tools
  }

  /**
   * Execute a tool call with given user context and parameters.
   * Includes timeout control.
   * @param {object} toolCall - 工具调用对象，通常包含name和parameters字段
   * @param {object} user - 调用用户信息对象
   * @returns {Promise<object>} 调用结果，包含call和result字段
   */
  async runTool(toolCall, user) {
    try {
      const allTools = this.getAllTools() // 假设此方法定义并返回 Map<string, Tool>
      const app = allTools.get(toolCall.name)
      if (!app) {
        const msg = `未找到插件: ${toolCall.name}`
        logger.warn(msg)
        throw new Error(msg)
      }

      let params = toolCall.parameters ?? '{}'
      try {
        params = typeof params === 'string' ? JSON.parse(params) : params
      } catch (err) {
        logger.warn('解析工具参数失败，使用默认空对象', err)
        params = {}
      }

      const e = {
        user,
        params,
      }

      const timeoutSeconds =
        typeof app.timeout === 'number' && app.timeout > 0 ? app.timeout : 30 // 默认超时30秒

      // 创建一个超时的Promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`执行超时，超过 ${timeoutSeconds} 秒`)),
          timeoutSeconds * 1000,
        ),
      )

      // 执行插件run，和超时竞争，限制最长执行时间
      const result = await Promise.race([app.run(e), timeoutPromise])

      return {
        call: toolCall,
        result,
      }
    } catch (error) {
      logger.error(error)
      return {
        call: toolCall,
        result: { error: error.message || error.toString() },
      }
    }
  }

  /**
   * 假设此方法返回所有插件工具的Map集合，键是工具名，值是工具对象
   */
  getAllTools() {
    const allTools = this.plugins.reduce((acc, plugin) => {
      // plugin.getTools() 返回的是一个二维结构数组，形如 [[pluginName, toolsArray], ...]
      const toolsList = plugin.getTools()
      for (const [_pluginName, toolsArray] of toolsList) {
        for (const tool of toolsArray) {
          acc.set(tool.name, tool)
        }
      }
      return acc // reduce 必须返回acc累积器
    }, new Map())
    return allTools
  }
}

export default new LLMChatService()
