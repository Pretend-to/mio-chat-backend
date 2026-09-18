import BaseSearchAdapter from '../BaseSearchAdapter.js'
import { decodeHtmlEntities } from '../htmlEntities.js'

/**
 * DuckDuckGoSearchAdapter - 免 Key 零配置 HTML 网页搜索适配器
 */

// 结果容器切分正则：
// DDG 每个有机结果的最外层 class 形如 "result results_links results_links_deep web-result "
// 注意：早期实现用的是 /<div[^>]*class="[^"]*result[^"]*"[^>]*>/，
// 它会同时命中 serp__results / result__body / result__extras / result__extras__url，
// 导致单个结果被切碎、标题锚点与链接锚点落入不同碎片，最终 0 条结果。
const STRICT_BLOCK_RE = /<div[^>]*class="[^"]*\bweb-result\b[^"]*"[^>]*>/gi
const LOOSE_BLOCK_RE = /<div[^>]*class="[^"]*\bresult\b[^"]*\bresults_links\b[^"]*"[^>]*>/gi

export default class DuckDuckGoSearchAdapter extends BaseSearchAdapter {
  constructor(config = {}) {
    super(config)
    this.name = 'duckduckgo'
  }

  async search(options = {}) {
    const { query, count = 5 } = options

    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(8000)
    })

    if (!response.ok) {
      throw new Error(`[DuckDuckGoSearchAdapter] Request Failed (${response.status})`)
    }

    const html = await response.text()
    const results = DuckDuckGoSearchAdapter.parseResults(html, count)

    // 防御：页面里明明有结果锚点却解析出 0 条，说明 DDG 改了 DOM 结构。
    // 此时必须显式抛错，让上层知道「是解析失败」而不是「真的没结果」。
    if (results.length === 0) {
      const anchorCount = (html.match(/class="result__a"/g) || []).length
      if (anchorCount > 0) {
        throw new Error(`[DuckDuckGoSearchAdapter] 页面结构解析失败：检测到 ${anchorCount} 个结果锚点，但未能解析出任何结果（DOM 结构可能已变更）`)
      }
      if (/anomaly\.js|captcha|unusual traffic|cc=botnet/i.test(html)) {
        throw new Error('[DuckDuckGoSearchAdapter] 请求被反爬拦截（DDG 的 HTML 通道对连续请求较敏感，建议稍后重试或改用其他引擎）')
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
    let blocks = html.split(STRICT_BLOCK_RE).slice(1)
    if (blocks.length === 0) {
      blocks = html.split(LOOSE_BLOCK_RE).slice(1)
    }

    const results = []

    for (const block of blocks) {
      if (results.length >= count) break

      const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/i)
      const urlMatch = block.match(/<a[^>]*class="result__url"[^>]*href="([^"]*)"/i)
      const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i) ||
        block.match(/<td[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/td>/i)

      if (titleMatch && urlMatch) {
        const title = decodeHtmlEntities(titleMatch[1])
        let rawUrl = decodeHtmlEntities(urlMatch[1])

        if (rawUrl.includes('uddg=')) {
          try {
            const parsed = new URL('https://duckduckgo.com' + rawUrl)
            rawUrl = decodeURIComponent(parsed.searchParams.get('uddg') || rawUrl)
          } catch {}
        } else if (rawUrl.startsWith('//')) {
          rawUrl = 'https:' + rawUrl
        }

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
      type: 'duckduckgo',
      name: 'DuckDuckGo',
      description: '免注册、免 API Key 的轻量化 HTML 搜索引擎',
      configSchema: {}
    }
  }
}
