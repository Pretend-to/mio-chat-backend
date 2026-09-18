import TavilySearchAdapter from './implementations/tavily.js'
import VolcengineSearchAdapter from './implementations/volcengine.js'
import DuckDuckGoSearchAdapter from './implementations/duckduckgo.js'
import BingSearchAdapter from './implementations/bing.js'
import BaiduSearchAdapter from './implementations/baidu.js'

// 浏览器兜底通道（需要 web-plugin 提供浏览器实例）
import StartpageBrowserSearchAdapter from './implementations/browser/startpage.js'
import BraveBrowserSearchAdapter from './implementations/browser/brave.js'
import DuckDuckGoBrowserSearchAdapter from './implementations/browser/duckduckgoBrowser.js'
import ShenmaBrowserSearchAdapter from './implementations/browser/shenma.js'

/**
 * SearchRegistry - 搜索适配器与兜底引擎注册中心
 *
 * 三类通道：
 *   1. adapters        需要配置 API Key 的商业搜索实例（Tavily / 火山引擎）
 *   2. fallbacks       免 Key 的裸 HTTP 兜底引擎（DuckDuckGo / Bing / 百度）—— 快
 *   3. browserFallbacks 免 Key 的浏览器兜底引擎（Startpage / Brave / DDG / 神马）—— 慢，但能过反爬
 */
export const SearchRegistry = {
  adapters: new Map(),
  fallbacks: new Map(),
  browserFallbacks: new Map(),

  register(type, adapterClass, options = {}) {
    if (options.isFallback) {
      this.fallbacks.set(type, adapterClass)
    }
    if (options.isBrowser) {
      this.browserFallbacks.set(type, adapterClass)
    }
    this.adapters.set(type, adapterClass)
  },

  get(type) {
    return this.adapters.get(type) || this.fallbacks.get(type) || this.browserFallbacks.get(type)
  },

  /** 浏览器兜底通道的类型列表（按预期质量排序） */
  getBrowserFallbackTypes() {
    return Array.from(this.browserFallbacks.keys())
  },

  /**
   * 获取需要用户手动配置 API Key 的搜索厂商元数据
   */
  getConfigurableMetadata() {
    const list = []
    for (const [type, cls] of this.adapters.entries()) {
      if (this.fallbacks.has(type)) continue // 排除零配置兜底引擎
      if (this.browserFallbacks.has(type)) continue // 排除浏览器兜底通道
      if (typeof cls.getAdapterMetadata === 'function') {
        list.push(cls.getAdapterMetadata())
      } else {
        list.push({ type, name: type })
      }
    }
    return list
  },

  /**
   * 获取系统内置的免配置兜底搜索引擎列表（不含浏览器通道——它们不参与“配置”面板）
   */
  getFallbackMetadata() {
    const list = []
    for (const [type, cls] of this.fallbacks.entries()) {
      if (this.browserFallbacks.has(type)) continue
      if (typeof cls.getAdapterMetadata === 'function') {
        list.push(cls.getAdapterMetadata())
      } else {
        list.push({ type, name: type, description: '内置免 Key 零配置搜索' })
      }
    }
    return list
  },

  /** 获取浏览器兜底通道的元数据 */
  getBrowserFallbackMetadata() {
    const list = []
    for (const [type, cls] of this.browserFallbacks.entries()) {
      if (typeof cls.getAdapterMetadata === 'function') {
        list.push(cls.getAdapterMetadata())
      } else {
        list.push({ type, name: type, description: '基于真实浏览器的免 Key 搜索通道' })
      }
    }
    return list
  },

  getAllMetadata() {
    return this.getConfigurableMetadata()
  },
}

// 注册需要用户配置 API Key 的搜索引擎
SearchRegistry.register('tavily', TavilySearchAdapter, { isFallback: false })
SearchRegistry.register('volcengine', VolcengineSearchAdapter, { isFallback: false })

// 注册内置免 Key 零配置兜底搜索引擎（第一层：裸 HTTP，快）
SearchRegistry.register('duckduckgo', DuckDuckGoSearchAdapter, { isFallback: true })
SearchRegistry.register('bing', BingSearchAdapter, { isFallback: true })
SearchRegistry.register('baidu', BaiduSearchAdapter, { isFallback: true })

// 注册浏览器兜底搜索引擎（第二层：真实浏览器，慢但能过反爬）
// 顺序即优先级：Startpage（Google 索引，质量最好） -> Brave -> DDG -> 神马
SearchRegistry.register('startpage', StartpageBrowserSearchAdapter, { isFallback: true, isBrowser: true })
SearchRegistry.register('brave', BraveBrowserSearchAdapter, { isFallback: true, isBrowser: true })
SearchRegistry.register('duckduckgo-browser', DuckDuckGoBrowserSearchAdapter, { isFallback: true, isBrowser: true })
SearchRegistry.register('shenma', ShenmaBrowserSearchAdapter, { isFallback: true, isBrowser: true })
