import BaseBrowserSearchAdapter from './BaseBrowserSearchAdapter.js'

/**
 * Startpage 浏览器搜索适配器
 *
 * Startpage 代理的是 Google 索引，中文/英文结果质量都很好，是慢速兜底层的首选。
 * 裸 HTTP 请求会被拦（返回拦截页），必须走真实浏览器。
 */
export default class StartpageBrowserSearchAdapter extends BaseBrowserSearchAdapter {
  static siteName = 'startpage'

  static ownDomains = ['startpage.com']

  static selectors = {
    item: '.result',
    skip: 'a-bg-result|serp-result-preview|sponsored',  // 广告位
    link: 'a.result-link, a[data-testid="gl-title-link"]',
    title: '.result-title',
    snippet: '.description, p'
  }

  buildUrl(query) {
    return `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}`
  }
}
