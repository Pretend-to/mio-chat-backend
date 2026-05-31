/**
 * sh 命令行安全校验模块
 */

/**
 * 校验命令是否命中白名单规则
 * 
 * @param {string} command 待执行命令
 * @param {string} whitelistStr 白名单规则字符串（逗号或换行分隔）
 * @returns {boolean} 是否命中白名单
 */
export function isCommandWhitelisted(command, whitelistStr) {
  if (!command || !whitelistStr || !whitelistStr.trim()) {
    return false
  }

  const cmdTrimmed = command.trim()
  const rules = whitelistStr.split(/[\n,]+/).map(r => r.trim()).filter(Boolean)

  for (const rule of rules) {
    if (rule.startsWith('/') && rule.endsWith('/')) {
      // 正则表达式匹配
      try {
        const regex = new RegExp(rule.slice(1, -1))
        if (regex.test(cmdTrimmed)) {
          return true
        }
      } catch (err) {
        if (global.logger) {
          global.logger.error(`[shSecurity] 无效的白名单正则表达式: ${rule}`, err.message)
        } else {
          console.error(`[shSecurity] 无效的白名单正则表达式: ${rule}`, err.message)
        }
      }
    } else {
      // 全等或前缀匹配
      if (cmdTrimmed === rule || cmdTrimmed.startsWith(rule)) {
        return true
      }
    }
  }

  return false
}
