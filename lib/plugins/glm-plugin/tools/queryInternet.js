import { MioFunction, Param } from '../../../functions.js'

export default class queryChineseNet extends MioFunction {
  constructor() {
    super({
      name: 'queryChineseNet',
      description: 'a online search engine which works better in Chinese',
      params: [
        new Param({
          name: 'query_prompt',
          type: 'string',
          description: 'the prompt to query internet, use natural language like 中国队奥运会拿了多少奖牌',
          required: true,
        }),
      ]
    })
    this.func = this.queryInternet
  }

  async queryInternet(e) {
    const prompt = e.params.query_prompt  // Ensure the parameter name matches
    const {apiKey} = this.getPluginConfig()

    // Check if apiKey is provided
    if (!apiKey) {
      return {
        error: 'API key is missing. Please configure it in pluginInfo.config.api_key.'
      }
    }

    const tool = 'web-search-pro'
    const url = 'https://open.bigmodel.cn/api/paas/v4/tools'
    const requestId = this.generateUUID() // Generate a unique request id

    const data = {
      // eslint-disable-next-line camelcase
      request_id: requestId,
      tool: tool,
      stream: false,
      messages: [{ role: 'user', content: prompt }]
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          error: `Request failed: ${response.status} ${response.statusText} - ${errorText}`
        }
      }

      const responseData = await response.json()
      return responseData  // Return the response data as is

    } catch (error) {
      return {
        error: `An error occurred: ${error.message}`
      }
    }
  }

  // Utility function to generate a UUID
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
}