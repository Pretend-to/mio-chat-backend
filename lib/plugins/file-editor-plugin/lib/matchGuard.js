/**
 * 结构性替换的写盘前自检。
 *
 * 两起真实事故（2026-09-24，见 tool_calls 原始参数）：
 *
 *  1) app.js：`target` 里**没有真换行**，换行被转义成了字面量 `\n`（546 字符、split('\n') 只有 1 行），
 *     而 `replacement` 是 24 行真代码。工具于是把整个多行块当成「一行」去匹配，命中了文件里
 *     一行相似文本并把它换掉 —— 只吃掉一行，原块其余部分留在原地，回执却是
 *     `Block replaced successfully (fuzzy(100%))` + `success: true`，语法直接坏掉。
 *  2) 模糊匹配的窗口和调用方真正想改的块错位（窗口只覆盖上半截 / 打到另一个相似副本上），
 *     替换后原文以「连续若干行」的形式残留在文件里。
 *
 * 所以：**写盘之前**先做这两个纯函数自检，异常一律拒绝写入并报错 —— 宁可报错，
 * 也不要留一个语法坏掉的文件。
 */

const MIN_TARGET_LINES = 3 // 少于 3 行的目标不做「残留」判定（噪音太大）
const MIN_RUN = 2 // 至少连续 2 行才算「原文还在」
const MIN_SIGNIFICANT = 4 // 忽略 `}`, `)`, 空行这类短行

const normLine = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const isSignificant = (line) => line.length >= MIN_SIGNIFICANT

/**
 * 目标块的换行是不是被转义成了字面量 `\n`。
 * 判据：target 没有真换行、但含 `\n`/`\r\n` 字面量；解码后是多行，且其中多数行在文件里逐行存在
 * （说明调用方给的确实就是文件里这个块，只是换行被转义了）。
 * @returns {{escapedLines:number, presentInFile:number, replacementLines:number}|null}
 */
export function detectEscapedNewlineTarget(target, fileContent, replacementText) {
  if (typeof target !== 'string' || target.includes('\n')) {return null}
  if (!/\\r\\n|\\n/.test(target)) {return null}

  const expandedLines = target.replace(/\\r\\n|\\n/g, '\n').split('\n')
  if (expandedLines.length < 3) {return null}

  const fileLines = new Set(String(fileContent ?? '').split('\n').map(normLine))
  const significant = expandedLines.filter((l) => isSignificant(normLine(l)))
  const presentInFile = significant.filter((l) => fileLines.has(normLine(l))).length

  if (presentInFile < 3 || presentInFile * 2 < significant.length) {return null}

  return {
    escapedLines: expandedLines.length,
    presentInFile,
    replacementLines: String(replacementText ?? '').split('\n').length,
  }
}

/** 去掉给定的窗口（[{index,length}]，互不重叠）后剩下的文件内容 */
export function stripWindows(content, windows) {
  const sorted = [...windows].toSorted((a, b) => a.index - b.index)
  const parts = []
  let cursor = 0
  for (const w of sorted) {
    if (w.index < cursor) {continue}
    parts.push(content.slice(cursor, w.index), '\n')
    cursor = w.index + w.length
  }
  parts.push(content.slice(cursor))
  return parts.join('')
}

/**
 * 在「已去掉替换窗口」的正文里，找 target 是否还有连续 ≥2 行残留。
 * @returns {{length:number, targetFrom:number, snippet:string}|null}
 */
export function findResidualRun(restContent, target) {
  const targetLines = String(target ?? '').split('\n').map(normLine)
  if (targetLines.length < MIN_TARGET_LINES) {return null}

  const restLines = String(restContent ?? '').split('\n').map(normLine)

  for (let i = 0; i + 1 < targetLines.length; i++) {
    if (!isSignificant(targetLines[i]) || !isSignificant(targetLines[i + 1])) {continue}
    for (let j = 0; j + 1 < restLines.length; j++) {
      if (restLines[j] !== targetLines[i] || restLines[j + 1] !== targetLines[i + 1]) {continue}
      let length = 2
      while (
        i + length < targetLines.length &&
        j + length < restLines.length &&
        restLines[j + length] === targetLines[i + length]
      ) {
        length++
      }
      if (length >= MIN_RUN) {
        return {
          length,
          snippet: targetLines.slice(i, i + length).join('\n'),
          targetFrom: i,
        }
      }
    }
  }
  return null
}

/** 窗口在文件里的行号范围（1-indexed，闭区间） */
export function windowLineRange(content, index, length) {
  const start = content.slice(0, index).split('\n').length
  const end = content.slice(0, index + length).split('\n').length
  return { end, start }
}

