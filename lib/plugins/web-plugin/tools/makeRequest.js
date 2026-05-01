import { MioFunction } from '../../../function.js'
import logger from '../../../../utils/logger.js'

export default class makeRequest extends MioFunction {
  constructor() {
    super({
      name: 'makeRequest',
      description:
        'A tool that performs HTTP requests and returns the response data.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to send the request to',
          },
          method: {
            type: 'string',
            description: 'The HTTP method to use (GET or POST)',
            enum: ['GET', 'POST'],
          },
          data: {
            type: 'object',
            description: 'The JSON data to send with the request (for POST requests)',
          },
          headers: {
            type: 'object',
            description: 'Custom HTTP headers to send with the request',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['url', 'method'],
      },
    })
    this.func = this.httpRequest
  }

  async httpRequest(e) {
    const { url, method, data, headers } = e.params

    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        ...(method === 'POST' && data ? { body: JSON.stringify(data) } : {}),
      }

      logger.debug(`Making ${method} request to ${url}`)
      const response = await fetch(url, options)

      const contentType = response.headers.get('content-type')
      let responseData

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          status: response.status,
          error: errorText || response.statusText
        }
      }

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = await response.text()
      }

      return {
        success: true,
        status: response.status,
        data: responseData,
      }
    } catch (error) {
      logger.error(`makeRequest failed for ${url}: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    }
  }
}
