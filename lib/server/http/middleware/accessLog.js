import { getIP } from '../utils/getIP.js'

// 静默高频轮询与静态资源请求，避免刷屏淹没关键业务日志
const SILENT_PATHS = [
  '/p/mava',
  '/p/ava',
  '/p/qava',
  '/favicon.ico',
  '/assets/',
  '/api/health',
  '/api/admin/dashboard/realtime',
  '/api/admin/dashboard',
]

const SILENT_PATTERNS = [
  /\/api\/channels\/[^/]+\/poll/, // 微信扫码长轮询
  /\/api\/images\/tasks\/[^/]+/,   // 生图状态轮询
]

export function accessLogger(req, res, next) {
  const url = req.originalUrl || req.url || ''
  const isSilent = SILENT_PATHS.some((p) => url.startsWith(p)) || SILENT_PATTERNS.some((re) => re.test(url))
  const startTime = process.hrtime.bigint()
  let logged = false

  const logRequest = (aborted = false) => {
    if (logged) return
    logged = true

    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6
    const message = `${req.method} ${url} ${durationMs.toFixed(1)}ms${aborted ? ' (aborted)' : ''}`
    const metadata = { ip: getIP(req) }

    if (isSilent) {
      logger.debug(message, metadata)
    } else {
      logger.info(message, metadata)
    }
  }

  res.once('finish', () => logRequest())
  res.once('close', () => {
    if (!res.writableFinished) logRequest(true)
  })

  next()
}
