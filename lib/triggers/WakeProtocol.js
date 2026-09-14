/**
 * WakeProtocol.js — stdio 契约解析器（语言无关）
 *
 * 协议规范（docs/architecture/trigger-system.md §4）：
 * 哨兵脚本在 stdout 中输出标志行：
 *   @WAKE@ {"wake": true, "reason": "BTC 突破 78400", "data": {"price": 78412}}
 *
 * 解析规则：
 * 逐行扫描 stdout，取最后一条 @WAKE@ 前缀行。其后必须为合法 JSON。
 * 无标志行 = wake: false
 * JSON 非法 = wake: false + error
 */

export const WAKE_PREFIX = '@WAKE@'
export const MAX_REASON_BYTES = 2 * 1024
export const MAX_DATA_BYTES = 16 * 1024

/**
 * 解析标准输出内容，提取 @WAKE@ 契约行
 * @param {string} stdout - 子进程的完整标准输出
 * @returns {{ wake: boolean, reason?: string, data?: any, error?: string, rawLine?: string }}
 */
export function parseWakeLine(stdout) {
  if (!stdout || typeof stdout !== 'string') {
    return { wake: false }
  }

  const lines = stdout.split(/\r?\n/)
  let lastWakeLine = null

  // 逆序查找最后一条 @WAKE@ 行
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim()
    if (line.startsWith(WAKE_PREFIX)) {
      lastWakeLine = line
      break
    }
  }

  if (!lastWakeLine) {
    return { wake: false }
  }

  const jsonStr = lastWakeLine.slice(WAKE_PREFIX.length).trim()
  if (!jsonStr) {
    return {
      error: 'Empty payload after @WAKE@',
      rawLine: lastWakeLine,
      wake: false,
    }
  }

  try {
    const parsed = JSON.parse(jsonStr)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Payload must be a JSON object')
    }
    if (typeof parsed.wake !== 'boolean') {
      throw new Error('Payload field "wake" must be boolean')
    }

    const reason = parsed.reason === undefined ? '' : parsed.reason
    if (typeof reason !== 'string') {
      throw new Error('Payload field "reason" must be string')
    }
    if (Buffer.byteLength(reason, 'utf8') > MAX_REASON_BYTES) {
      throw new Error(`Payload field "reason" exceeds ${MAX_REASON_BYTES} bytes`)
    }

    let data = null
    if (parsed.data !== undefined && parsed.data !== null) {
      if (typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
        throw new Error('Payload field "data" must be an object')
      }
      if (Buffer.byteLength(JSON.stringify(parsed.data), 'utf8') > MAX_DATA_BYTES) {
        throw new Error(`Payload field "data" exceeds ${MAX_DATA_BYTES} bytes`)
      }
      data = parsed.data
    }

    return {
      data,
      rawLine: lastWakeLine,
      reason,
      source:
        typeof parsed.source === 'string' ? parsed.source.slice(0, 128) : undefined,
      firedAt:
        typeof parsed.firedAt === 'string' ? parsed.firedAt : undefined,
      wake: parsed.wake,
    }
  } catch (err) {
    return {
      error: `JSON parse error in @WAKE@ line: ${err.message}`,
      rawLine: lastWakeLine,
      wake: false,
    }
  }
}

/**
 * 构造标准 @WAKE@ 契约行（用于测试或脚本辅助输出）
 * @param {{ wake: boolean, reason?: string, data?: any }} payload
 * @returns {string}
 */
export function formatWakeLine(payload = {}) {
  return `${WAKE_PREFIX} ${JSON.stringify({
    data: payload.data ?? null,
    reason: payload.reason ?? '',
    wake: Boolean(payload.wake),
  })}`
}

export const WakeProtocol = {
  formatWakeLine,
  parseWakeLine,
}
export default WakeProtocol
