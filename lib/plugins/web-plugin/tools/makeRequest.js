#!/usr/bin/env node
import { MioFunction } from '../../../function.js'

export default class makeRequest extends MioFunction {
  constructor() {
    super({
      name: 'makeRequest',
      description: 'A tool that performs HTTP requests and returns the response data.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to send the request to',
          },
          method: {
            type:'string',
            description: 'The HTTP method to use (GET or POST)',
            enum: ['GET', 'POST'],
          },  
          data: {
            type:'string',
            description: 'The stringfied data to send with the request (for POST requests)', 
          }
        },
        required: ['url','method'],
      }
    })
    this.func = this.httpRequest
  }

  async httpRequest(e) {
    const { url, method, data } = e.params

    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        ...(method === 'POST' ? { body: JSON.stringify(data) } : {}),
      }

      const response = await fetch(url, options)

      // 处理返回的纯文本类型
      const contentType = response.headers.get('content-type')
      let responseData

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = await response.text()
      }

      return {
        status: response.status,
        data: responseData,
      }
    } catch (error) {
      // 错误处理，兼容纯文本格式
      return {
        error: {
          message: error.message,
          status: error.response ? error.response.status : 500,
        },
      }
    }
  }
}

