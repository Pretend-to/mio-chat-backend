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

  async initServer(type,config) {

    let llm
    switch (type) {
      case LLM_TYPES.OPENAI:
        llm = new OpenAI(config)
        break
      case LLM_TYPES.GEMINI:
        llm = new Gemini(config)
        break
      default:
        throw new Error(`Unsupported LLM type: ${type}`)
    }

    try {
      await llm.loadModles() // 假设init是一个异步方法
      this.llms[type] = llm
      logger.info(`${type} initialized successfully.`)
      return llm
    } catch (error) {
      logger.error(`Failed to initialize ${type}:`, error)
      throw new Error(`Failed to initialize ${type}`, { cause: error }) // 抛出带有cause的错误
    }
  }

  handleMessage(e) {
    const type = e.type
    const llm = this.llms[type]
    if (!llm) {
      throw new Error(`No LLM found for type: ${type}`)
    }
    try {
      llm.chat(e)
    } catch (error) {
      logger.error(`Error in LLM chat for type ${type}:`, error)
      throw new Error(`Error in LLM chat for type ${type}`, { cause: error }) 
    }

  }

  getModelList(isAdmin) {
    const models = []
    for (const type in this.llms) {
      if (isAdmin) {
        models.concat(this.llms[type].models)
      } else {
        models.concat(this.llms[type].guestModels)
      }
    } 
    return models
  }
}

export default new LLMChatService()