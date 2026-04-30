import { MioFunction } from '../../../function.js'
import { launchBrowser } from '../lib/browser.js'
import logger from '../../../../utils/logger.js'

export default class WebScreenshot extends MioFunction {
  constructor() {
    super({
      name: 'WebScreenshot',
      description:
        'Takes a full-page screenshot of a specified URL. Returns the image URL.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to capture a screenshot from.',
          },
        },
        required: ['url'],
      },
    })
    this.func = this.takeScreenshot
  }

  async takeScreenshot(e) {
    const { url } = e.params
    const baseUrl = e.user.origin
    let browser
    try {
      browser = await launchBrowser()
      const page = await browser.newPage()
      await page.setViewport({ width: 1280, height: 800 })
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })

      // Auto-scroll to the bottom of the page to trigger lazy loading
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0
          const distance = 100
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight
            window.scrollBy(0, distance)
            totalHeight += distance

            if (totalHeight >= scrollHeight || totalHeight > 10000) { // Limit to 10k pixels
              clearInterval(timer)
              resolve()
            }
          }, 100)
        })
      })

      const imageBuffer = await page.screenshot({ fullPage: true })
      const imageUrl = await this.getImgUrlFromBuffer(baseUrl, imageBuffer)

      return {
        success: true,
        url: imageUrl,
      }
    } catch (error) {
      logger.error(`Error taking screenshot of ${url}: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    } finally {
      if (browser) await browser.close()
    }
  }
}
