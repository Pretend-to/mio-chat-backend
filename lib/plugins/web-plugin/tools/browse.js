import { MioFunction } from '../../../function.js'
import PuppPaser from '../lib/puppPaser.js'

export default class browse extends MioFunction {
  constructor() {
    super({
      description: 'A tool to scrape text content, images, and links from a website using Puppeteer.',
      name: 'browse',
      parameters: {
        properties: {
          url: {
            description: 'The URL of the website to scrape.',
            type: 'string',
          },
        },
        required: ['url'],
        type: 'object',
      },
    })
    this.func = this.parsePage
  }
  getDisplayName(params) {
    const { url } = params
    if (!url) {return 'Browsing webpage'}
    const shortUrl = url.length > 50 ? `${url.substring(0, 47)  }...` : url
    return `Browsing: ${shortUrl}`
  }

  async parsePage(e) {
    const { url } = e.params
    const pluginConfig = this.getPluginConfig() || {}
    const puppeteer = {
      ...pluginConfig.parse?.puppeteer,
      chromePath: pluginConfig.chromePath || pluginConfig.parse?.puppeteer?.chromePath || '',
      parentPlugin: this.parentPlugin
    }

    logger.info(`Starting Puppeteer parse for: ${url}`)
    const puppPaserInstance = new PuppPaser(url, puppeteer)

    try {
      const result = await puppPaserInstance.parse()

      if (result.success) {
        return result
      } else {
        return {
          error: result.error || { message: 'Failed to retrieve data using Puppeteer.' },
          success: false,
        }
      }
    } catch (error) {
      logger.error(`Unexpected error parsing ${url}: ${error.message}`)
      return {
        error: { message: error.message },
        success: false,
      }
    }
  }
}