/** 模糊匹配的显式告警（不要再把 `fuzzy(100%)` 混进成功信息里被读成完全匹配） */
export function buildFuzzyNotice(match, closest) {
  if (!match || typeof match.method !== 'string' || !match.method.startsWith('fuzzy')) {return null}
  const score = typeof closest?.bestScore === 'number' && closest.bestScore >= 0 ? closest.bestScore : null
  const pct = score === null ? '' : `（相似度 ${(score * 100).toFixed(1)}%）`
  return {
    match: 'fuzzy',
    similarity: score === null ? undefined : Number(score.toFixed(4)),
    warning:
      `⚠️ 用了模糊匹配，不是精确匹配${pct}：命中的是「最接近」的块，可能不是你想改的那块。` +
      '请核对结果；跨行结构改动建议改用 startLine/endLine 定位。',
  }
}

/**
 * 多行块替换必须落在行边界上：命中位置在行中间，说明匹配到的是一段「前缀/子串」，
 * 替换后那一行会留下残渣（真实事故的同类形态：target \`...const d = 4\` 命中了文件里的
 * \`...const d = 400\`，只吃掉前半截，回执却是 exact/success）。
 */
export function isLineAligned(content, index, length) {
  const beforeOk = index === 0 || content[index - 1] === '\n'
  const end = index + length
  const afterOk = end >= content.length || content[end] === '\n'
  return beforeOk && afterOk
}

export function alignmentError({ filePath, method, index, length, content, label = 'Target' }) {
  const line = content.slice(0, index).split('\n').length
  const column = index - (content.lastIndexOf('\n', index - 1) + 1) + 1
  const hit = content.slice(index, index + length)
  const tail = content.slice(index + length, index + length + 40).split('\n')[0]
  return [
    `${label} matched a \`${method}\` hit that is NOT on line boundaries — 拒绝应用`,
    '（多行块只命中了某一行的一部分，替换后那一行会留下残渣，文件会结构性坏掉）。',
    '',
    `📄 File: ${filePath}`,
    `🎯 命中位置: 第 ${line} 行第 ${column} 列（窗口结尾后面紧跟的是 "${tail}"）`,
    `🩹 命中文本结尾: ...${hit.slice(-40).replace(/\n/g, '\\n')}`,
    '',
    '💡 这是「target 是文件里更长文本的前缀/子串」的典型后果。',
    '   请核对 target（多半少写了几个字符），或改用 startLine/endLine 按行号替换。',
  ].join('\n')
}

export function escapedNewlineError(detail, filePath, label = 'Target') {
  return [
    `${label} has NO real newlines but contains ${detail.escapedLines - 1} literal "\\n" escape(s)`,
    '（换行被转义成了字面量 `\\n`，整个多行块被当成了一行）。',
    '',
    `📄 File: ${filePath}`,
    `🎯 Target: 1 "line" (as sent), ${detail.escapedLines} lines if the escapes are decoded`,
    `🩹 Replacement: ${detail.replacementLines} lines`,
    `🔍 解码后的 ${detail.presentInFile} 行在文件里逐行存在 —— 你要改的多半就是文件里那个块。`,
    '',
    '拒绝应用：把多行块当一行替换只会吃掉一行，剩下的块留在原地，文件会结构性坏掉',
    '（真实事故：app.js 出现 `Identifier … has already been declared`）。',
    '💡 修法：① 重新发送，用真换行而不是 `\\n` 字面量；② 或先 read（raw:true）复制文件里的原文；',
    '   ③ 或直接用 startLine/endLine 按行号替换（跨行大改推荐这个）。',
  ].join('\n')
}

export function residualError(residue, { filePath, method, windowStartLine, windowEndLine, label = 'Target' }) {
  return [
    `${label} still present in the file after the replacement — 疑似「部分应用」`,
    '（只吃掉了一部分，其余原文残留）。已拒绝写入，文件保持原样。',
    '',
    `📄 File: ${filePath}`,
    `🎯 匹配方式: ${method}，替换窗口: 第 ${windowStartLine}-${windowEndLine} 行`,
    `🩹 残留 ${residue.length} 行（目标块的第 ${residue.targetFrom + 1} 行开始）：`,
    ...residue.snippet.split('\n').slice(0, 5).map((l) => `     ${l}`),
    '',
    '💡 这是模糊匹配打到「相似但不同」的块上（或窗口与目标块错位）的典型后果。',
    '   请改用 startLine/endLine 按行号替换，或先 read 拿到文件里的精确原文再替换。',
  ].join('\n')
}
