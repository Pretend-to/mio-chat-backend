import BaseSearchAdapter from '../../BaseSearchAdapter.js'
import { acquireBrowser } from '../../browserBridge.js'
import { extractInPage } from '../../browserExtract.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

/**
 * BaseBrowserSearchAdapter - 基于真实浏览器的搜索适配器基类
 *
 * 适用场景：
 * 免 Key 的 HTML 搜索通道在裸 HTTP 请求下常被 TLS 指纹 / JS 挑战拦截
 * （实测：Brave 裸请求 429、Startpage 返回拦截页、DuckDuckGo 被标记 botnet），
 * 但用真实浏览器可以正常拿到结果。这类通道统一放在「慢速兜底层」，
 * 仅在第一层（裸 HTTP）全部失败或结果相关性不达标时才启用。
 *
 * 子类需要实现：
 *   - static siteName        用于日志与 engine 标识
 *   - static ownDomains      自身域名，用于过滤
 *   - static selectors       站点专用选择器（可选，缺失时走通用启发式）
 *   - buildUrl(query)        构造搜索 URL
 */
export default class BaseBrowserSearchAdapter extends BaseSearchAdapter {
  constructor(config = {}) {
    super(config)
    this.name = this.constructor.siteName
  }

  /** 页面加载整体超时 */
  get navigationTimeout() {
    return this.config.navigationTimeout || 25000
  }

  /** 等待结果渲染的最长时间（SPA 需要） */
  get resultWaitMs() {
    return this.config.resultWaitMs || 8000
  }

  /** 轮询间隔 */
  get pollIntervalMs() {
    return this.config.pollIntervalMs || 800
  }

  /**
   * 构造搜索 URL（子类必须实现）
   * @param {string} query
   * @returns {string}
   */
  buildUrl() {
    throw new Error('Subclass must implement buildUrl()')
  }

  async search(options = {}) {
    const { query, count = 5 } = options
    const selectors = this.constructor.selectors || {}
    const ownDomains = this.constructor.ownDomains || []

    const browser = await acquireBrowser()
    let page
    const startedAt = Date.now()

    try {
      page = await browser.newPage()

      // obscura 等精简实现可能不支持这些 API，失败不影响主流程
      try { await page.setViewport({ width: 1440, height: 900 }) } catch {}

      const url = this.buildUrl(query)
      logger.debug(`[${this.name}] browser search -> ${url}`)

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.navigationTimeout })

      const deadline = Date.now() + this.resultWaitMs
      let snapshot = { results: [], blocked: false, blockReason: '', bodyLen: 0, title: '' }

      while (Date.now() < deadline) {
        try {
          snapshot = await page.evaluate(extractInPage, { selectors, ownDomains, limit: Math.max(count, 10) })
        } catch (err) {
          logger.debug(`[${this.name}] evaluate failed: ${err.message}`)
        }
        if (snapshot.results && snapshot.results.length >= 3) break
        if (snapshot.blocked) break
        await sleep(this.pollIntervalMs)
      }

      const elapsed = Date.now() - startedAt

      // 被风控拦截：显式抛错，让上层知道是「被拦」而不是「没结果」
      if (snapshot.blocked && (!snapshot.results || snapshot.results.length === 0)) {
        throw new Error(`[${this.name}] 被反爬拦截（${(snapshot.blockReason || 'unknown').slice(0, 80)}）`)
      }

      const results = (snapshot.results || []).slice(0, count)
      logger.info(`[${this.name}] browser search done in ${elapsed}ms, ${results.length} results`)

      return {
        query,
        results,
        meta: { elapsedMs: elapsed, bodyLen: snapshot.bodyLen, pageTitle: snapshot.title }
      }
    } finally {
      // 浏览器实例由 web-plugin 的空闲回收管理（close 是 noop），但 page 必须手动关
      if (page) {
        try { await page.close() } catch {}
      }
    }
  }

  static getAdapterMetadata() {
    return {
      type: this.siteName,
      name: this.siteName,
      description: '基于真实浏览器的免 Key 搜索通道（慢速兜底）',
      configSchema: {}
    }
  }
}
