import config from '../../../config.js'

/**
 * 配置管理API身份验证中间件
 * 验证请求头中的admin_code是否匹配
 */
export function authConfigAPI(req, res, next) {
  const adminCode = config.web?.admin_code

  // 如果没有设置admin_code，则允许访问（开发模式）
  if (!adminCode) {
    return next()
  }

  // 从请求头或查询参数获取验证码
  const providedCode =
    req.headers['x-admin-code'] || req.query.admin_code || req.body?.admin_code

  if (providedCode !== adminCode) {
    return res.status(403).json({
      error: '访问被拒绝',
      message: '需要提供有效的管理员验证码',
    })
  }

  next()
}
