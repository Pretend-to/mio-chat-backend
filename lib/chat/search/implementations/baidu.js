import BaseSearchAdapter from '../BaseSearchAdapter.js'
import { decodeHtmlEntities } from '../htmlEntities.js'

/**
 * BaiduSearchAdapter - 百度免 Key 搜索适配器
 */

// 结果容器：百度为 `class="result c-container ..."`
const BAIDU_BLOCK_RE = /<div[^>]*class="[^"]*result\s+c-container[^"]*"[^>]*>/gi
export default class BaiduSearchAdapter extends BaseSearchAdapter {
  constructor(config = {}) {
    super(config)
    this.name = 'baidu'
  }

  async search(options = {}) {
    const { query, count = 5 } = options
    const searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      signal: AbortSignal.timeout(8000)
    })

    if (!response.ok) {
      throw new Error(`[BaiduSearchAdapter] Request Failed (${response.status})`)
    }

    const html = await response.text()

    // 解析 c-container 结果块
    const blocks = html.split(BAIDU_BLOCK_RE).slice(1)
    const results = BaiduSearchAdapter.parseResults(html, count)

    // 防御：百度在触发安全验证 / 改版时同样会返回 200 但结构完全不同
    if (results.length === 0) {
      if (/wappass\.baidu\.com|百度安全验证|安全验证/i.test(html)) {
        throw new Error('[BaiduSearchAdapter] 触发百度安全验证（验证码拦截），请稍后重试或改用其他引擎')
      }
      if (blocks.length > 0) {
        throw new Error(`[BaiduSearchAdapter] 页面结构解析失败：检测到 ${blocks.length} 个 c-container 容器，但未能解析出任何结果（DOM 结构可能已变更）`)
      }
    }

    return {
      query,
      results
    }
  }

  /**
   * 纯函数式解析，便于脱离网络做单元测试与回归
   * @param {string} html
   * @param {number} count
   * @returns {Array<{title: string, url: string, snippet: string}>}
   */
  static parseResults(html = '', count = 5) {
    const blocks = html.split(BAIDU_BLOCK_RE).slice(1)
    const results = []

    for (const block of blocks) {
      if (results.length >= count) break

      const titleMatch = block.match(/<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
      const snippetMatch = block.match(/<span[^>]*class="[^"]*content-right_[\w]*[^"]*"[^>]*>([\s\S]*?)<\/span>/i) ||
        block.match(/<div[^>]*class="[^"]*c-abstract[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
        block.match(/<div[^>]*class="[^"]*c-span18[^"]*"[^>]*>([\s\S]*?)<\/div>/i)

      if (titleMatch) {
        const rawUrl = decodeHtmlEntities(titleMatch[1])
        const title = decodeHtmlEntities(titleMatch[2])
        const snippet = snippetMatch ? decodeHtmlEntities(snippetMatch[1]) : ''

        if (title && rawUrl) {
          results.push({ title, url: rawUrl, snippet })
        }
      }
    }

    return results
  }

  static getAdapterMetadata() {
    return {
      type: 'baidu',
      name: '百度搜索',
      description: '百度搜索中文网页检索通道',
      configSchema: {}
    }
  }
}
