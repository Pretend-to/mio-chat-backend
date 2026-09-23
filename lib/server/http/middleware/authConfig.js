import config from '../../../config.js'

export function isConfigAPIAdmin(req) {
  const adminCode = process.env.ADMIN_CODE || config.web?.admin_code
  if (!adminCode) return true
  const providedCode =
    req.headers['x-admin-code'] || req.query.admin_code || req.body?.admin_code
  return providedCode === adminCode
}

/**
 * 配置管理API身份验证中间件
 * 验证请求头中的admin_code是否匹配
 */
export function authConfigAPI(req, res, next) {
  if (isConfigAPIAdmin(req)) {
    req.isConfigAdmin = true
    return next()
  }
  return res.status(403).json({
    error: '访问被拒绝',
    message: '需要提供有效的管理员验证码',
  })
}
