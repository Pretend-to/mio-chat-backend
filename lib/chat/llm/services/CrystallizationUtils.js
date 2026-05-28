// 分区 XML 结晶的标签名
export const CRYSTAL_TAGS = [
  'long_term_profile',
  'short_term_goals',
  'current_plan',
  'file_architecture_delta',
  'constraints',
]

/**
 * 往指定 XML 分区中追加记忆 facts 的工具函数
 */
export function appendToXmlZone(xmlStr, tagName, content) {
  const openTag = `<${tagName}>`
  const closeTag = `</${tagName}>`
  const str = xmlStr || ''
  if (str.includes(openTag)) {
    return str.replace(closeTag, `\n${content}\n${closeTag}`)
  }
  return str + `\n${openTag}\n${content}\n${closeTag}`
}

/**
 * 解析 XML 分区
 */
export function parseXmlZones(xmlStr) {
  const result = {}
  CRYSTAL_TAGS.forEach(key => {
    const openTag = `<${key}>`
    const closeTag = `</${key}>`
    const startIdx = xmlStr ? xmlStr.indexOf(openTag) : -1
    const endIdx = xmlStr ? xmlStr.indexOf(closeTag) : -1
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      result[key] = xmlStr.slice(startIdx + openTag.length, endIdx).trim()
    } else {
      result[key] = ''
    }
  })
  return result
}

/**
 * 重组 XML 分区
 */
export function buildXmlFromZones(zones) {
  return CRYSTAL_TAGS.map(key => {
    const content = (zones[key] || '').trim()
    return `<${key}>\n${content}\n</${key}>`
  }).join('\n\n')
}
