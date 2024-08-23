import { MioFunction, Param } from '../../../lib/functions.js'
import puppeteer from 'puppeteer'

export class parseWebPage extends MioFunction {
  constructor() {
    super({
      name: 'parseWebPage',
      description: 'A tool to scrape all text content from a specified website while preserving links.',
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
      const { textContent, links } = await page.evaluate(() => {
        // 获取所有的文本内容，同时保留 <a> 标签并记录超链接信息
        const elements = Array.from(document.body.querySelectorAll('*'))
        const links = []
        
        const textContent = elements.map(el => {
          if (el.tagName === 'A' && el.href) {
            const linkInfo = {
              text: el.innerText?.trim(),
              href: el.href
            }
            links.push(linkInfo)
            return `[${linkInfo.text}](${linkInfo.href})`
          } else {
            return el.innerText?.trim()
          }
        }).join('\n').trim()
        
        return { textContent, links }
      })
      return {
        success: true,
        text: textContent,
        links: links // 返回超链接数组
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
