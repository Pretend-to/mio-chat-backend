import BaseBrowserSearchAdapter from './BaseBrowserSearchAdapter.js'

/**
 * DuckDuckGo 浏览器搜索适配器
 *
 * 与 layer1 的 `duckduckgo`（html.duckduckgo.com 裸 HTTP）区分开：
 * 裸 HTTP 版本对连续请求极其敏感（实测约 20 次后被 anomaly.js?cc=botnet 拦截），
 * 而经真实浏览器访问 duckduckgo.com 可稳定拿到结果。
 */
export default class DuckDuckGoBrowserSearchAdapter extends BaseBrowserSearchAdapter {
  static siteName = 'duckduckgo-browser'

  static ownDomains = ['duckduckgo.com']

  static selectors = {
    item: 'article[data-testid="result"], ol.react-results--main > li',
    skip: 'sponsored|ad-|advertisement',
    link: 'a[data-testid="result-title-a"]',
    title: 'a[data-testid="result-title-a"]',
    snippet: '[data-result="snippet"]'
  }

  buildUrl(query) {
    return `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`
  }
}
