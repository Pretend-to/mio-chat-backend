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

  async initServer(type,config) {

    let llm
    switch (type) {
      case LLM_TYPES.OPENAI:{
        const OpenAI = (await import('./adapters/openai.js')).default
        llm = new OpenAI(config)
        break
      }

      case LLM_TYPES.GEMINI:{
        const Gemini = (await import('./adapters/gemini.js')).default
        llm = new Gemini(config)
        break
      }

      default:
        throw new Error(`Unsupported LLM type: ${type}`)
    }

    try {
      await llm.loadModles() // 假设init是一个异步方法
      this.llms[type] = llm
      logger.mark(`${type} 协议初始化成功.`)
      return llm
    } catch (error) {
      logger.error(`下列协议初始化失败 ${type}:`, error)
      throw new Error('部分协议加载失败，请确认网络链接状态或反代配置', { cause: error }) // 抛出带有cause的错误
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
  getLLMTools(availableApps, provider = 'openai') {
    const tools = []

    for (const name of this.tools.keys()) {
      if (availableApps.includes(name)) {
        const tool = this.tools.get(name)
        let toolConfig

        if (provider === 'gemini') {
          toolConfig = tool.jsonGemini()
        } else if (provider === 'openai') {
          toolConfig = tool.jsonOpenai()
        } else {
          console.warn(`Unknown LLM provider: ${provider}.  Using openai.`)
          toolConfig = tool.jsonOpenai() // Default to OpenAI
        }

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