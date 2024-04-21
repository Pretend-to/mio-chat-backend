import OpenAI from 'openai'
import config from '../config.js'

/**
 * @class OpenAI 协议实现
 */
class OpenAIBot {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.openai = new OpenAI({
      baseURL: baseUrl,
      apiKey: apiKey,
    })

    this.models = []
    this.guestModels = []

  }

  async initModels() {
    this.models = await this.getModels()

    const keywords = config.openai.guest_engines

    this.models.forEach(item => {
      let owner = item.owner
      let models = item.models.filter(model => {
        for (let keyword of keywords) {
          if (model.includes(keyword)) {
            return true
          }
        }
        return false
      })

      if (models.length > 0) {
        this.guestModels.push({ owner, models })
      }
    })

    // { ownerCount: 1, modelsCount:2 ,guestOwnerCount: 1, guestModelsCount: 1}
    const result = {
      ownerCount: this.models.length,
      modelsCount: this.models.reduce((acc, cur) => acc + cur.models.length, 0),
      guestOwnerCount: this.guestModels.length,
      guestModelsCount: this.guestModels.reduce((acc, cur) => acc + cur.models.length, 0),
    }

    return result

  }

  async getModels() {
    const list = await this.openai.models.list()
    const ownerList = []
    const modelList = []

    list.data.forEach((element) => {
      if (!ownerList.includes(element.owned_by)) {
        ownerList.push(element.owned_by)
        modelList.push({
          owner: element.owned_by,
          models: [element.id],
        })
      }else {
        const index = ownerList.indexOf(element.owned_by)
        modelList[index].models.push(element.id)
      }
    })
    return modelList
  }

  async complete(body) {
    const completion = await this.openai.chat.completions.create(body)
  
    let response = ''

    for await (const chunk of completion) {
      if(chunk.choices[0].delta.content){
        response += chunk.choices[0].delta.content
        console.log(response)
      }
    }
  }

  async chat(e) {
    try {
      console.log(e.body)
      e.body.stream = true
      const completion = await this.openai.chat.completions.create(e.body)
      e.pending()
      let index = 0
      for await (const chunk of completion) {
        if(chunk.choices[0].delta.content) e.update(index,chunk.choices[0].delta.content)
        index++
      }
      e.complete()
    }catch (error) {
      e.error(error)
    }

  }
}

const openaiConfig = config.openai


const openai = new OpenAIBot(openaiConfig.openai_base_url, openaiConfig.openai_api_key)

export default openai