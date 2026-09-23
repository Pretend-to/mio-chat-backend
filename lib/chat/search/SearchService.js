import { SearchRegistry } from './SearchRegistry.js'
import { estimateRelevance } from './relevance.js'
import { hasBrowserProvider } from './browserBridge.js'

/**
 *
 * 具备多级智能降级策略：
 * 1. 优先使用用户配置并启用的默认主搜索引擎 (如 Tavily 等)
 * 2. 主搜索引擎未配置、额度耗尽或发生网络异常时，自动进入免 Key 内置兜底搜索通道 (DuckDuckGo -> Bing -> 百度)
 * 3. 每个引擎的返回结果都会做查询词覆盖率校验，避免把“非空但无关”的结果当成成功
 */
export class SearchService {
  constructor() {
    this.instances = new Map() // id/name -> instance
    this.defaultInstanceId = null
    this.initialized = false

    // 第一层：免 Key 裸 HTTP 兜底引擎（快，1～3s）
    this.fallbackEngines = ['duckduckgo', 'bing', 'baidu']

    // 第二层：浏览器兜底引擎（慢，5～15s，但能过 TLS 指纹/JS 挑战类反爬）
    // 仅在第一层全部失败或结果相关性不达标时启用，可通过环境变量或 setBrowserFallbackEnabled 关闭
    this.browserFallbackEnabled = process.env.SEARCH_BROWSER_FALLBACK !== '0'
    this.browserFallbackMaxEngines = Number(process.env.SEARCH_BROWSER_MAX_ENGINES || 3)
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
   * 执行多级降级免配置兜底搜索（相关性择优）
   *
   * 单靠「拿到非空结果就收工」是不够的：实测 Bing 对部分长中文 / 生僻查询会返回
   * 语义完全无关的结果（例如查「永雏塔菲 VTuber 介绍 特点 口头禅」返回单字「永」的
   * 字典词条），而且响应里没有任何异常信号。因此这里改成：
   *   - 依次尝试各兜底引擎，用查询词覆盖率评估相关性
   *   - 一旦某个引擎的相关性达标，立即返回（避免多余请求）
   *   - 若全部偏低，返回其中相关性最高的一组，并标记 lowRelevance
   *
   * 【重要】返回值统一带上 engine / degraded / relevance，让上层能知道结果到底由谁作答，
   * 不再出现「静默降级、调用方误以为主引擎正常」的情况。
   * @param {Object} options
   * @param {string} [failedPrimaryName]
   */
  async _cascadeFallbackSearch(options = {}, failedPrimaryName = '') {
    const errors = []
    const attempts = []
    let best = null

    for (const engineType of this.fallbackEngines) {
      const EngineClass = SearchRegistry.get(engineType)
      if (!EngineClass) {
        attempts.push(`${engineType}:未注册`)
        continue
      }

      try {
        const fallbackAdapter = new EngineClass()
        const res = await fallbackAdapter.search(options)
        const list = Array.isArray(res) ? res : (res.results || [])
        const relevance = estimateRelevance(options.query, list)
        attempts.push(`${engineType}:${list.length}条(覆盖率${relevance.hitRatio})`)

        if (list.length === 0) {
          errors.push(`${engineType}: 返回 0 条结果`)
          continue
        }

        if (!best || relevance.hitRatio > best.relevance.hitRatio) {
          best = { engine: engineType, results: list, relevance }
        }

        if (!relevance.lowRelevance) {
          if (failedPrimaryName) {
            console.info(`[SearchService] Primary search (${failedPrimaryName}) failed, recovered using built-in fallback engine [${engineType}].`)
          }
          return {
            query: options.query,
            engine: engineType,
            engineType,
            degraded: true,
            lowRelevance: false,
            failedPrimary: failedPrimaryName || null,
            attempts,
            relevance,
            results: list
          }
        }

        errors.push(`${engineType}: 结果相关性偏低（查询词覆盖率 ${relevance.hitRatio}）`)
      } catch (err) {
        attempts.push(`${engineType}:error`)
        errors.push(`${engineType}: ${err.message}`)
      }
    }

    // 全部裸 HTTP 引擎都没给出高相关结果：先尝试浏览器慢速层，再决定交付哪一组
    if (best) {
      const browserResult = await this._tryBrowserLayer(options, failedPrimaryName, attempts, errors, best)
      if (browserResult) return browserResult

      console.warn(`[SearchService] 所有兜底引擎的相关性均偏低，返回最优的一组 (engine=${best.engine}, 覆盖率=${best.relevance.hitRatio})`)
      return {
        query: options.query,
        engine: best.engine,
        engineType: best.engine,
        degraded: true,
        lowRelevance: true,
        failedPrimary: failedPrimaryName || null,
        attempts,
        relevance: best.relevance,
        results: best.results
      }
    }

    throw new Error(`[SearchService] 所有搜索通道（包括内置兜底引擎）均调用失败: ${errors.join('; ')} | 尝试记录: ${attempts.join(', ')}`)
  }

  /**
   * 尝试「浏览器慢速层」，并与第一层的最优结果对比择优
   *
   * 为什么需要这一层：
   * 免 Key 的 HTML 搜索通道在裸 HTTP 请求下会被 TLS 指纹 / JS 挑战拦住
   * （实测：Brave 429、Startpage 返回拦截页、DuckDuckGo 被标记 cc=botnet），
   * 但换成真实浏览器就能正常拿到结果。代价是单次 5～15 秒，
   * 因此只在第一层全部失败或相关性不达标时才启用。
   *
   * @param {Object} options 搜索参数
   * @param {string} failedPrimaryName
   * @param {string[]} attempts 尝试记录（会被就地追加）
   * @param {string[]} errors 错误记录（会被就地追加）
   * @param {{relevance: {hitRatio: number}}} bestHttpResult 第一层的最优结果
   * @returns {Promise<Object|null>} 择优命中时返回最终结果对象，否则返回 null
   */
  async _tryBrowserLayer(options, failedPrimaryName, attempts, errors, bestHttpResult) {
    if (!this.browserFallbackEnabled) return null

    if (!hasBrowserProvider()) {
      attempts.push('browser-layer:unavailable')
      console.debug('[SearchService] 浏览器慢速层不可用（web-plugin 未加载或浏览器未安装），跳过')
      return null
    }

    const browserTypes = SearchRegistry.getBrowserFallbackTypes()
      .slice(0, Math.max(1, this.browserFallbackMaxEngines))
    if (browserTypes.length === 0) return null

    console.info(`[SearchService] 第一层结果相关性不足，启用浏览器慢速层（${browserTypes.join(' -> ')}）…`)

    const browserAttempts = []
    let browserBest = null

    for (const engineType of browserTypes) {
      const EngineClass = SearchRegistry.get(engineType)
      if (!EngineClass) continue

      const tag = `${engineType}(browser)`
      try {
        const adapter = new EngineClass()
        const res = await adapter.search(options)
        const list = Array.isArray(res) ? res : (res.results || [])
        const relevance = estimateRelevance(options.query, list)
        browserAttempts.push(`${tag}:${list.length}条(覆盖率${relevance.hitRatio})`)

        if (list.length === 0) {
          errors.push(`${tag}: 返回 0 条结果`)
          continue
        }

        if (!browserBest || relevance.hitRatio > browserBest.relevance.hitRatio) {
          browserBest = { engine: engineType, results: list, relevance }
        }

        if (!relevance.lowRelevance) {
          attempts.push(...browserAttempts)
          console.info(`[SearchService] 浏览器慢速层命中：${engineType}（查询词覆盖率 ${relevance.hitRatio}）`)
          return {
            query: options.query,
            engine: engineType,
            engineType,
            layer: 2,
            degraded: true,
            lowRelevance: false,
            failedPrimary: failedPrimaryName || null,
            attempts,
            relevance,
            results: list
          }
        }

        errors.push(`${tag}: 相关性偏低（查询词覆盖率 ${relevance.hitRatio}）`)
      } catch (err) {
        browserAttempts.push(`${tag}:error`)
        errors.push(`${tag}: ${err.message}`)
      }
    }

    attempts.push(...browserAttempts)

    // 浏览器层全都不达标时，只有明确比第一层更相关才采用
    if (browserBest && browserBest.relevance.hitRatio > bestHttpResult.relevance.hitRatio) {
      console.info(`[SearchService] 浏览器慢速层优于第一层（${browserBest.relevance.hitRatio} > ${bestHttpResult.relevance.hitRatio}），采用浏览器结果`)
      return {
        query: options.query,
        engine: browserBest.engine,
        engineType: browserBest.engine,
        layer: 2,
        degraded: true,
        lowRelevance: !!browserBest.relevance.lowRelevance,
        failedPrimary: failedPrimaryName || null,
        attempts,
        relevance: browserBest.relevance,
        results: browserBest.results
      }
    }

    return null
  }

  /**
   * 运行时开关：是否允许启用浏览器慢速层
   * @param {boolean} enabled
   */
  setBrowserFallbackEnabled(enabled) {
    this.browserFallbackEnabled = !!enabled
    console.info(`[SearchService] 浏览器慢速层已${this.browserFallbackEnabled ? '启用' : '禁用'}`)
    return this.browserFallbackEnabled
  }

  /**
   * 获取去重后的实例列表
   * （instances 里同一个实例会以 dbId 和 instanceName 两个 key 存入，直接遍历会重复）
   * @returns {Array}
   */
  _listInstances() {
    const seen = new Set()
    const list = []
    for (const instance of this.instances.values()) {
      if (!instance || seen.has(instance)) continue
      seen.add(instance)
      list.push(instance)
    }
    return list
  }

  /**
   * 执行搜索
   * @returns {Promise<{query: string, engine: string, engineType: string, degraded: boolean, results: Array}>}
   */
  async search(options = {}, adapterIdentifier = null) {
    if (!this.initialized) {
      await this.initialize()
    }

    const requestedRaw = adapterIdentifier == null ? '' : String(adapterIdentifier).trim()
    const requested = requestedRaw.toLowerCase()

    // 1. 显式指定了内置兜底引擎（大小写不敏感）
    //    包含两类：第一层裸 HTTP 引擎，以及第二层浏览器引擎
    const isBrowserFallback = requested && SearchRegistry.getBrowserFallbackTypes().includes(requested)
    const isHttpFallback = requested && this.fallbackEngines.includes(requested)

    if (isHttpFallback || isBrowserFallback) {
      const FallbackClass = SearchRegistry.get(requested)
      if (FallbackClass) {
        if (isBrowserFallback && !hasBrowserProvider()) {
          throw new Error(`[SearchService] 指定的浏览器通道「${requested}」当前不可用：web-plugin 未加载或本机未安装浏览器`)
        }
        const directFallback = new FallbackClass()
        const res = await directFallback.search(options)
        const list = Array.isArray(res) ? res : (res.results || [])
        const relevance = estimateRelevance(options.query, list)
        return {
          query: options.query,
          engine: requested,
          engineType: requested,
          layer: isBrowserFallback ? 2 : 1,
          degraded: false,
          explicit: true,
          lowRelevance: relevance.lowRelevance,
          attempts: [`${requested}:${list.length}条(覆盖率${relevance.hitRatio})`],
          relevance,
          results: list
        }
      }
    }

    // 2. 匹配已配置的主搜索实例
    const key = requestedRaw || this.defaultInstanceId
    let adapter = key ? this.instances.get(key) : null

    if (!adapter && requestedRaw) {
      const list = this._listInstances()

      // 2a. 按实例名匹配（大小写不敏感）
      adapter = list.find(i => String(i.instanceName).toLowerCase() === requested) || null

      // 2b. 按适配器类型匹配：用户可能传的是类型名（如 "tavily"），而实例名却叫别的
      if (!adapter) {
        const byType = list.filter(i => String(i.name).toLowerCase() === requested)
        if (byType.length > 0) {
          adapter = byType.find(i => i.isDefault) || byType[0]
        }
      }
    }

    // 3. 显式指定了一个当前不可用的引擎：不能静默忽略，但也不能直接断链。
    //    优先回退到已配置的默认主实例（质量更高），实在没有才走免 Key 兜底链。
    let requestedEngineUnavailable = false
    if (!adapter && requestedRaw) {
      requestedEngineUnavailable = true
      const fallbackPrimary = this.defaultInstanceId ? this.instances.get(this.defaultInstanceId) : null
      if (fallbackPrimary) {
        adapter = fallbackPrimary
      }
      console.warn(`[SearchService] 指定的搜索实例「${requestedRaw}」当前不可用（未配置或未启用），已回退到${adapter ? `默认主实例「${adapter.instanceName}」` : '内置兜底引擎'}。`)
    }

    // 4. 无任何已配置启用的主搜索实例，直接走内置兜底搜索
    const requestedMeta = requestedEngineUnavailable
      ? { requestedEngine: requestedRaw, requestedEngineUnavailable: true }
      : {}

    if (!adapter) {
      const res = await this._cascadeFallbackSearch(options)
      return { ...res, ...requestedMeta }
    }

    // 5. 执行主搜索实例，若异常或返回空则自动级联回退到内置兜底引擎
    try {
      const res = await adapter.search(options)
      const list = Array.isArray(res) ? res : (res.results || [])

      if (list.length === 0) {
        console.warn(`[SearchService] Primary search adapter (${adapter.instanceName || adapter.name}) 返回 0 条结果，Cascading to built-in fallback engines...`)
        const fallbackRes = await this._cascadeFallbackSearch(options, adapter.instanceName || adapter.name)
        return { ...fallbackRes, ...requestedMeta }
      }

      return {
        query: options.query,
        engine: adapter.instanceName || adapter.name,
        engineType: adapter.name,
        degraded: false,
        attempts: [`${adapter.instanceName || adapter.name}:${list.length}条`],
        results: list,
        ...requestedMeta
      }
    } catch (err) {
      console.warn(`[SearchService] Primary search adapter (${adapter.instanceName || adapter.name}) error: ${err.message}. Cascading to built-in fallback engines...`)
      const fallbackRes = await this._cascadeFallbackSearch(options, adapter.instanceName || adapter.name)
      return { ...fallbackRes, ...requestedMeta }
    }
  }
}

export const searchService = new SearchService()
