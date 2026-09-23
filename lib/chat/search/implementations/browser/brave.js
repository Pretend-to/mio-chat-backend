import BaseBrowserSearchAdapter from './BaseBrowserSearchAdapter.js'

/**
 * Brave Search 浏览器搜索适配器
 *
 * Brave 使用自建独立索引（不依赖 Google/Bing），裸 HTTP 请求会 429，需走浏览器。
 */
export default class BraveBrowserSearchAdapter extends BaseBrowserSearchAdapter {
  static siteName = 'brave'

  static ownDomains = ['brave.com']

  static selectors = {
    item: '.result-wrapper, .result-body',
    skip: 'advertisement|sponsored|ad-',
    link: 'a.l1, .result-content a[href^="http"]',
    title: '.search-snippet-title, .title',
    snippet: '.snippet-description, .snippet'
  }

  buildUrl(query) {
    return `https://search.brave.com/search?q=${encodeURIComponent(query)}`
  }
}
