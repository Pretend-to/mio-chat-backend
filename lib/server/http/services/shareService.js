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
    this.page = await this.browser.newPage()
  }

  async createShare(shareId, contactor){
    this.shareData.set(shareId,contactor)
    const previewImage = await this.createPreviewImage(shareId)
    const shareUrl = `/share/${shareId}`
    return {
      previewImage,
      shareUrl
    }
  }

  async createPreviewImage(shareId){
    const path = `/preview/${shareId}`
    const page = await this.browser.newPage()
    await page.goto(`${this.origin}:${this.port}${path}`)
    const imageUint8Array = await page.screenshot({ fullPage: true })
    const imageBuffer = Buffer.from(imageUint8Array)
    await page.close()
    return bufferToImageUrl('',imageBuffer)
  }

  async getShare(shareId){
    const contactor = this.shareData.get(shareId)
    if(!contactor){
      throw new Error('分享数据不存在')
    }
    return {
      contactor, 
    }
  }
}

export default new shareService()