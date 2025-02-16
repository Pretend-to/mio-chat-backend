/* eslint-disable camelcase */
/* eslint-disable no-unsafe-optional-chaining */
import OpenAI from 'openai'
import config from '../config.js'
import { imgUrlToBase64 } from '../../utils/imgTools.js'

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
    const ownerList = config.openai.model_owners
    let modelList = []

    list.data.forEach((element) => {
      let owner = 'Custom' // 默认 owner
      const modelId = element.id // 保存原始的模型 ID
      const modelIdLower = modelId.toLowerCase() // 将原始模型 ID 转换为小写，用于匹配

      // 使用 ownerList 匹配
      for (const { owner: currentOwner, keywords } of ownerList) {
        if (keywords.some(keyword => modelIdLower.includes(keyword))) {
          owner = currentOwner
          break
        }
      }

      const existingOwnerIndex = modelList.findIndex((item) => item.owner === owner)
      if (existingOwnerIndex !== -1) {
        modelList[existingOwnerIndex].models.push(modelId) // 使用原始的 modelId
      } else {
        modelList.push({
          owner: owner,
          models: [modelId],  // 使用原始的 modelId
        })
      }
    })

    // 对 modelList 进行排序（字母表降序，"Others" 最后）
    modelList = modelList.sort((a, b) => {
      if (a.owner === 'Custom') {
        return 1 // a (Others) 排在 b 后面
      }
      if (b.owner === 'Custom') {
        return -1 // b (Others) 排在 a 后面
      }
      return b.owner.localeCompare(a.owner) // 使用字母表降序排列
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

  async processMessages(messages) {
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === 'user' && Array.isArray(messages[i].content)) {
        for (const element of messages[i].content) {
          if (element.type === 'image_url') {
            const base64 = element.image_url.url.startsWith('http') ? await imgUrlToBase64(element.image_url.url) : element.image_url.url
            element.image_url.url = base64 // 将 URL 替换为 Base64
          }
        }
      }
    }
    return messages // 返回修改后的 messages 数组
  }

  _getFromatedTools(body) {
    if (body.enable_tool_call && body.tools.length > 0) {
      return middleware.getOpenaiTools(body.tools)
    }else {
      return null 
    }
  }

  async chat(e) {
    try {
      // 预处理消息中的图片 URL
      e.body.messages = await this.processMessages(e.body.messages)
      
      // 获取工具配置（保持与流式处理一致）
      const tools = this._getFromatedTools(e.body)

      // 创建非流式请求
      const completion = await this.openai.chat.completions.create({
        ...e.body,
        stream: false, // 明确关闭流式
        tools: tools
      })
  
      const message = completion.choices[0].message
  
      // 处理工具调用
      if (message.tool_calls && message.tool_calls.length > 0) {
        // 将工具调用添加到消息历史
        e.body.messages.push(message)
  
        // 遍历所有工具调用
        for (const call of message.tool_calls) {
          const tool_call = call.function
  
          // 执行工具调用
          tool_call.user = e.user // 保持用户上下文

          e.reply('',{
            name: tool_call.name,
            id: call.id,
            action: 'running',
            params: tool_call.arguments,
            result: ''
          })
          const tool_result = await middleware.runTool(tool_call)
  
          // 将工具结果添加到消息历史
          e.body.messages.push({
            tool_call_id: call.id,
            role: 'tool',
            name: tool_call.name,
            content: JSON.stringify(tool_result),
          })

          e.reply('',{
            name: tool_call.name,
            id: call.id,
            action: 'finished',
            params: tool_call.arguments,
            result: tool_result
          })
  
          // 递归处理新的消息上下文
          await this.chat(e)
        }
      } else {
        // 没有工具调用时发送响应
        e.reply(message.content,null)
      }
    } catch (error) {
      e.error(error)
    }
  }

  async streamChat(e, firstCall = true) {
    try {

      // 预处理消息中的图片 URL
      e.body.messages = await this.processMessages(e.body.messages)
      
      // 获取工具配置（保持与流式处理一致）
      const tools = this._getFromatedTools(e.body)

      const stream = await this.openai.chat.completions.create({
        ...e.body,
        stream: true,
        tools: tools
      })

      e.server.pushConnection(e.request_id, stream)

      e.pending()
      let call_message = {}
      for await (const chunk of stream) {
        // logger.debug(chunk.choices[0])
        if(chunk.choices[0]?.delta.content) e.update(chunk.choices[0].delta?.content || '', null)

        
        if(chunk.choices[0]?.delta.tool_calls) 
        {
          if(Object.keys(call_message).length == 0) {
            call_message = {...chunk.choices[0].delta}
            call_message.tool_calls.map(item => {
              e.update('',{
                name: item.function.name,
                id: item.id,
                action: 'started',
                params: '',
                result: ''
              })
              item.function.arguments = ''
            })
            logger.debug(call_message + JSON.stringify(call_message))

          }

          for(const function_call of chunk.choices[0].delta.tool_calls)
          {
            const call = call_message.tool_calls.find((call) => call.index == function_call.index)
            if(call && function_call?.function?.arguments != '') {
              call.function.arguments += function_call.function.arguments || ''
              e.update('',{
                name: call.function.name,
                id: call.id,
                action: 'pending',
                params: function_call.function.arguments || '',
                result: ''
              })
              logger.debug(call.function.arguments)
            }
          }
        }
      }

      if(call_message?.tool_calls?.length > 0){
        if(!call_message.role) call_message.role = 'assistant'
        e.body.messages.push(call_message)
        console.log(call_message.tool_calls[0].function.arguments)

        for(const call of call_message?.tool_calls){
          const tool_call = call.function
          e.update('',{
            name: tool_call.name,
            id: call.id,
            action: 'running',
            params: tool_call.arguments,
            result: ''
          })
          logger.info(`执行工具：${tool_call.name}，参数：${tool_call.arguments}`)
          logger.debug(tool_call)

          tool_call.user = e.user
          const tool_result = await middleware.runTool(tool_call)
          
          console.log(`运行结果：${JSON.stringify(tool_result)}`)

          e.body.messages.push({
            tool_call_id: call.id,
            role: 'tool',
            name: tool_call.name,
            content: JSON.stringify(tool_result),
          })
          
          e.update('',{
            name: tool_call.name,
            id: call.id,
            action: 'finished',
            params: tool_call.arguments,
            result: tool_result
          })

          console.log(e)
          await this.streamChat(e, false)  
        }
      }

      if(firstCall) e.complete()
    }catch (error) {
      e.error(error)
    }finally {
      e.server.popConnection(e.request_id)
    }

  }
}

const openaiConfig = config.openai

const openai = new OpenAIBot(openaiConfig.openai_base_url, openaiConfig.openai_api_key)

export default openai