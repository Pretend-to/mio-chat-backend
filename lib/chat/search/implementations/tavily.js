import BaseSearchAdapter from '../BaseSearchAdapter.js'

/**
 * TavilySearchAdapter - Tavily AI 搜索引擎适配器
 * 遵循官方 Tavily Search API v1 规范:
 * POST https://api.tavily.com/search
 */
export default class TavilySearchAdapter extends BaseSearchAdapter {
  constructor(config = {}) {
    super(config)
    this.name = 'tavily'
  }

  /**
   * 执行搜索
   * @param {Object} options
   * @param {string} options.query - 搜索关键词
   * @param {number} [options.count=5] - 返回结果数量 (1-20)
   * @param {string} [options.searchDepth] - 深度: 'basic' | 'advanced'
   * @param {string} [options.topic] - 类别: 'general' | 'news' | 'finance'
   * @param {boolean} [options.includeAnswer] - 是否包含 AI 生成的问答摘要
   * @param {boolean} [options.includeImages] - 是否包含相关图片
   * @param {boolean} [options.includeRawContent] - 是否包含原始网页正文
   * @param {Array<string>} [options.includeDomains] - 白名单域名过滤
   * @param {Array<string>} [options.excludeDomains] - 黑名单域名过滤
   * @param {string} [options.timeRange] - 时间范围: 'day' | 'week' | 'month' | 'year'
   */
  async search(options = {}) {
    const {
      query,
      count = 5,
      searchDepth = this.config.searchDepth || 'basic',
      topic = this.config.topic || 'general',
      includeAnswer = this.config.includeAnswer || false,
      includeImages = this.config.includeImages || false,
      includeRawContent = this.config.includeRawContent || false,
      includeDomains,
      excludeDomains,
      timeRange
    } = options

    const apiKey = this.config.apiKey || process.env.TAVILY_API_KEY
    if (!apiKey) {
      throw new Error('[TavilySearchAdapter] Missing Tavily API Key in configuration')
    }

    const baseUrl = (this.config.baseUrl || 'https://api.tavily.com').replace(/\/$/, '')

    const payload = {
      api_key: apiKey,
      query,
      max_results: Math.min(Math.max(1, count), 20),
      search_depth: searchDepth,
      topic,
      include_answer: includeAnswer,
      include_images: includeImages,
      include_raw_content: includeRawContent
    }

    if (Array.isArray(includeDomains) && includeDomains.length > 0) {
      payload.include_domains = includeDomains
    }
    if (Array.isArray(excludeDomains) && excludeDomains.length > 0) {
      payload.exclude_domains = excludeDomains
    }
    if (timeRange) {
      payload.time_range = timeRange
    }

    const response = await fetch(`${baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`[TavilySearchAdapter] API Error (${response.status}): ${errText}`)
    }

    const data = await response.json()
    const results = (data.results || []).map(item => ({
      title: item.title || '',
      url: item.url || '',
      snippet: item.content || item.snippet || '',
      score: item.score,
      rawContent: item.raw_content || null,
      publishedDate: item.published_date || null
    }))

    return {
      query: data.query || query,
      results,
      answer: data.answer || null,
      images: data.images || [],
      responseTime: data.response_time
    }
  }

  static getAdapterMetadata() {
    return {
      type: 'tavily',
      name: 'Tavily',
      description: '专为 LLM Agent 优化的智能检索与问答增强搜索引擎 API',
      configSchema: {
        apiKey: { type: 'string', label: 'Tavily API Key', required: true, secret: true },
        baseUrl: { type: 'string', label: 'Base URL', default: 'https://api.tavily.com' },
        searchDepth: { type: 'string', label: '搜索深度', default: 'basic', options: ['basic', 'advanced'] },
        topic: { type: 'string', label: '分类主题', default: 'general', options: ['general', 'news', 'finance'] },
        includeAnswer: { type: 'boolean', label: '包含 AI 问答摘要', default: false }
      }
    }
  }
}
