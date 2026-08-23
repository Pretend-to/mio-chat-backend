import TavilySearchAdapter from './implementations/tavily.js'
import VolcengineSearchAdapter from './implementations/volcengine.js'
import DuckDuckGoSearchAdapter from './implementations/duckduckgo.js'
import BingSearchAdapter from './implementations/bing.js'
import BaiduSearchAdapter from './implementations/baidu.js'

/**
 * SearchRegistry - 搜索适配器与兜底引擎注册中心
 */
export class SearchRegistry {
  static adapters = new Map()
  static fallbacks = new Map()

  static register(type, adapterClass, options = {}) {
    if (options.isFallback) {
      this.fallbacks.set(type, adapterClass)
    }
    this.adapters.set(type, adapterClass)
  }

  static get(type) {
    return this.adapters.get(type) || this.fallbacks.get(type)
  }

  /**
   * 获取需要用户手动配置 API Key 的搜索厂商元数据
   */
  static getConfigurableMetadata() {
    const list = []
    for (const [type, cls] of this.adapters.entries()) {
      if (this.fallbacks.has(type)) continue // 排除零配置兜底引擎
      if (typeof cls.getAdapterMetadata === 'function') {
        list.push(cls.getAdapterMetadata())
      } else {
        list.push({ type, name: type })
      }
    }
    return list
  }

  /**
   * 获取系统内置的免配置兜底搜索引擎列表
   */
  static getFallbackMetadata() {
    const list = []
    for (const [type, cls] of this.fallbacks.entries()) {
      if (typeof cls.getAdapterMetadata === 'function') {
        list.push(cls.getAdapterMetadata())
      } else {
        list.push({ type, name: type, description: '内置免 Key 零配置搜索' })
      }
    }
    return list
  }

  static getAllMetadata() {
    return this.getConfigurableMetadata()
  }
}

// 注册需要用户配置 API Key 的搜索引擎
SearchRegistry.register('tavily', TavilySearchAdapter, { isFallback: false })
SearchRegistry.register('volcengine', VolcengineSearchAdapter, { isFallback: false })

// 注册内置免 Key 零配置兜底搜索引擎
SearchRegistry.register('duckduckgo', DuckDuckGoSearchAdapter, { isFallback: true })
SearchRegistry.register('bing', BingSearchAdapter, { isFallback: true })
SearchRegistry.register('baidu', BaiduSearchAdapter, { isFallback: true })
