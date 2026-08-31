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

export class WakeProtocol {
  /**
   * 解析标准输出内容，提取 @WAKE@ 契约行
   * @param {string} stdout - 子进程的完整标准输出
   * @returns {{ wake: boolean, reason?: string, data?: any, error?: string, rawLine?: string }}
   */
  static parseWakeLine(stdout) {
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
      return { error: 'Empty payload after @WAKE@', rawLine: lastWakeLine, wake: false }
    }

    try {
      const parsed = JSON.parse(jsonStr)
      const wake = Boolean(parsed.wake)
      const reason = typeof parsed.reason === 'string' ? parsed.reason : ''
      const data = parsed.data !== undefined ? parsed.data : null

      return {
        data,
        rawLine: lastWakeLine,
        reason,
        wake,
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
  static formatWakeLine(payload = {}) {
    return `${WAKE_PREFIX} ${JSON.stringify({
      data: payload.data ?? null,
      reason: payload.reason ?? '',
      wake: Boolean(payload.wake),
    })}`
  }
}
