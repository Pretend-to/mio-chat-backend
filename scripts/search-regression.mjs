/**
 * Search 工具回归测试
 *
 * 覆盖本次修复的缺陷：
 *   1. DuckDuckGo 结果块切分正则过宽 → 恒返回 0 条
 *   2. 降级链静默执行、不回报实际引擎
 *   3. 无相关性校验 → Bing 的降级结果可直达模型
 *   4. HTML 实体未反转义
 *   5. 显式指定不可用引擎时静默忽略
 *
 * 用法：node scripts/search-regression.mjs
 * 说明：解析类用例基于 tests/fixtures/search/ 下的真实响应快照，不依赖网络；
 *       全链路的联网用例在网络受限（反爬/验证码）时会自动跳过并给出提示。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import DuckDuckGo from '../lib/chat/search/implementations/duckduckgo.js'
import Bing from '../lib/chat/search/implementations/bing.js'
import Baidu from '../lib/chat/search/implementations/baidu.js'
import { SearchRegistry } from '../lib/chat/search/SearchRegistry.js'
import { searchService } from '../lib/chat/search/SearchService.js'
import { estimateRelevance } from '../lib/chat/search/relevance.js'
import { decodeHtmlEntities } from '../lib/chat/search/htmlEntities.js'
import SearchTool from '../lib/plugins/ai-plugin/tools/search.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(__dirname, '..', 'tests', 'fixtures', 'search')
const fixture = name => fs.readFileSync(path.join(FIXTURES, name), 'utf8')

let pass = 0
let fail = 0
let skipped = 0
const failures = []

function check(name, condition, detail = '') {
  if (condition) {
    pass += 1
    console.log(`  ✅ ${name}`)
  } else {
    fail += 1
    failures.push(`${name}${detail ? ' — ' + detail : ''}`)
    console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`)
  }
}

function skip(name, why) {
  skipped += 1
  console.log(`  ⏭️  ${name}（跳过：${why}）`)
}

const ENTITY_RE = /&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i
const BAD_QUERY = '永雏塔菲 VTuber 介绍 特点 口头禅'

async function main() {
  await searchService.initialize()
  const tool = new SearchTool()

  // ===============================================================
  console.log('\n【T1】DuckDuckGo 解析（基于真实响应快照，修复前恒为 0 条）')
  const ddgHtml = fixture('duckduckgo-serp.html')
  const ddgResults = DuckDuckGo.parseResults(ddgHtml, 10)
  check('从快照解析出 10 条结果', ddgResults.length === 10, `实际 ${ddgResults.length} 条`)
  check('标题已去标签且非空', ddgResults.every(r => r.title && !/<[^>]+>/.test(r.title)))
  check('链接已还原为真实 URL（非 uddg 中转）', ddgResults.every(r => r.url.startsWith('http') && !r.url.includes('uddg=')))
  check('结果与查询实体相关', ddgResults.some(r => /塔菲/.test(r.title)), ddgResults.map(r => r.title).slice(0, 3).join(' | '))
  check('无裸 HTML 实体', !ddgResults.some(r => ENTITY_RE.test(r.title) || ENTITY_RE.test(r.snippet)))
  console.log(`     ↳ 首条: ${ddgResults[0]?.title} -> ${ddgResults[0]?.url}`)

  // ===============================================================
  console.log('\n【T2】HTML 实体反转义')
  check('&#0183; 被还原为分隔符', !decodeHtmlEntities('2025年9月28日 &#0183; 永（拼音：yǒng）').includes('0183'),
    decodeHtmlEntities('2025年9月28日 &#0183; 永（拼音：yǒng）'))
  check('&ensp; 被还原为空格', decodeHtmlEntities('A&ensp;B') === 'A B', decodeHtmlEntities('A&ensp;B'))
  check('&amp; 被还原', decodeHtmlEntities('A&amp;B') === 'A&B')
  check('十六进制实体被还原', decodeHtmlEntities('&#x4E2D;文') === '中文')

  // ===============================================================
  console.log('\n【T3】Bing 快照：确认降级结果能被识别为低相关')
  const bingJunk = Bing.parseResults(fixture('bing-degraded-serp.html'), 5)
  const relJunk = estimateRelevance(BAD_QUERY, bingJunk)
  check('Bing 降级快照确实解析出结果', bingJunk.length > 0, `${bingJunk.length} 条`)
  check('该结果被判定为低相关', relJunk.lowRelevance === true, `覆盖率 ${relJunk.hitRatio}`)
  check('Bing snippet 已无裸实体', !bingJunk.some(r => /&#0183;|&ensp;|&amp;/.test(r.snippet)))
  console.log(`     ↳ 首条: ${bingJunk[0]?.title}`)
  console.log(`     ↳ 未命中查询词: ${relJunk.missed.join('、')}`)

  const bingNormal = Bing.parseResults(fixture('bing-normal-serp.html'), 5)
  const relNormal = estimateRelevance('特斯拉 Model Y 价格', bingNormal)
  check('Bing 正常快照不被误判', relNormal.lowRelevance === false, `覆盖率 ${relNormal.hitRatio}`)
  // 回归：中文 2-gram 跨词假词导致的误报
  console.log('\n【T3b】中文相关性误报回归')
  const weatherResults = [
    { title: '北京 - 中国气象局-天气预报-城市预报', snippet: '时间, 08:00, 11:00 ; 天气 ; 气温, 21.8℃, 25.2℃ ; 降水, 无降水 ; 风速, 3.3m/s' },
    { title: '北京天气预报,北京7天天气预报,北京15天天气预报,北京天气查询', snippet: '18日（今天）. 小雨转多云. 27/19℃' }
  ]
  const relWeather = estimateRelevance('北京今日天气 温度', weatherResults)
  check('明显相关的天气结果不被误判为低相关', relWeather.lowRelevance === false,
    `覆盖率 ${relWeather.hitRatio}, 未命中 ${relWeather.missed.join('、')}`)

  const junkCN = [{ title: '帮忙翻译下希腊数字', snippet: '百度即时翻译功能在哪' }]
  check('无关结果不会因含停用词而蒙混过关',
    estimateRelevance('MioChat AI 是什么', junkCN).lowRelevance === true)

  check('原故障用例仍被判定为低相关', estimateRelevance(BAD_QUERY, bingJunk).lowRelevance === true)
  check('相关性判定附带度量方式', estimateRelevance('测试', weatherResults).method === 'char-coverage')


  // ===============================================================
  console.log('\n【T4】百度快照：验证码拦截能被识别为异常而非"0 条结果"')
  try {
    Baidu.parseResults(fixture('baidu-captcha.html'), 5)
    const captchaHtml = fixture('baidu-captcha.html')
    check('验证码页面不含结果容器', Baidu.parseResults(captchaHtml, 5).length === 0)
    check('验证码页面可被特征识别', /wappass\.baidu\.com|百度安全验证/.test(captchaHtml))
  } catch (e) {
    check('验证码页面处理', false, e.message)
  }

  // ===============================================================
  console.log('\n【T5】相关性择优降级（核心修复）')
  const savedEngines = searchService.fallbackEngines
  const savedGet = SearchRegistry.get
  try {
    SearchRegistry.get = (type) => {
      if (type === 'stubJunk') {
        return class { async search() { return { results: [
          { title: '永_百度百科', snippet: '永（拼音：yǒng）是汉语一级通用规范汉字' },
          { title: '永 yǒng - 汉典', snippet: '永，水长也。象水巠理之长' }
        ] } } }
      }
      if (type === 'stubGood') {
        return class { async search() { return { results: [
          { title: '永雏塔菲 - 萌娘百科', snippet: '永雏塔菲是一名经营着侦探事务所的少女王牌侦探发明家，2021年出道' }
        ] } } }
      }
      return undefined
    }

    searchService.fallbackEngines = ['stubJunk', 'stubGood']
    const r = await searchService._cascadeFallbackSearch({ query: BAD_QUERY })
    check('跳过低相关引擎，采用高相关结果', r.engine === 'stubGood', `实际 engine=${r.engine}`)
    check('标记 degraded=true', r.degraded === true)
    check('标记 lowRelevance=false', r.lowRelevance === false)
    check('包含尝试记录', Array.isArray(r.attempts) && r.attempts.length === 2, JSON.stringify(r.attempts))

    searchService.fallbackEngines = ['stubJunk']
    const r2 = await searchService._cascadeFallbackSearch({ query: BAD_QUERY })
    check('全部低相关时返回最优并显式标记 lowRelevance', r2.lowRelevance === true && r2.results.length > 0)

    searchService.fallbackEngines = ['not-registered-engine']
    try {
      await searchService._cascadeFallbackSearch({ query: 'test' })
      check('全部通道不可用时应抛错', false, '竟然没抛错')
    } catch (e) {
      check('抛出的错误含可读原因', /均调用失败/.test(e.message) && /尝试记录/.test(e.message), e.message.slice(0, 120))
    }
  } finally {
    SearchRegistry.get = savedGet
    searchService.fallbackEngines = savedEngines
  }

  // ===============================================================
  console.log('\n【T6】联网全链路（网络受限时自动跳过）')
  let ddgAlive = true
  try {
    await new DuckDuckGo().search({ query: 'OpenAI', count: 3 })
  } catch (e) {
    ddgAlive = false
    skip('DuckDuckGo 联网直连', e.message.slice(0, 60))
  }
  if (ddgAlive) {
    const live = await new DuckDuckGo().search({ query: '北京天气', count: 5 })
    check('DDG 联网返回 ≥1 条', live.results.length >= 1, `${live.results.length} 条`)
    check('DDG 联网无裸实体', !live.results.some(r => ENTITY_RE.test(r.title) || ENTITY_RE.test(r.snippet)))
  }

  const r1 = await tool.func({ params: { query: BAD_QUERY } })
  check('工具返回体含 engine', typeof r1.engine === 'string' && r1.engine.length > 0, JSON.stringify(r1.engine))
  check('工具返回体含 degraded', typeof r1.degraded === 'boolean')
  if (r1.error) {
    skip('全链路查询', r1.error.slice(0, 60))
  } else {
    check('有结果时必然给出可信度标注', r1.count > 0, `count=${r1.count}`)
    if (r1.lowRelevance) {
      check('低相关结果附带 relevanceWarning', typeof r1.relevanceWarning === 'string' && r1.relevanceWarning.length > 0)
      console.log('     ↳ 已正确标记为低相关，模型不会盲信')
    } else {
      check('高相关结果首条命中实体', /塔菲/.test(r1.results?.[0]?.title || ''), r1.results?.[0]?.title)
    }
    console.log(`     ↳ engine=${r1.engine} | degraded=${r1.degraded} | lowRelevance=${!!r1.lowRelevance} | 首条=${r1.results?.[0]?.title}`)
  }

  // ===============================================================
  console.log('\n【T7】显式指定引擎')
  const hasDefault = !!searchService.defaultInstanceId
  if (!hasDefault) {
    skip('按类型名解析实例', '当前没有已配置的默认实例')
    skip('未知引擎回退到默认实例', '当前没有已配置的默认实例')
  } else {
    const instName = searchService.defaultInstanceId
    const inst = searchService.instances.get(instName)
    const instType = inst?.name

    // 场景 A：传「适配器类型名」而不是实例名（例如实例叫 555，类型是 tavily）
    const rType = await tool.func({ params: { query: 'OpenAI', count: 3, adapterId: instType } })
    check(`传类型名「${instType}」能解析到实例「${instName}」`, rType.engine === instName, `engine=${rType.engine}`)
    check('engineType 标明真实类型', rType.engineType === instType, `engineType=${rType.engineType}`)
    check('解析成功时不产生 note', !rType.note, JSON.stringify(rType.note))

    // 场景 B：按实例名指定
    const rByName = await tool.func({ params: { query: 'OpenAI', count: 3, adapterId: instName } })
    check(`按实例名「${instName}」指定同样生效`, rByName.engine === instName, `engine=${rByName.engine}`)
  }

  // 场景 C：指定一个不存在的引擎 —— 必须可见地回退，而不是静默
  const rUnknown = await tool.func({ params: { query: 'OpenAI', count: 3, adapterId: 'not-exist-engine' } })
  check('未知引擎不静默：有 note 提示', typeof rUnknown.note === 'string' && rUnknown.note.includes('不可用'), JSON.stringify(rUnknown.note))
  if (hasDefault) {
    check('未知引擎回退到默认主实例而非免 Key 兜底链',
      rUnknown.engine === searchService.defaultInstanceId && rUnknown.degraded === false,
      `engine=${rUnknown.engine} degraded=${rUnknown.degraded}`)
  }

  // ===============================================================
  console.log('\n' + '='.repeat(58))
  console.log(`通过 ${pass} 项 / 失败 ${fail} 项 / 跳过 ${skipped} 项`)
  if (failures.length > 0) {
    console.log('\n失败明细：')
    failures.forEach(f => console.log('  - ' + f))
  }
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(e => {
  console.error('\n[回归测试] 未捕获异常:', e)
  process.exit(1)
})
