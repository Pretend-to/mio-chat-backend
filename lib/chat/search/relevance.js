/**
 * 搜索结果相关性粗判
 *
 * 背景：Bing 的免费 HTML 通道对部分长中文 / 生僻查询会返回语义完全无关的结果，
 * 而且响应里既没有「无结果」提示也没有「已纠正为…」文案，调用方无法从状态码察觉。
 * 例如实测：
 *   「永雏塔菲 VTuber 介绍 特点 口头禅」→ 全部返回单字「永」的字典词条
 *   「MioChat AI 是什么」            → 返回希腊数字、翻译软件类结果
 *
 * 因此这里做一个轻量的「查询词覆盖率」校验，用于在交付给模型之前打标，
 * 而不是替模型做判断（最终采信仍由模型决定）。
 *
 * 【关于中文的度量方式】
 * 早期版本把中文串按 2-gram 切开算命中率，但这会切出「京今」「日天」这类
 * 跨词假词（来自「北京今日天气」），它们永远不可能出现在正文里，导致
 * 「北京今日天气 温度」这种明显相关的查询被误判为低相关（实测覆盖率只有 0.2）。
 *
 * 现在的做法：仍然用 2-gram 做**匹配**（避免单字过宽），但用**字符覆盖**做**计分**——
 * 只要某个字被任意一个命中的 bigram 覆盖到，就算命中。
 * 这样「北京」「天气」命中后即可覆盖 4 个字，覆盖率 0.5，不再误报。
 */

const STOP_WORDS = new Set([
  // 中文整串停用词（仅当整个连续中文片段等于它时才剔除）
  '是什么', '什么', '怎么', '如何', '为什么', '哪些', '哪个', '介绍', '特点',
  '意思', '相关', '教程', '原理', '价格', '天气', '最新', '现在', '可以',
  '的', '了', '和', '与', '及', '或', '在', '是', '有', '吗', '呢',
  // 英文停用词
  'the', 'and', 'for', 'with', 'what', 'how', 'why', 'is', 'are', 'of', 'to'
])

const CJK_RUN_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g
const LATIN_TOKEN_RE = /[a-z0-9_+#.]{2,}/g

/**
 * 拆出查询里的拉丁词与中文片段（保留结构，便于分别度量）
 * @param {string} query
 * @returns {{ latinTokens: string[], cjkRuns: string[] }}
 */
export function parseQuery(query = '') {
  const raw = String(query).toLowerCase()

  const latinTokens = [...new Set(
    [...raw.matchAll(LATIN_TOKEN_RE)]
      .map(m => m[0])
      .filter(t => !STOP_WORDS.has(t))
  )]

  // 整个片段等于停用词时才剔除；长片段内部包含停用词不清除（如「北京今日天气」）
  const cjkRuns = [...raw.matchAll(CJK_RUN_RE)]
    .map(m => m[0])
    .filter(run => !STOP_WORDS.has(run))

  return { latinTokens, cjkRuns }
}

/**
 * 兼容旧接口：返回用于覆盖率比对的 token 列表
 * @param {string} query
 * @returns {string[]}
 */
export function tokenizeQuery(query = '') {
  const { latinTokens, cjkRuns } = parseQuery(query)
  const tokens = [...latinTokens]
  for (const run of cjkRuns) {
    if (run.length <= 2) {
      tokens.push(run)
    } else {
      for (let i = 0; i < run.length - 1; i += 1) tokens.push(run.slice(i, i + 2))
    }
  }
  return [...new Set(tokens)]
}

/**
 * 估算结果与查询的相关性
 * @param {string} query
 * @param {Array<{title?: string, snippet?: string}>} results
 * @param {Object} [options]
 * @param {number} [options.sampleSize=5] 只采样前 N 条
 * @param {number} [options.threshold=0.34] 覆盖率低于该值判定为可疑
 * @returns {{ lowRelevance: boolean, hitRatio: number, matched: string[], missed: string[], total: number, method: string }}
 */
export function estimateRelevance(query, results = [], options = {}) {
  const { sampleSize = 5, threshold = 0.34 } = options
  const { latinTokens, cjkRuns } = parseQuery(query)

  const emptyResult = {
    lowRelevance: false,
    hitRatio: 1,
    matched: [],
    missed: [],
    total: 0,
    method: 'char-coverage'
  }

  if (!Array.isArray(results) || results.length === 0) return emptyResult
  if (latinTokens.length === 0 && cjkRuns.length === 0) return emptyResult

  const haystack = results
    .slice(0, sampleSize)
    .map(r => `${r?.title || ''} ${r?.snippet || ''}`)
    .join(' ')
    .toLowerCase()

  // ---- 拉丁词：整词命中 ----
  const matchedLatin = latinTokens.filter(t => haystack.includes(t))
  const missedLatin = latinTokens.filter(t => !haystack.includes(t))

  // ---- 中文：bigram 匹配，但按字符覆盖计分 ----
  let cjkCharTotal = 0
  let cjkCharCovered = 0
  const matchedBigrams = []
  const uncoveredChars = []

  for (const run of cjkRuns) {
    const covered = Array.from({ length: run.length }, () => false)

    if (run.length === 1) {
      if (haystack.includes(run)) covered[0] = true
    } else {
      for (let i = 0; i < run.length - 1; i += 1) {
        const bigram = run.slice(i, i + 2)
        if (haystack.includes(bigram)) {
          covered[i] = true
          covered[i + 1] = true
          matchedBigrams.push(bigram)
        }
      }
    }

    cjkCharTotal += run.length
    for (let i = 0; i < run.length; i += 1) {
      if (covered[i]) cjkCharCovered += 1
      else uncoveredChars.push(run[i])
    }
  }

  const total = latinTokens.length + cjkCharTotal
  const hit = matchedLatin.length + cjkCharCovered
  const hitRatio = total === 0 ? 1 : hit / total

  return {
    lowRelevance: hitRatio < threshold,
    hitRatio: Number(hitRatio.toFixed(2)),
    matched: [...new Set([...matchedLatin, ...matchedBigrams])],
    missed: [...new Set([...missedLatin, ...uncoveredChars])],
    total,
    method: 'char-coverage'
  }
}

export default estimateRelevance
