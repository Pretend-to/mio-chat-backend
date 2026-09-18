import BaseSearchAdapter from '../BaseSearchAdapter.js'
import { decodeHtmlEntities } from '../htmlEntities.js'

/**
 * BingSearchAdapter - 免 Key 零配置 Bing / CN Bing 搜索适配器
 */
export default class BingSearchAdapter extends BaseSearchAdapter {
  constructor(config = {}) {
    super(config)
    this.name = 'bing'
  }

  async search(options = {}) {
    const { query, count = 5 } = options
    const isCn = this.config.region === 'cn'
    const searchUrl = isCn
      ? `https://cn.bing.com/search?q=${encodeURIComponent(query)}`
      : `https://www.bing.com/search?q=${encodeURIComponent(query)}`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(8000)
    })

    if (!response.ok) {
      throw new Error(`[BingSearchAdapter] Request Failed (${response.status})`)
    }

    const html = await response.text()

    // 解析 li.b_algo 卡片
    const algoBlocks = html.split(/<li[^>]*class="[^"]*b_algo[^"]*"[^>]*>/i).slice(1)
    const results = BingSearchAdapter.parseResults(html, count)

    // 防御：有 b_algo 容器却解析不出结果，说明 Bing 改版了
    if (results.length === 0 && algoBlocks.length > 0) {
      throw new Error(`[BingSearchAdapter] 页面结构解析失败：检测到 ${algoBlocks.length} 个 b_algo 容器，但未能解析出任何结果（DOM 结构可能已变更）`)
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
    const algoBlocks = html.split(/<li[^>]*class="[^"]*b_algo[^"]*"[^>]*>/i).slice(1)
    const results = []

    for (const block of algoBlocks) {
      if (results.length >= count) break

      const titleMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
      const snippetMatch = block.match(/<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
        block.match(/<div[^>]*class="[^"]*b_caption[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) ||
        block.match(/<div[^>]*class="[^"]*b_snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i)

      if (titleMatch) {
        const rawUrl = decodeHtmlEntities(titleMatch[1])
        const title = decodeHtmlEntities(titleMatch[2])
        const snippet = snippetMatch ? decodeHtmlEntities(snippetMatch[1]) : ''

        if (title && rawUrl && !rawUrl.startsWith('javascript:')) {
          results.push({ title, url: rawUrl, snippet })
        }
      }
    }

    return results
  }

  static getAdapterMetadata() {
    return {
      type: 'bing',
      name: 'Bing',
      description: '微软 Bing 搜索引擎 (支持国际版 / 国内版切换)',
      configSchema: {
        region: { type: 'string', label: '节点地区', default: 'global', options: ['global', 'cn'] }
      }
    }
  }
}
