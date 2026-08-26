import { SearchRegistry } from './SearchRegistry.js'

/**
 * SearchService - 网页搜索调度服务中心
 * 具备多级智能降级策略：
 * 1. 优先使用用户配置并启用的默认主搜索引擎 (如 Tavily 等)
 * 2. 主搜索引擎未配置、额度耗尽或发生网络异常时，自动进入免 Key 内置兜底搜索通道 (DuckDuckGo -> Bing -> 百度)
 */
export class SearchService {
  constructor() {
    this.instances = new Map() // id/name -> instance
    this.defaultInstanceId = null
    this.initialized = false
    this.fallbackEngines = ['duckduckgo', 'bing', 'baidu']
  }

  async initialize() {
    if (this.initialized) return
    await this.reloadConfigsFromDb()
    this.initialized = true
  }

  async reloadConfigsFromDb() {
    try {
      const { default: prismaManager } = await import('../../database/prisma.js')
      const prisma = await prismaManager.initialize()
      if (!prisma || !prisma.searchAdapter) return

      const records = await prisma.searchAdapter.findMany({
        where: { enabled: true }
      })

      this.instances.clear()
      this.defaultInstanceId = null

      for (const rec of records) {
        const AdapterClass = SearchRegistry.get(rec.adapterType)
        if (!AdapterClass) continue

        let configData = {}
        try {
          configData = typeof rec.configData === 'string' ? JSON.parse(rec.configData) : (rec.configData || {})
        } catch {}

        const instance = new AdapterClass(configData)
        instance.dbId = rec.id
        instance.instanceName = rec.instanceName
        instance.isDefault = rec.isDefault

        this.instances.set(String(rec.id), instance)
        this.instances.set(rec.instanceName, instance)

        if (rec.isDefault && !this.defaultInstanceId) {
          this.defaultInstanceId = rec.instanceName
        }
      }

      if (!this.defaultInstanceId && this.instances.size > 0) {
        this.defaultInstanceId = Array.from(this.instances.keys())[0]
      }
    } catch (err) {
      console.warn('[SearchService] Warning loading search adapters from DB:', err.message)
    }
  }

  /**
   * 执行多级降级免配置兜底搜索
   * @param {Object} options
   * @param {string} [failedPrimaryName]
   */
  async _cascadeFallbackSearch(options = {}, failedPrimaryName = '') {
    const errors = []

    for (const engineType of this.fallbackEngines) {
      const EngineClass = SearchRegistry.get(engineType)
      if (!EngineClass) continue

      try {
        const fallbackAdapter = new EngineClass()
        const res = await fallbackAdapter.search(options)
        const list = Array.isArray(res) ? res : (res.results || [])
        if (list.length > 0) {
          if (failedPrimaryName) {
            console.info(`[SearchService] Primary search (${failedPrimaryName}) failed, recovered using built-in fallback engine [${engineType}].`)
          }
          return res
        }
      } catch (err) {
        errors.push(`${engineType}: ${err.message}`)
      }
    }

    throw new Error(`[SearchService] 所有搜索通道（包括内置兜底引擎）均调用失败: ${errors.join('; ')}`)
  }

  /**
   * 执行搜索
   */
  async search(options = {}, adapterIdentifier = null) {
    if (!this.initialized) {
      await this.initialize()
    }

    // 1. 如果显式指定了内置兜底引擎类型
    if (adapterIdentifier && this.fallbackEngines.includes(String(adapterIdentifier).toLowerCase())) {
      const FallbackClass = SearchRegistry.get(String(adapterIdentifier).toLowerCase())
      if (FallbackClass) {
        const directFallback = new FallbackClass()
        return await directFallback.search(options)
      }
    }

    // 2. 匹配已配置的主搜索实例
    const key = adapterIdentifier || this.defaultInstanceId
    let adapter = key ? this.instances.get(String(key)) : null

    // 3. 若无任何已配置启用的主搜索实例，直接走内置兜底搜索
    if (!adapter) {
      return await this._cascadeFallbackSearch(options)
    }

    // 4. 执行主搜索实例，若异常则自动级联回退到内置兜底引擎
    try {
      return await adapter.search(options)
    } catch (err) {
      console.warn(`[SearchService] Primary search adapter (${adapter.instanceName || adapter.name}) error: ${err.message}. Cascading to built-in fallback engines...`)
      return await this._cascadeFallbackSearch(options, adapter.instanceName || adapter.name)
    }
  }
}

export const searchService = new SearchService()
