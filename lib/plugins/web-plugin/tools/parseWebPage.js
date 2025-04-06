import { MioFunction } from '../../../functions.js'

import ApiPaser from '../lib/apiPaser.js'
import PuppPaser from '../lib/puppPaser.js'

export default class parseWebPage extends MioFunction {
  constructor() {
    super({
      name: 'parseWebPage',
      description:
                'A tool to scrape all text content from a specified website while preserving images and hyperlinks.  Uses either Puppeteer or a fallback API. If one fails gracefully, race continues. Puppeteer method prioritizes image and link gathering, while the fallback API prioritizes speed (but may not always work).',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type:'string',
            description: 'The URL of the website to scrape text content from.',
          },
        },
        required: ['url'] 
      }
    })
    this.func = this.parsePage
  }

  async parsePage(e){
    const { url } = e.params
    const { api, puppeteer } = this.getPluginConfig().parse

    const apiPaser = new ApiPaser(url, api)
    const puppPaser = new PuppPaser(url, puppeteer)

    const apiParse = apiPaser.parse()
    const puppParse = puppPaser.parse()


    try {
      const result = await Promise.race([apiParse, puppParse])
    
      if (result.success) {
        logger.info(result.source + ' parse success')
        return result // Return the successful result immediately
      } else {
        // Both resolved, but neither successful. Wait For all
        const allResults = await Promise.all([apiParse, puppParse])
        const successfulResult = allResults.find(r => r.success)
        if (successfulResult) {
          return successfulResult
        }
        // Both Promises resolved unsuccessfully
        return {
          success: false,
          source: 'all_failed',
          error: { message: 'Both Puppeteer and API methods failed to retrieve data.' },
        }
      }
    } catch (error) {
      // This *should* not happen, because the promises are designed to always resolve.
      logger.error(`Unexpected error: ${error.message}`)
      return {
        success: false,
        source: 'unexpected_error',
        error: { message: 'An unexpected error occurred during the scraping process.' },
      }
    }


  }
}