import BaseBrowserSearchAdapter from './BaseBrowserSearchAdapter.js'

/**
 * 神马搜索（m.sm.cn）浏览器搜索适配器
 *
 * 阿里系移动端搜索，中文召回质量不错（实测直接给出百科模态卡）。
 * 页面 class 是构建期哈希（如 `qk-title-text`、`itemListItem-item-aDmVQ`），
 * 因此不配站点选择器，直接走通用锚点启发式 + 自身域名过滤。
 */
export default class ShenmaBrowserSearchAdapter extends BaseBrowserSearchAdapter {
  static siteName = 'shenma'

  static ownDomains = ['sm.cn', 'uc.cn']

  // 哈希 class 不可依赖，交给通用启发式
  static selectors = {}

  buildUrl(query) {
    return `https://m.sm.cn/s?q=${encodeURIComponent(query)}`
  }
}
