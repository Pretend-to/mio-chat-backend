import { MioFunction, Param } from '../../../lib/functions.js'
import puppeteer from 'puppeteer'

export class parseWebPage extends MioFunction {
  constructor() {
    super({
      name: 'parseWebPage',
      description: 'A tool to scrape all text content from a specified website while preserving images and hyperlinks.',
      params: [
        new Param({
          name: 'url',
          type: 'string',
          description: 'The URL of the website to scrape text content from.',
          required: true,
        }),
      ],
    })
    this.func = this.pageParse
  }

  async pageParse(e) {
    const { url } = e.params
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
        
    try {
      await page.goto(url, { waitUntil: 'networkidle2' })
      const result = await page.evaluate(() => {
        const texts = []
        const images = []
        const hyperLinks = []

        // 模拟用户选择所有文本
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(document.body)
        selection.removeAllRanges()
        selection.addRange(range)

        // 获取选中的文本
        const selectedText = selection.toString().trim()
        if (selectedText) {
          texts.push(selectedText)
        }

        // 收集图像
        const imgElements = document.querySelectorAll('img')
        imgElements.forEach(img => {
          images.push({ title: img.alt || '', url: img.src })
        })

        // 收集超链接
        const linkElements = document.querySelectorAll('a')
        linkElements.forEach(link => {
          const title = link.innerText.trim() || link.title || link.href // 优先选择其他来源
          hyperLinks.push({ title: title, url: link.href })
        })

        return {
          pureText: texts.join('\n'),
          images: images,
          hyperLinks: hyperLinks
        }
      })

      return {
        success: true,
        pureText: result.pureText,
        images: result.images,
        hyperLinks: result.hyperLinks,
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