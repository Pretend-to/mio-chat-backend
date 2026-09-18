import { MioFunction } from '../../../function.js'
import { searchService } from '../../../chat/search/SearchService.js'
import { SearchRegistry } from '../../../chat/search/SearchRegistry.js'
import { estimateRelevance } from '../../../chat/search/relevance.js'

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
            description: 'Optional: Specific search engine instance or fallback name ("tavily", "volcengine", "duckduckgo", "bing", "baidu"). Leave empty for auto. Note: only engines listed in the tool description are currently available; specifying an unavailable one falls back to auto and is reported in the result.',
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

    const builtinEngines = searchService?.fallbackEngines || ['duckduckgo', 'bing', 'baidu']
    const browserEngines = SearchRegistry.getBrowserFallbackTypes?.() || []
    const selectableText = `\n当前可用的 adapterId：${[...builtinEngines, ...browserEngines, ...instances.map(i => i.replace(/^- 「(.+?)」.*$/, '$1'))].join(' / ')}（不传则自动选择）。`

    const layerText = browserEngines.length > 0
      ? `\n\n【两层降级策略】\n第一层（快，1～3s）：裸 HTTP 免 Key 引擎 ${builtinEngines.join(' / ')}。\n第二层（慢，5～15s）：真实浏览器引擎 ${browserEngines.join(' / ')}——用于突破 TLS 指纹/JS 挑战类反爬，仅在第一层全部失败或结果相关性不达标时自动启用。\n指定 adapterId 时只会用你指定的那个通道，不会自动跨层降级。`
      : ''

    return `实时联网搜索工具。用于检索最新时事、事实数据、新闻、技术文档等信息。\n\n当前主搜索通道：${primaryName}。${customListText}\n系统内置免配置兜底引擎：DuckDuckGo / Bing / 百度（在主通道未配置或异常时自动级联调用）。\n\n【关于结果可信度】返回值中的 engine 字段表示实际作答的引擎，degraded=true 表示走了兜底降级；若出现 lowRelevance=true，说明结果与你的查询词相关性偏低（搜索引擎对长中文/生僻查询可能返回降级结果），此时不要直接采信，应改用更短或更常见的关键词重新搜索。${selectableText}${layerText}`
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

      const relevance = estimateRelevance(query, formattedResults)
      const actualEngine = result?.engine || 'unknown'

      const payload = {
        query,
        count: formattedResults.length,
        engine: actualEngine,
        engineType: result?.engineType || actualEngine,
        layer: result?.layer || 1,
        degraded: !!result?.degraded,
        results: formattedResults
      }

      const notes = []
      if (result?.requestedEngineUnavailable) {
        notes.push(`你指定的引擎「${result.requestedEngine}」当前不可用（未配置或未启用），已自动回退到「${actualEngine}」。`)
      }
      if (result?.failedPrimary) {
        notes.push(`主引擎「${result.failedPrimary}」调用失败或返回空，已降级到「${actualEngine}」。`)
      }
      if (payload.degraded) {
        notes.push(`本次结果由内置兜底引擎「${actualEngine}」提供，可靠性低于已配置的主搜索通道，请审慎采信。`)
      }
      if (payload.layer === 2) {
        notes.push('本次走了浏览器慢速层（耗时较长），该层主要用于突破反爬，结果本身可靠。')
      }
      if (notes.length > 0) payload.note = notes.join(' ')

      if (relevance.lowRelevance) {
        payload.lowRelevance = true
        payload.relevanceWarning = `结果与查询词的相关性偏低（查询词覆盖率 ${relevance.hitRatio}，未命中：${relevance.missed.slice(0, 8).join('、') || '无'}）。搜索引擎对长中文/生僻查询可能返回降级或无关结果，请勿直接采信，建议改用更短或更常见的关键词重试。`
      }

      return payload
    } catch (error) {
      return { error: `[Search Tool] 搜索失败: ${error.message}` }
    }
  }
}
