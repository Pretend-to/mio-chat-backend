import BaseSearchAdapter from '../BaseSearchAdapter.js'

/**
 * DuckDuckGoSearchAdapter - 免 Key 零配置 HTML 网页搜索适配器
 */
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
    const results = []
    const blocks = html.split(/<div[^>]*class="[^"]*result[^"]*"[^>]*>/i).slice(1)

    for (const block of blocks) {
      if (results.length >= count) break

      const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/i)
      const urlMatch = block.match(/<a[^>]*class="result__url"[^>]*href="([^"]*)"/i)
      const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i) || block.match(/<td[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/td>/i)

      if (titleMatch && urlMatch) {
        const title = titleMatch[1].replace(/<[^>]+>/g, '').trim()
        let rawUrl = urlMatch[1].trim()

        if (rawUrl.includes('uddg=')) {
          try {
            const parsed = new URL('https://duckduckgo.com' + rawUrl)
            rawUrl = decodeURIComponent(parsed.searchParams.get('uddg') || rawUrl)
          } catch {}
        } else if (rawUrl.startsWith('//')) {
          rawUrl = 'https:' + rawUrl
        }

        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : ''

        if (title && rawUrl) {
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
      type: 'duckduckgo',
      name: 'DuckDuckGo',
      description: '免注册、免 API Key 的轻量化 HTML 搜索引擎',
      configSchema: {}
    }
  }
}
