import BaseSearchAdapter from '../BaseSearchAdapter.js'

/**
 * VolcengineSearchAdapter - 火山引擎 Torchlight 开放搜索 API 适配器
 * 支持:
 * - 端点: POST https://open.feedcoopapi.com/search_api/web_search
 * - 认证: Authorization: Bearer {apiKey}
 */
export default class VolcengineSearchAdapter extends BaseSearchAdapter {
  constructor(config = {}) {
    super(config)
    this.name = 'volcengine'
  }

  /**
   * 执行网页搜索
   * @param {Object} options
   * @param {string} options.query - 搜索关键词
   * @param {number} [options.count=5] - 返回条数
   */
  async search(options = {}) {
    const { query, count = 5 } = options
    const apiKey = this.config.apiKey || process.env.VOLCENGINE_SEARCH_API_KEY
    if (!apiKey) {
      throw new Error('[VolcengineSearchAdapter] 缺少火山引擎搜索 API Key (apiKey)')
    }

    const baseUrl = (this.config.baseUrl || 'https://open.feedcoopapi.com').replace(/\/$/, '')
    const searchType = this.config.searchType || 'web'
    const targetUrl = `${baseUrl}/search_api/web_search`

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Query: query,
        SearchType: searchType,
        Count: Math.min(Math.max(1, count), 20)
      }),
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`[VolcengineSearchAdapter] 火山引擎搜索请求失败 (${response.status}): ${errText}`)
    }

    const data = await response.json()
    if (data.ResponseMetadata?.Error) {
      throw new Error(`[VolcengineSearchAdapter] API Error: ${data.ResponseMetadata.Error.Message || JSON.stringify(data.ResponseMetadata.Error)}`)
    }

    const webResults = data.Result?.WebResults || data.Result?.Items || []
    return webResults.map(item => ({
      title: (item.Title || item.title || '').replace(/<[^>]+>/g, '').trim(),
      url: item.Url || item.url || item.Link || '',
      snippet: (item.Snippet || item.snippet || item.Summary || item.summary || '').replace(/<[^>]+>/g, '').trim(),
      siteName: item.SiteName || item.siteName || '',
      publishTime: item.PublishTime || item.publishTime || ''
    })).filter(r => r.title && r.url)
  }

  static getAdapterMetadata() {
    return {
      type: 'volcengine',
      name: '火山引擎',
      description: '火山引擎 Torchlight 开放搜索与中文网页检索 API',
      configSchema: {
        apiKey: {
          type: 'string',
          label: 'API Key',
          required: true,
          secret: true,
          placeholder: '请输入火山引擎搜索 API Key'
        },
        baseUrl: {
          type: 'string',
          label: 'Base URL',
          default: 'https://open.feedcoopapi.com',
          placeholder: '默认: https://open.feedcoopapi.com'
        },
        searchType: {
          type: 'string',
          label: '搜索类型',
          default: 'web',
          options: ['web', 'news', 'academic']
        }
      }
    }
  }
}
