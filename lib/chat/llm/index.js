import config from '../../config.js'


const LLM_TYPES = {
  OPENAI: 'openai',
  GEMINI: 'gemini'
}

class LLMChatService {
  constructor() {
    this.llms = {}
    this.presets = null
    this.tools = new Map()
  }

  async initServer(type, config, finalCallback) {
    try {
      let llm

      switch (type) {
        case LLM_TYPES.OPENAI: {
          // 使用解构赋值直接导入 OpenAI 类
          const { default: OpenAI } = await import('./adapters/openai.js')
          llm = new OpenAI(config)
          break
        }
        case LLM_TYPES.GEMINI: {
          // 使用解构赋值直接导入 Gemini 类
          const { default: Gemini } = await import('./adapters/gemini.js')
          llm = new Gemini(config)
          break
        }
        default: {
          // 抛出更明确的错误信息
          const errorMessage = `Unsupported LLM type: ${type}`
          logger.error(errorMessage) // 记录错误
          throw new Error(errorMessage)
        }

      }

      // 确保 llm 已经被赋值
      if (!llm) {
        const errorMessage = `Failed to initialize LLM of type: ${type}`
        logger.error(errorMessage)
        throw new Error(errorMessage)
      }

      // 使用 await 等待模型加载完成
      await llm.loadModles() // 假设 loadModles 是一个异步方法

      this.llms[type] = llm

      // 成功时调用回调
      finalCallback()
      return llm

    } catch (error) {
      // 记录详细的错误信息
      logger.error(`Error initializing ${type}:`, error)

      // 调用回调函数，传递错误对象
      finalCallback(error)
    }
  }

  handleMessage(e) {
    try {
      const { settings } = e.body
      const provider = settings.provider || 'openai'
      const llm = this.llms[provider]
      if (!llm) throw new Error(`No LLM found for type: ${provider}`)
      llm.handleChatRequest(e)
    } catch (error) {
      logger.error(error)
    }

  }

  getModelList(isAdmin) {
    let models = {}
    for (const type in this.llms) {
      if (isAdmin) {
        models[type] = [...this.llms[type].models]
      } else {
        models[type] = [...this.llms[type].guestModels]
      }
    } 
    return models
  }

  getAllPresets() {
    return config.getAllPresets()
  }

  setTools(tools) {
    this.tools = tools 
  }

  getSafeTools() {
    const avaliableParams = ['name','description','parameters']
    const tools = []

    for (const [, tool] of this.tools) {
      const safeTool = {}
      for (const param of avaliableParams) {
        if (tool[param]) {
          safeTool[param] = tool[param]
        }
      }
      tools.push(safeTool)
    }
    return tools
  }

  /**
 * Retrieves a list of LLM tools based on availability and provider.
 * @param {string[]} availableApps - An array of available application names.
 * @param {string} [provider='openai'] - The LLM provider ('openai' or 'gemini').
 * @returns {object[]} An array of LLM tool configurations.
 */
  getLLMTools(availableApps, provider) {
    const tools = []

    for (const name of this.tools.keys()) {
      if (availableApps.includes(name)) {
        const tool = this.tools.get(name)
        let toolConfig = tool.json(provider)

        tools.push(toolConfig)
      }
    }

    return tools
  }

  async runTool(toolCall, user) {
    try {
      const app = this.tools.get(toolCall.name)
      if (!app) {
        logger.warn('未找到插件' + toolCall.name)
        throw new Error('未找到插件' + toolCall.name)
      }

      const params = toolCall.arguments ? toolCall.arguments : '{}'

      const e = {
        user,
        params: JSON.parse(params),
      }

      // 创建一个超时的Promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('执行超时，超过60秒')), 60000)
      )

      // 使用Promise.race来限制执行时间
      const result = await Promise.race([app.run(e), timeoutPromise])
      // logger.debug(result)
      return {
        error: null,
        result: result,
      }
    } catch (error) {
      logger.error(error) // 记录错误信息
      return error.message // 返回错误信息
    }
  }
}

export default new LLMChatService()