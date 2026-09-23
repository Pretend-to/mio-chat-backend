/**
 * HTML 实体解码工具
 *
 * 背景：搜索引擎返回的 HTML 片段中，摘要（snippet）里普遍含有 HTML 实体，
 * 例如 Bing 的 `2025年9月28日 &#0183; 永（拼音：yǒng）…`、DDG 的 `&ensp;`。
 * 若不还原，这些裸实体会直接进入模型上下文，污染语义并浪费 token。
 *
 * 同时 Bing 使用 `&#0183;`（0x83 控制字符）作为文本分隔符，
 * 解码后属于 C0/C1 控制字符，需要统一替换为可读分隔符。
 */

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  zwnj: '',
  zwj: '',
  middot: '·',
  hellip: '…',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  mdash: '—',
  ndash: '–',
  times: '×',
  deg: '°',
  bull: '•'
}

// C0 / C1 控制字符 + 零宽字符（Bing 的分隔符解码后落在这里）
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200d\ufeff]/g

/**
 * 解码 HTML 实体并归一化空白
 * @param {string} input
 * @returns {string}
 */
export function decodeHtmlEntities(input = '') {
  if (input == null) return ''

  return String(input)
    // 十六进制实体 &#x1F600;
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      const code = parseInt(hex, 16)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    })
    // 十进制实体 &#0183;
    .replace(/&#(\d+);/g, (match, dec) => {
      const code = parseInt(dec, 10)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    })
    // 具名实体 &ensp;
    .replace(/&([a-z][a-z0-9]*);/gi, (match, name) => {
      const hit = NAMED_ENTITIES[name.toLowerCase()]
      return hit === undefined ? match : hit
    })
    // 控制字符 → 分隔符
    .replace(CONTROL_CHARS_RE, ' · ')
    // 去掉残留标签与空白归一
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 仅去除标签，保留实体（用于需要在解码前做结构判断的场景）
 * @param {string} input
 * @returns {string}
 */
export function stripTags(input = '') {
  return String(input ?? '').replace(/<[^>]*>/g, '').trim()
}

export default decodeHtmlEntities
