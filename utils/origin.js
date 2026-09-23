import config from '../lib/config.js'

/**
 * 获取本地服务的兜底 Origin
 * @returns {string} e.g. "http://localhost:3080"
 */
export function getFallbackOrigin() {
  const port =
    config.server?.port ||
    (process.env.PORT ? parseInt(process.env.PORT, 10) : 3080)
  return `http://localhost:${port}`
}

/**
 * 校验是否为合法的 HTTP(S) URL
 * @param {string} str
 * @returns {boolean}
 */
export function isValidHttpUrl(str) {
  if (!str || typeof str !== 'string') return false
  const trimmed = str.trim()
  return trimmed.startsWith('http://') || trimmed.startsWith('https://')
}

/**
 * 解析出有效的访问 Origin。如果 candidate 不合法或为内部标记（如 'web', 'channel'），自动使用 localhost 兜底。
 * @param {string|null|undefined} candidate
 * @returns {string} e.g. "https://example.com" 或 "http://localhost:3080"
 */
export function resolveOrigin(candidate) {
  if (isValidHttpUrl(candidate)) {
    return candidate.trim().replace(/\/+$/, '')
  }
  return getFallbackOrigin()
}

/**
 * 格式化资源 URL。若已经是绝对路径则直接返回，否则使用 baseOrigin 安全拼接。
 * @param {string} baseUrl
 * @param {string} assetPath
 * @returns {string}
 */
export function formatAssetUrl(baseUrl, assetPath) {
  if (!assetPath) return ''
  if (isValidHttpUrl(assetPath)) return assetPath
  const origin = resolveOrigin(baseUrl)
  const cleanPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`
  return `${origin}${cleanPath}`
}
