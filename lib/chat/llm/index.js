import config from '../../config.js'

const LLM_TYPES = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  VERTEX: 'vertex',
}

class LLMChatService {
  constructor() {
    this.llms = {}
    this.presets = null
    this.plugins = []
  }

  async initServer(type, config, finalCallback) {
    try {
      let llm
      switch (type) {
        case LLM_TYPES.OPENAI: {
          const { default: OpenAI } = await import('./adapters/openai.js')
          llm = new OpenAI(config)
          break
        }
        case LLM_TYPES.GEMINI: {
          const { default: Gemini } = await import('./adapters/gemini.js')
          llm = new Gemini(config)
          break
        }
        case LLM_TYPES.VERTEX:{
          const { default: Vertex } = await import('./adapters/vertex.js')
          llm = new Vertex(config)
          break 
        }
        default: {
          const errorMessage = `Unsupported LLM type: ${type}`
          logger.error(errorMessage)
          throw new Error(errorMessage)
        }
      }
      if (!llm) {
        const errorMessage = `Failed to initialize LLM of type: ${type}`
        logger.error(errorMessage)
        throw new Error(errorMessage)
      }
      await llm.loadModels()
      this.llms[type] = llm
      finalCallback()
      return llm
    } catch (error) {
      finalCallback(error)
    }
  }

  handleMessage(e) {
    try {
      const { settings } = e.body
      const provider = settings?.provider || LLM_TYPES.OPENAI
      const llm = this.llms[provider]
      if (!llm) throw new Error(`No LLM found for type: ${provider}`)
      llm.handleChatRequest(e)
    } catch (error) {
      logger.error(error)
    }
  }

  getModelList(isAdmin) {
    const models = {}
    for (const type in this.llms) {
      models[type] = isAdmin
        ? [...this.llms[type].models]
        : [...this.llms[type].guestModels]
    }
    return models
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
    const tools = [];
    // 插件数组（this.plugins）reduce为Map，键为工具名，值为工具对象
    const allTools = this.getAllTools();
  
    // 遍历 allTools map 的所有工具名
    for (const name of allTools.keys()) {
      if (availableApps.includes(name)) {
        const tool = allTools.get(name);
        let toolConfig = tool.json(provider);
        tools.push(toolConfig);
      }
    }
    return tools;
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

      const timeoutSeconds = typeof app.timeout === 'number' && app.timeout > 0
        ? app.timeout
        : 30 // 默认超时30秒

      // 创建一个超时的Promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`执行超时，超过 ${timeoutSeconds} 秒`)), timeoutSeconds * 1000)
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
      const toolsList = plugin.getTools();
      for (const [pluginName, toolsArray] of toolsList) {
        for (const tool of toolsArray) {
          acc.set(tool.name, tool);
        }
      }
      return acc; // reduce 必须返回acc累积器
    }, new Map());
    return allTools;
  }
}

export default new LLMChatService()