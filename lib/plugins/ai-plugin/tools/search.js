import { MioFunction } from '../../../function.js'
import { searchService } from '../../../chat/search/SearchService.js'

export default class search extends MioFunction {
  constructor() {
    super({
      adminOnly: false,
      description: 'Search the web for real-time information, news, documentation, or facts.',
      name: 'search',
      parameters: {
        properties: {
          query: {
            description: 'The search query or keywords to look up.',
            type: 'string',
          },
          count: {
            default: 5,
            description: 'Number of search results to return (default: 5, max: 10).',
            type: 'integer',
          },
          adapterId: {
            default: '',
            description: 'Optional: Specific search engine instance or fallback name ("tavily", "volcengine", "duckduckgo", "bing", "baidu"). Leave empty for auto.',
            type: 'string',
          }
        },
        required: ['query'],
        type: 'object',
      },
    })
    this.func = this.searchWeb
  }

  getDescription() {
    const instances = []
    const seen = new Set()

    if (searchService?.instances) {
      for (const [key, adapter] of searchService.instances.entries()) {
        const name = adapter.instanceName || adapter.name || key
        if (!seen.has(name)) {
          seen.add(name)
          const isDefault = name === searchService.defaultInstanceId || adapter.isDefault
          const type = adapter.constructor?.getAdapterMetadata?.()?.type || adapter.name || ''
          instances.push(`- 「${name}」(${type})${isDefault ? ' [当前主通道]' : ''}`)
        }
      }
    }

    const primaryName = searchService?.defaultInstanceId || (instances.length > 0 ? instances[0] : 'DuckDuckGo / 内置兜底')
    const customListText = instances.length > 0
      ? `\n已启用的自定义搜索实例：\n${instances.join('\n')}`
      : '\n当前未配置自定义搜索实例。'

    return `实时联网搜索工具。用于检索最新时事、事实数据、新闻、技术文档等信息。\n\n当前主搜索通道：${primaryName}。${customListText}\n系统内置免配置兜底引擎：DuckDuckGo / Bing / 百度（在主通道未配置或异常时自动级联调用）。`
  }

  async searchWeb(e) {
    const { query, count = 5, adapterId } = e.params || {}
    try {
      const result = await searchService.search(
        { query, count: Math.min(Number(count) || 5, 10) },
        adapterId || null
      )

      const rawResults = Array.isArray(result) ? result : (result.results || [])
      const formattedResults = rawResults.map(item => ({
        title: item.title || '',
        url: item.url || item.link || '',
        snippet: item.snippet || item.content || item.abstract || ''
      }))

      return {
        query,
        count: formattedResults.length,
        results: formattedResults
      }
    } catch (error) {
      return { error: `[Search Tool] 搜索失败: ${error.message}` }
    }
  }
}
