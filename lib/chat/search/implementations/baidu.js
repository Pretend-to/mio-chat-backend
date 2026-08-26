import BaseSearchAdapter from '../BaseSearchAdapter.js'

/**
 * BaiduSearchAdapter - 百度免 Key 搜索适配器
 */
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
    const results = []
    
    // 解析 c-container 结果块
    const blocks = html.split(/<div[^>]*class="[^"]*result\s+c-container[^"]*"[^>]*>/i).slice(1)

    for (const block of blocks) {
      if (results.length >= count) break

      const titleMatch = block.match(/<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
      const snippetMatch = block.match(/<span[^>]*class="[^"]*content-right_[\w]*[^"]*"[^>]*>([\s\S]*?)<\/span>/i) ||
                           block.match(/<div[^>]*class="[^"]*c-abstract[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                           block.match(/<div[^>]*class="[^"]*c-span18[^"]*"[^>]*>([\s\S]*?)<\/div>/i)

      if (titleMatch) {
        const rawUrl = titleMatch[1].trim()
        const title = titleMatch[2].replace(/<[^>]+>/g, '').trim()
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
      type: 'baidu',
      name: '百度搜索',
      description: '百度搜索中文网页检索通道',
      configSchema: {}
    }
  }
}
