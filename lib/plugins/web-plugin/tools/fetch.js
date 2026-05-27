import { MioFunction } from '../../../function.js'

export default class Fetch extends MioFunction {
  constructor() {
    super({
      name: 'fetch',
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
  getDisplayName(params) {
    const { url, method = 'GET' } = params
    if (!url) return 'HTTP Request'
    const shortUrl = url.length > 50 ? url.substring(0, 47) + '...' : url
    return `HTTP ${method}: ${shortUrl}`
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

      const contentType = response.headers.get('content-type') || ''
      let responseData

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          status: response.status,
          error: errorText || response.statusText,
        }
      }

      if (contentType.includes('application/json')) {
        responseData = await response.json()
      } else if (this._isTextContent(contentType)) {
        responseData = await response.text()
        if (responseData.length > 50000) {
          responseData =
            responseData.substring(0, 50000) +
            '\n\n... (Content truncated due to length limits to save tokens)'
        }
      } else {
        const size = response.headers.get('content-length')
        const sizeStr = size ? `(${Math.round(size / 1024)} KB)` : ''
        return {
          success: true,
          status: response.status,
          data: `[Binary or non-text data] Content-Type: ${contentType} ${sizeStr}. Omitted to save tokens.`,
          contentType,
        }
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

  _isTextContent(contentType) {
    if (!contentType) return false
    const textTypes = [
      'application/json',
      'application/xml',
      'application/javascript',
      'application/x-yaml',
      'application/toml',
      'application/rss+xml',
      'application/atom+xml',
      'application/ld+json',
    ]
    if (contentType.startsWith('text/')) return true
    return textTypes.some((type) => contentType.includes(type))
  }
}
