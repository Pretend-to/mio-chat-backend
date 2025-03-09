import puppeteer from 'puppeteer'
import config from '../../../config.js'
import { bufferToImageUrl } from '../../../../utils/imgTools.js'
class shareService {
  constructor() {
    this.browser = null
    this.shareData = new Map()
    this.origin = 'http://127.0.0.1'
    this.port = config.server.port
    this.init()
  }
  async init() {
    this.browser = await puppeteer.launch()
  }
  async createShare(shareId, contactor){
    this.shareData.set(parseInt(shareId),contactor)
    const previewImage = await this.createPreviewImage(shareId)
    const shareUrl = `/chat/0?shareId=${shareId}`
    logger.debug(`生成预览图片: ${shareId}`)
    return {
      previewImage,
      shareUrl
    }
  }
  async createPreviewImage(shareId){
    const userKey = this.userKey || 'none'
    const path = `/chat/0?preview=true&shareId=${shareId}&key=${userKey}`
    const page = await this.browser.newPage()
    const url = `${this.origin}:${this.port}${path}`
    logger.debug(`生成预览图片: ${url}`)

    // Set viewport before navigating
    await page.setViewport({
      width: 1024,
      height: 768,
    })

    try {
      // Navigate to the page and wait for navigation to complete
      await page.goto(url, {
        waitUntil: 'networkidle0', // Or 'networkidle2' if that works better
        timeout: 60000, // Adjust the timeout as needed (e.g., 60 seconds)
      })

      // Get the full height of the page content
      const fullPageHeight = await page.evaluate(() => document.body.scrollHeight)

      // Resize the viewport to capture the entire content
      await page.setViewport({
        width: 1024,
        height: fullPageHeight,
      })

      const imageUint8Array = await page.screenshot({ fullPage: true })
      const imageBuffer = Buffer.from(imageUint8Array)
      await page.close()
      return bufferToImageUrl('', imageBuffer)

    } catch (error) {
      console.error('Error during createPreviewImage:', error)
      await page.close() // Ensure page is closed even in case of error
      throw error // Re-throw the error to be handled upstream
    }
  }
  async getShare(shareId){
    logger.debug(`获取分享数据: ${shareId}`)
    const contactor = this.shareData.get(parseInt(shareId))
    if(!contactor){
      throw new Error('分享数据不存在')
    }
    return {
      contactor,
    }
  }
}
export default new shareService()