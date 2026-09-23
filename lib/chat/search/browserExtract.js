/**
 * 浏览器内执行的搜索结果抽取函数
 *
 * 设计要点：
 * 1. 站点专用选择器优先（质量高），失败时退化到通用锚点启发式（抗改版）。
 * 2. 全部逻辑在页面上下文里执行，因此必须是自包含的纯函数（不能引用外部变量）。
 * 3. 同时做风控特征检测，把「被拦截」与「真的没结果」区分开。
 */

/**
 * @param {Object} cfg
 * @param {Object} cfg.selectors 站点选择器 { item, title, link, snippet }
 * @param {string[]} cfg.ownDomains 需要排除的自身域名
 * @param {number} cfg.limit 最多返回条数
 * @returns {{ results: Array<{title:string,url:string,snippet:string,source:string}>, blocked: boolean, blockReason: string, bodyLen: number, title: string }}
 */
export function extractInPage(cfg) {
  const { selectors = {}, ownDomains = [], limit = 10 } = cfg || {}

  const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim()

  // 通用噪音域名（导航、社交、CDN、以及各搜索引擎自身）
  const NOISE = /google\.|bing\.|microsoft\.|cloudflare\.|facebook\.|twitter\.|apple\.com|w3\.org|miibeian\.gov|startpage\.com|brave\.com|duckduckgo\.com|sm\.cn|toutiao\.com|beian\.|gstatic|doubleclick/i

  const isOwn = href => ownDomains.some(d => href.indexOf(d) !== -1)

  const out = []
  const seenUrl = new Set()

  const push = (title, url, snippet, source) => {
    if (!url || !/^https?:/i.test(url)) return
    if (isOwn(url) || NOISE.test(url)) return
    const t = norm(title)
    if (!t || t.length < 4 || t.length > 300) return
    if (seenUrl.has(url)) return
    seenUrl.add(url)
    out.push({ title: t, url, snippet: norm(snippet).slice(0, 400), source })
  }

  // ---------- 策略 1：站点专用选择器 ----------
  if (selectors.item) {
    let nodes = []
    try { nodes = Array.from(document.querySelectorAll(selectors.item)) } catch { nodes = [] }
    for (const node of nodes) {
      if (out.length >= limit) break
      // 跳过广告位 / 非结果模块
      if (selectors.skip) {
        let skipCls = ''
        try { skipCls = String((node.className && node.className.baseVal) || node.className || '') } catch {}
        if (new RegExp(selectors.skip, 'i').test(skipCls)) continue
        let hit = false
        try { hit = !!node.querySelector(selectors.skip) } catch {}
        if (hit) continue
      }
      let a = null
      try {
        a = selectors.link ? node.querySelector(selectors.link) : node.querySelector('a[href^="http"]')
      } catch { a = null }
      if (!a) continue
      let titleEl = a
      let snipEl = null
      try { if (selectors.title) titleEl = node.querySelector(selectors.title) || a } catch {}
      try { if (selectors.snippet) snipEl = node.querySelector(selectors.snippet) } catch {}
      push(norm(titleEl.innerText || titleEl.textContent || a.innerText), a.href, snipEl ? snipEl.innerText : '', 'selector')
    }
  }

  // ---------- 策略 2：通用锚点启发式 ----------
  if (out.length < 3) {
    const anchors = Array.from(document.querySelectorAll('a[href]'))
    // 先算一个「像结果列表」的容器，用于优先排序
    const containerScore = node => {
      let el = node
      for (let i = 0; i < 6 && el; i++) {
        const cls = String((el.className && el.className.baseVal) || el.className || '')
        if (/result|serp|search-item|web-result|item/i.test(cls)) return 2
        el = el.parentElement
      }
      return 0
    }
    const candidates = []
    for (const a of anchors) {
      const text = norm(a.innerText || a.textContent)
      if (text.length < 12 || text.length > 220) continue
      const href = a.href
      if (!/^https?:/i.test(href) || isOwn(href) || NOISE.test(href)) continue
      let snippet = ''
      let sib = a.parentElement
      for (let i = 0; i < 3 && sib; i++) {
        const t = norm(sib.innerText)
        if (t.length > text.length + 20) { snippet = t.replace(text, '').slice(0, 300); break }
        sib = sib.parentElement
      }
      candidates.push({ score: containerScore(a), text, href, snippet, order: candidates.length })
    }
    candidates.sort((x, y) => (y.score - x.score) || (x.order - y.order))
    for (const c of candidates) {
      if (out.length >= limit) break
      push(c.text, c.href, c.snippet, 'heuristic')
    }
  }

  // ---------- 风控检测 ----------
  const bodyText = norm(document.body ? document.body.innerText : '')
  const BLOCK_RE = /captcha|验证码|安全验证|人机验证|人机身份|unusual traffic|are you a robot|not a robot|请稍候|verifying your browser|checking your browser|antispider|enable javascript and cookies|access denied|请求过于频繁|请输入验证/i
  const blocked = BLOCK_RE.test(bodyText)

  return {
    results: out.slice(0, limit),
    blocked,
    blockReason: blocked ? bodyText.slice(0, 160) : '',
    bodyLen: bodyText.length,
    title: document.title || ''
  }
}

export default extractInPage
