/**
 * 两层搜索架构回归测试
 *
 * A. 浏览器适配器逐个直测（需要本机 Chrome）
 * B. 两层降级集成测试（第一层故意用低相关 stub，验证是否自动升到第二层）
 * C. 关闭开关后的行为
 *
 * 用法：node scripts/search-browser-layer-test.mjs
 */
import puppeteer from 'puppeteer-core'
import { SearchRegistry } from '../lib/chat/search/SearchRegistry.js'
import { searchService } from '../lib/chat/search/SearchService.js'
import { setBrowserProvider, hasBrowserProvider } from '../lib/chat/search/browserBridge.js'
import { estimateRelevance } from '../lib/chat/search/relevance.js'
import SearchTool from '../lib/plugins/ai-plugin/tools/search.js'

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const QUERY = '永雏塔菲'

let pass = 0
let fail = 0
let skipped = 0
const failures = []
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✅ ${name}`) }
  else { fail++; failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`) }
}
const skip = (name, why) => { skipped++; console.log(`  ⏭️  ${name}（跳过：${why}）`) }

// ---------------- 构造一个"受管理"的浏览器提供者（模拟 web-plugin 的行为） ----------------
let rawBrowser = null
function makeProvider() {
  return async () => {
    if (!rawBrowser || rawBrowser.connected === false) {
      rawBrowser = await puppeteer.launch({
        executablePath: CHROME,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      })
      const origNewPage = rawBrowser.newPage.bind(rawBrowser)
      rawBrowser.newPage = async (...args) => {
        const page = await origNewPage(...args)
        try { await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36') } catch {}
        try { await page.setViewport({ width: 1440, height: 900 }) } catch {}
        return page
      }
    }
    // 与 web-plugin 一致：拦截 close()，生命周期由上层管理
    return new Proxy(rawBrowser, {
      get(target, prop) {
        if (prop === 'close') return async () => {}
        const v = Reflect.get(target, prop)
        return typeof v === 'function' ? v.bind(target) : v
      }
    })
  }
}

async function main() {
  await searchService.initialize()
  const tool = new SearchTool()

  console.log('\n【前置】浏览器桥接状态')
  check('未注册时 hasBrowserProvider() 为 false', hasBrowserProvider() === false)

  // ---------------- A. 浏览器适配器直测 ----------------
  console.log('\n【A】浏览器适配器直测（真实 Chrome）')
  setBrowserProvider(makeProvider())
  check('注册后 hasBrowserProvider() 为 true', hasBrowserProvider() === true)

  const browserTypes = SearchRegistry.getBrowserFallbackTypes()
  console.log(`  已注册浏览器通道：${browserTypes.join(', ')}`)
  check('注册中心含 4 个浏览器通道', browserTypes.length === 4, browserTypes.join(','))

  const healthy = []
  for (const type of browserTypes) {
    const Adapter = SearchRegistry.get(type)
    const t0 = Date.now()
    try {
      const res = await new Adapter().search({ query: QUERY, count: 5 })
      const list = res.results || []
      const rel = estimateRelevance(QUERY, list)
      const ok = list.length >= 1
      const flag = list.length === 0 ? '🔴' : (rel.lowRelevance ? '🟠' : '🟢')
      console.log(`  ${flag} ${type.padEnd(20)} ${String(list.length).padStart(2)} 条  覆盖率=${rel.hitRatio}  ${Date.now() - t0}ms`)
      if (list[0]) console.log(`       首条: ${String(list[0].title).slice(0, 62)}`)
      if (list[0]) console.log(`       链接: ${String(list[0].url).slice(0, 70)}`)
      check(`${type} 返回 ≥1 条`, ok, `${list.length} 条`)
      if (ok && !rel.lowRelevance) healthy.push(type)
      if (ok) {
        check(`${type} 结果与查询实体相关`, list.some(r => /塔菲/.test(r.title + r.snippet)), `首条: ${list[0]?.title}`)
      }
    } catch (e) {
      console.log(`  🔴 ${type.padEnd(20)} 失败: ${e.message.slice(0, 90)}`)
      skip(`${type} 返回 ≥1 条`, e.message.slice(0, 60))
    }
  }
  console.log(`  → 健康通道：${healthy.length > 0 ? healthy.join(', ') : '（无，可能与本机 IP/网络相关）'}`)

  // ---------------- B. 两层降级集成 ----------------
  // ---------------- A2. 显式指定浏览器通道 ----------------
  console.log('\n【A2】显式指定浏览器通道（adapterId）')
  if (healthy.length === 0) {
    skip('显式指定浏览器通道', '本机没有健康的浏览器通道')
  } else {
    const target = healthy[0]
    const rExp = await tool.func({ params: { query: QUERY, count: 3, adapterId: target } })
    console.log(`      adapterId=${target} -> engine=${rExp.engine} layer=${rExp.layer} 条数=${rExp.count ?? 0}`)
    check(`显式指定「${target}」生效`, rExp.engine === target, `engine=${rExp.engine}`)
    check('显式指定浏览器通道时 layer=2', rExp.layer === 2, `layer=${rExp.layer}`)
    check('显式指定时不被误判为“不可用的实例”', !rExp.note || !/不可用/.test(String(rExp.note)), JSON.stringify(rExp.note))
    check('显式指定时返回结果', (rExp.count ?? 0) >= 1, `count=${rExp.count}`)
  }

  console.log('\n【B】两层降级集成测试')
  // 把第一层换成"只返回无关结果"的 stub，并暂时摘掉已配置的主实例，
  // 只有这样才能真正走到兜底降级链
  const savedFallbackEngines = searchService.fallbackEngines
  const savedGet = SearchRegistry.get
  const savedInstances = searchService.instances
  const savedDefault = searchService.defaultInstanceId
  searchService.instances = new Map()
  searchService.defaultInstanceId = null
  SearchRegistry.get = (type) => {
    if (type === 'stubJunkHttp') {
      return class { async search() { return { results: [{ title: '无关内容', snippet: '与查询毫无关系的文字' }] } } }
    }
    return savedGet.call(SearchRegistry, type)
  }
  searchService.fallbackEngines = ['stubJunkHttp']

  const r = await tool.func({ params: { query: QUERY, count: 5 } })
  console.log(`      engine=${r.engine} layer=${r.layer} 条数=${r.count ?? 0} lowRelevance=${!!r.lowRelevance}`)
  if (r.note) console.log(`      note: ${r.note}`)

  if (healthy.length === 0) {
    skip('自动升级到浏览器慢速层', '本机没有健康的浏览器通道')
  } else {
    check('第一层低相关时自动启用第二层', r.layer === 2, `layer=${r.layer}, engine=${r.engine}`)
    check('engine 为浏览器通道', healthy.includes(String(r.engine)), `engine=${r.engine}`)
    check('第二层命中后 lowRelevance 为 false', r.lowRelevance !== true)
    check('返回体带 layer 字段', typeof r.layer === 'number')
    check('note 说明走了浏览器慢速层', typeof r.note === 'string' && r.note.includes('浏览器慢速层'), JSON.stringify(r.note))
  }

  // ---------------- C. 开关 ----------------
  console.log('\n【C】关闭浏览器慢速层')
  searchService.setBrowserFallbackEnabled(false)
  const r2 = await tool.func({ params: { query: QUERY, count: 5 } })
  console.log(`      engine=${r2.engine} layer=${r2.layer} 条数=${r2.count ?? 0} lowRelevance=${!!r2.lowRelevance}`)
  check('关闭后不再走第二层', r2.layer !== 2 || r2.engine === 'stubJunkHttp', `layer=${r2.layer}`)
  searchService.setBrowserFallbackEnabled(true)

  SearchRegistry.get = savedGet
  searchService.fallbackEngines = savedFallbackEngines
  searchService.instances = savedInstances
  searchService.defaultInstanceId = savedDefault

  // ---------------- D. 浏览器不可用时的优雅降级 ----------------
  console.log('\n【D】浏览器提供者缺失时的降级行为')
  searchService.fallbackEngines = ['stubJunkHttp']
  searchService.instances = new Map()
  searchService.defaultInstanceId = null
  const savedGet2 = SearchRegistry.get
  SearchRegistry.get = (type) => type === 'stubJunkHttp'
    ? class { async search() { return { results: [{ title: '无关', snippet: '无关内容' }] } } }
    : savedGet.call(SearchRegistry, type)

  const { clearBrowserProvider } = await import('../lib/chat/search/browserBridge.js')
  clearBrowserProvider()
  const r3 = await tool.func({ params: { query: QUERY, count: 5 } })
  console.log(`      engine=${r3.engine} layer=${r3.layer} lowRelevance=${!!r3.lowRelevance}`)
  check('无浏览器时仍能返回第一层结果并标记低相关', r3.count >= 1 && r3.lowRelevance === true, JSON.stringify({ count: r3.count, low: r3.lowRelevance }))

  SearchRegistry.get = savedGet2
  searchService.fallbackEngines = savedFallbackEngines
  searchService.instances = savedInstances
  searchService.defaultInstanceId = savedDefault

  if (rawBrowser) { try { await rawBrowser.close() } catch {} }

  console.log('\n' + '='.repeat(60))
  console.log(`通过 ${pass} 项 / 失败 ${fail} 项 / 跳过 ${skipped} 项`)
  if (failures.length > 0) { console.log('\n失败明细：'); failures.forEach(f => console.log('  - ' + f)) }
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(e => { console.error('\n[测试] 未捕获异常:', e); process.exit(1) })
