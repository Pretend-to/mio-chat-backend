import OpenAI from './adapters/openai.js'
import Gemini from './adapters/gemini.js'

const LLM_TYPES = {
  OPENAI: 'openai',
  GEMINI: 'gemini'
}

class LLMChatService {
  constructor() {
    this.llms = {}
  }

  async initLLM(type) {
    if (!this.config[type]) {
      throw new Error(`Configuration for ${type} is missing.`)
    }

    let llm
    switch (type) {
      case LLM_TYPES.OPENAI:
        llm = new OpenAI(this.config[type])
        break
      case LLM_TYPES.GEMINI:
        llm = new Gemini(this.config[type])
        break
      default:
        throw new Error(`Unsupported LLM type: ${type}`)
    }

    try {
      await llm.init() // 假设init是一个异步方法
      this.llms[type] = llm
      logger.info(`${type} initialized successfully.`)
      return llm
    } catch (error) {
      logger.error(`Failed to initialize ${type}:`, error)
      throw new Error(`Failed to initialize ${type}`, { cause: error }) // 抛出带有cause的错误
    }
  }

  getLLM(type) {
    if (!this.llms[type]) {
      throw new Error(`${type} not initialized.  Call initLLM() first.`)
    }
    return this.llms[type]
  }
}

export { LLMChatService, LLM_TYPES }  // 导出枚举类型，方便调用方使用