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
      // to debug
      e.body.tools = ['amap-plugin','prodia-plugin']

      e.body.messages = e.body.messages.length == 1 ? [{
        role: 'system',
        content: middleware.toolsPrompt
      }].concat(e.body.messages) :
      e.body.messages


      const tools = middleware.getOpenaiTools(e.body.tools)

      // 国赛专用 开始
      if (e.body.model == 'moonshot-v1-32k') {
        e.body.model = 'gpt-4-all'
        logger.mark('success')
      }

      // 国赛专用 结束

      const completion = await this.openai.chat.completions.create({
        ...e.body,
        stream: true,
        tools: tools
      })

      e.pending()
      let index = 0

      let call_message = {}
      for await (const chunk of completion) {
        // logger.debug(chunk.choices[0])
        if(chunk.choices[0]?.delta.content) e.update(index++,chunk.choices[0].delta?.content || '')

        
        if(chunk.choices[0]?.delta.tool_calls) 
        {
          if(Object.keys(call_message).length == 0) {
            call_message = {...chunk.choices[0].delta}
            call_message.tool_calls.map(item => {
              item.function.arguments = ''
            })
            // call_message = {
            //   role: "assistant",
            //   tool_calls: [
            //     {
            //       function: {
            //         arguments: "",
            //         name: "getIP",
            //       },
            //       id: "call_z40V9jWOHB7J8iuPkxHJByNu",
            //       index: 0,
            //       type: "function",
            //     },
            //   ],
            // }
            console.log(call_message + JSON.stringify(call_message))

          }

          for(const function_call of chunk.choices[0].delta.tool_calls)
          {
            const call = call_message.tool_calls.find((call) => call.index == function_call.index)
            if(call && function_call?.function?.arguments != '') {
              call.function.arguments += function_call.function.arguments ? function_call.function.arguments : ''
              console.log('arguments:' + call.function.arguments + '+=' + function_call.function.arguments)
            }
          }
        }
      }

      if(call_message?.tool_calls?.length > 0){
        if(!call_message.role) call_message.role = 'assistant'
        e.body.messages.push(call_message)

        for(const call of call_message?.tool_calls){
          const tool_call = call.function
          e.update(index++,`执行工具：${tool_call.name}，参数：${tool_call.arguments}\n`)
          logger.info(`执行工具：${tool_call.name}，参数：${tool_call.arguments}`)
          logger.debug(tool_call)
          
          tool_call.user = e.user
          const tool_result = await middleware.runTool(tool_call)
          
          console.log(`运行结果：${JSON.stringify(tool_result)}`)

          e.body.messages.push({
            tool_call_id: call.id,
            role: "tool",
            name: tool_call.name,
            content: `The result of the last function was this: ${JSON.stringify(
              tool_result
            )}
            `,
          })
          
          console.log(e)
          await this.chat(e)  
        }

        // e.update(index++,`[${call.function.name}](${call.function.arguments})执行结果：${tool_result}`)
      }

      e.complete()
    }catch (error) {
      console.log(error)

      e.error(error)
    }

  }
}

const openaiConfig = config.openai


const openai = new OpenAIBot(openaiConfig.openai_base_url, openaiConfig.openai_api_key)

export default openai