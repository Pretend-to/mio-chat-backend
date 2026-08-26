import { MioFunction } from '../../../function.js'
import { launchBrowser } from '../lib/browser.js'

export default class WebScreenshot extends MioFunction {
  constructor() {
    super({
      description:
        'Takes a full-page screenshot of a specified URL. The screenshot is rendered directly in the chat timeline, so you DO NOT need to output the markdown image link `![alt](url)` in your textual response.',
      name: 'crawl',
      parameters: {
        properties: {
          url: {
            description: 'The URL to capture a screenshot from.',
            type: 'string',
          },
        },
        required: ['url'],
        type: 'object',
      },
    })
    this.func = this.takeScreenshot
  }
  getDisplayName(params) {
    const { url } = params
    if (!url) {return 'Capturing webpage screenshot'}
    const shortUrl = url.length > 50 ? `${url.substring(0, 47)  }...` : url
    return `Capturing screenshot: ${shortUrl}`
  }

  async takeScreenshot(e) {
    const { url } = e.params
    const baseUrl = e.user.origin
    const pluginConfig = this.getPluginConfig() || {}
    const chromePath = pluginConfig.chromePath || pluginConfig.parse?.puppeteer?.chromePath
    let browser
    try {
      browser = await launchBrowser(chromePath, { parentPlugin: this.parentPlugin, preferFullBrowser: true })
      const page = await browser.newPage()
      await page.setViewport({ height: 800, width: 1280 })
      await page.goto(url, { timeout: 60000, waitUntil: 'networkidle0' })

      // Auto-scroll to the bottom of the page to trigger lazy loading
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0
          const distance = 100
          const timer = setInterval(() => {
            const {scrollHeight} = document.body
            window.scrollBy(0, distance)
            totalHeight += distance

            if (totalHeight >= scrollHeight || totalHeight > 10_000) { // Limit to 10k pixels
              clearInterval(timer)
              resolve()
            }
          }, 100)
        })
      })

      const imageBuffer = await page.screenshot({ fullPage: true })
      const imageUrl = await this.getImgUrlFromBuffer(baseUrl, imageBuffer)

      return {
        extraRender: [
          {
            type: 'image',
            url: imageUrl,
            placement: 'outer'
          }
        ],
        result: {
          success: true,
          url: imageUrl,
        }
      }
    } catch (error) {
      logger.error(`Error taking screenshot of ${url}: ${error.message}`)
      return {
        error: error.message,
        success: false,
      }
    } finally {
      if (browser) {await browser.close()}
    }
  }
}
