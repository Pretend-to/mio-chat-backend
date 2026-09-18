/**
 * BrowserBridge - 搜索层与浏览器层之间的解耦桥梁
 *
 * 背景：
 * 免 Key 的 HTML 搜索通道（Startpage / Brave / DuckDuckGo / 神马等）在裸 HTTP 请求下
 * 常被 TLS 指纹与 JS 挑战拦截，必须借助真实浏览器才能拿到结果。
 * 项目里 web-plugin 已经维护了一套共享的、带空闲回收的 puppeteer 浏览器实例
 * （`WebPlugin#getBrowser()`，且其 `close()` 被 Proxy 拦截为 noop）。
 *
 * 但 `lib/chat/search/` 属于核心 lib，不应直接依赖插件模块（会造成循环依赖与耦合）。
 * 因此这里提供一个「提供者注册」入口：由 web-plugin 在 initialize 时把自己的
 * getBrowser 注入进来，搜索层按需取用；插件未加载时自动降级为不可用。
 */

let browserProvider = null

/**
 * 注册浏览器提供者（由 web-plugin 调用）
 * @param {(() => Promise<import('puppeteer-core').Browser>) | null} provider
 */
export function setBrowserProvider(provider) {
  browserProvider = typeof provider === 'function' ? provider : null
}

/** 解除注册（插件卸载时调用） */
export function clearBrowserProvider() {
  browserProvider = null
}

/** 当前是否具备浏览器能力 */
export function hasBrowserProvider() {
  return typeof browserProvider === 'function'
}

/**
 * 获取共享浏览器实例
 * 注意：返回的是受管理的 Proxy，`close()` 是 noop，浏览器生命周期由插件空闲回收控制。
 * 调用方只需负责关闭自己创建的 page。
 * @param {Object} [options]
 * @returns {Promise<import('puppeteer-core').Browser>}
 */
export async function acquireBrowser(options = {}) {
  if (!browserProvider) {
    throw new Error('[BrowserBridge] 浏览器提供者未注册（web-plugin 未加载或初始化失败）')
  }
  return browserProvider(options)
}

export default { setBrowserProvider, clearBrowserProvider, hasBrowserProvider, acquireBrowser }
