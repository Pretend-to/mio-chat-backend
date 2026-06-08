import crypto from 'crypto'
import config from '../../../config.js'

/**
 * 游客上传授权与限流中间件
 */
const rateLimitMap = new Map()

// 每小时清理一次过期的记录
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now - value.timestamp > 3600 * 1000) {
      rateLimitMap.delete(key)
    }
  }
}, 600 * 1000) // 每10分钟检查一次

export function guestUploadAuth(req, res, next) {
  // 1. 管理员优先 (不计入限流)
  const adminCode = process.env.ADMIN_CODE || config.web?.admin_code
  const providedCode = req.headers['x-admin-code'] || req.query.admin_code || req.body?.admin_code
  
  if (adminCode && providedCode === adminCode) {
    return next()
  }

  // 2. 识别访客 (Cookie + IP + Fingerprint)
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
  const fingerprint = req.headers['x-browser-fingerprint'] || ''
  
  let guestId = ''
  const cookieHeader = req.headers.cookie || ''
  const match = cookieHeader.match(/guest_upload_id=([^;]+)/)
  
  if (match) {
    guestId = match[1]
  } else {
    guestId = crypto.randomUUID()
    res.cookie('guest_upload_id', guestId, { maxAge: 30 * 24 * 3600 * 1000, httpOnly: true, path: '/', sameSite: 'lax' })
  }

  // 组合标识符
  const trackingId = `${guestId}:${ip}:${fingerprint}`

  // 3. 限流逻辑 (每小时 50 次上传)
  const now = Date.now()
  const record = rateLimitMap.get(trackingId) || { count: 0, totalSize: 0, timestamp: now }
  
  if (now - record.timestamp > 3600 * 1000) {
    record.count = 0
    record.totalSize = 0
    record.timestamp = now
  }

  if (record.count >= 50) {
    return res.status(429).json({
      code: 1,
      message: '上传次数过多，请一小时后再试',
      data: null
    })
  }

  req.guestRecord = record
  req.trackingId = trackingId

  // 增加计数
  record.count += 1
  rateLimitMap.set(trackingId, record)

  next()
}
