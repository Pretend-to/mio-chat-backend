import { MioFunction, Param } from '../../../lib/functions.js'
import puppeteer from 'puppeteer'

export class searchBili extends MioFunction {
  constructor() {
    super({
      name: 'searchBili',
      description: 'A tool to search for videos on Bilibili based on a keyword..',
      params: [
        new Param({
          name: 'keyword',
          type: 'string',
          description: 'The keyword to search for on Bilibili.',
          required: true,
        }),
      ],
    })
    this.func = this.searchVideos
  }

  async searchVideos(e) {
    const { keyword } = e.params
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    try {
      // Navigate to the Bilibili search page with the keyword
      await page.goto(`https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`, { waitUntil: 'networkidle2' })
      // Wait for search results to load
      await page.waitForSelector('.bili-video-card', { timeout: 10000 })
      // Extract video data
      const videos = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.bili-video-card'))
        return items.map(item => ({
          title: item.querySelector('.bili-video-card__info--tit')?.innerText || '',
          url: item.querySelector('a')?.href || '',
          description: item.querySelector('.bili-video-card__info--bottom')?.innerText || '',
          author: item.querySelector('.bili-video-card__info--author')?.innerText || '',
          playCount: item.querySelector('.bili-video-card__stats--item')?.innerText || '',
          duration: item.querySelector('.bili-video-card__stats__duration')?.innerText || '',
          thumbnail: item.querySelector('.bili-video-card__cover')?.src || '',
          coverImage: `${item.querySelector('a img')?.src}` || '', // 获取封面图的URL
        }))
      })
      console.log(videos)
      return {
        success: true,
        videos: videos,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
        },
      }
    } finally {
      await browser.close()
    }
  }
}