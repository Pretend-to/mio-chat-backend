import { MioFunction } from '../../../function.js'
import PuppPaser from '../lib/puppPaser.js'
import logger from '../../../../utils/logger.js'

export default class browse extends MioFunction {
  constructor() {
    super({
      name: 'browse',
      description: 'A tool to scrape text content, images, and links from a website using Puppeteer.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL of the website to scrape.',
          },
        },
        required: ['url'],
      },
    })
    this.func = this.parsePage
  }

  async parsePage(e) {
    const { url } = e.params
    const { puppeteer } = this.getPluginConfig().parse

    logger.info(`Starting Puppeteer parse for: ${url}`)
    const puppPaserInstance = new PuppPaser(url, puppeteer)

    try {
      const result = await puppPaserInstance.parse()

      if (result.success) {
        return result
      } else {
        return {
          success: false,
          error: result.error || { message: 'Failed to retrieve data using Puppeteer.' },
        }
      }
    } catch (error) {
      logger.error(`Unexpected error parsing ${url}: ${error.message}`)
      return {
        success: false,
        error: { message: error.message },
      }
    }
  }
}
