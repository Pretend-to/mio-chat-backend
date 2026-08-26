import BaseSearchAdapter from '../BaseSearchAdapter.js'

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
    const results = []
    
    // 解析 li.b_algo 卡片
    const algoBlocks = html.split(/<li[^>]*class="[^"]*b_algo[^"]*"[^>]*>/i).slice(1)

    for (const block of algoBlocks) {
      if (results.length >= count) break

      const titleMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
      const snippetMatch = block.match(/<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
                           block.match(/<div[^>]*class="[^"]*b_caption[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) ||
                           block.match(/<div[^>]*class="[^"]*b_snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i)

      if (titleMatch) {
        const rawUrl = titleMatch[1].trim()
        const title = titleMatch[2].replace(/<[^>]+>/g, '').trim()
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : ''

        if (title && rawUrl && !rawUrl.startsWith('javascript:')) {
          results.push({ title, url: rawUrl, snippet })
        }
      }
    }

    return {
      query,
      results
    }
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
