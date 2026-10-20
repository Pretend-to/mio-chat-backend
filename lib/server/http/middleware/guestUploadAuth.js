import crypto from 'crypto'
import config from '../../../config.js'

/**
 * 上传授权与限流中间件（三档：admin / user / guest）
 *  - admin：x-admin-code / admin_code 命中 → 不计限流，类型不限制（控制器侧再控大小）
 *  - user ：x-user-code / user_code 命中（与 socket 鉴权同源，复用 config.web.user_code）
 *           → 不计游客限流，放开代码/文本类上传
 *  - guest：其余 → Cookie + IP + 指纹 组合，走次数与总量限流
 * 判定结果写入 req.uploadTier，供控制器读取分级白名单与大小上限。
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
  const providedAdmin =
    req.headers['x-admin-code'] || req.query.admin_code || req.body?.admin_code

  if (adminCode && providedAdmin === adminCode) {
    req.uploadTier = 'admin'
    return next()
  }

  // 2. 已鉴权用户 (user_code)，不计游客限流
  const userCode = process.env.USER_CODE || config.web?.user_code
  const providedUser =
    req.headers['x-user-code'] || req.query.user_code || req.body?.user_code

  if (userCode && providedUser === userCode) {
    req.uploadTier = 'user'
    return next()
  }

  // 3. 识别访客 (Cookie + IP + Fingerprint)
  req.uploadTier = 'guest'
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
  const fingerprint = req.headers['x-browser-fingerprint'] || ''

  let guestId = ''
  const cookieHeader = req.headers.cookie || ''
  const match = cookieHeader.match(/guest_upload_id=([^;]+)/)

  if (match) {
    guestId = match[1]
  } else {
    guestId = crypto.randomUUID()
    res.cookie('guest_upload_id', guestId, { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000, path: '/', sameSite: 'lax' })
  }

  // 组合标识符
  const trackingId = `${guestId}:${ip}:${fingerprint}`

  // 4. 限流逻辑 (每小时 50 次上传)
  const now = Date.now()
  const record = rateLimitMap.get(trackingId) || { count: 0, timestamp: now, totalSize: 0 }

  if (now - record.timestamp > 3600 * 1000) {
    record.count = 0
    record.totalSize = 0
    record.timestamp = now
  }

  if (record.count >= 50) {
    return res.status(429).json({
      code: 1,
      data: null,
      message: '上传次数过多，请一小时后再试'
    })
  }

  req.guestRecord = record
  req.trackingId = trackingId

  // 增加计数
  record.count += 1
  rateLimitMap.set(trackingId, record)

  next()
}
