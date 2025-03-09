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
    // const previewImage = await this.createPreviewImage(shareId)
    const previewImage ='等等！'
    const shareUrl = `/chat/0?shareId=${shareId}`
    logger.debug(`生成预览图片: ${shareId}`)
    return {
      previewImage,
      shareUrl
    }
  }

  async _autoScroll(page) {
    return page.evaluate(() => {
      return new Promise((resolve) => {
        //滚动的总高度
        var totalHeight = 0
        //每次向下滚动的高度 100 px
        var distance = 100
        var timer = setInterval(() => {
          //页面的高度 包含滚动高度
          var scrollHeight = document.body.scrollHeight
          //滚动条向下滚动 distance
          window.scrollBy(0, distance)
          totalHeight += distance
          //当滚动的总高度 大于 页面高度 说明滚到底了。也就是说到滚动条滚到底时，以上还会继续累加，直到超过页面高度
          if (totalHeight >= scrollHeight) {
            clearInterval(timer)
            resolve()
          }
        }, 100)
      })
    })
  }
  async createPreviewImage(shareId) {
    const userKey = this.userKey || 'none'
    const path = `/chat/0?preview=true&shareId=${shareId}&key=${userKey}`
    const page = await this.browser.newPage()
    const url = `${this.origin}:${this.port}${path}`
    logger.debug(`生成预览图片: ${url}`)

    // Set initial viewport width. Height doesn't matter at first since we'll resize it.
    await page.setViewport({
      width: 1024,
      height: 1, //设置一个非常小的高度
    })

    try {
      // Navigate to the page and wait for navigation to complete
      await page.goto(url, {
        waitUntil: 'networkidle0', // Or 'networkidle2' if that works better
        timeout: 60000, // Adjust the timeout as needed (e.g., 60 seconds)
      })

      await this._autoScroll(page)

      // 截图
      const imageUint8Array = await page.screenshot({ fullPage: true }) // Remove fullPage option for this scenario
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