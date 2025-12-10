import config from '../../../config.js'
import { getIP } from '../../http/utils/getIP.js'

// Socket.io认证函数
export function authSocketConnection(socket, next) {
  const { token, id } = socket.handshake.auth

  if (id == 'undefined') {
    logger.error('Socket.io连接失败: 缺少ID')
    return next(new Error('缺少ID'))
  }

  const authConfig = config.web
  const userToken = process.env.USER_CODE || authConfig.user_code
  const adminToken = process.env.ADMIN_CODE || authConfig.admin_code

  const userInfo = {
    ip: getIP(socket.request),
    origin: getDomain(socket.request.headers.origin),
    id: id,
    isAdmin: false,
  }

  logger.info(
    `Socket.io 链接初始化. IP: ${userInfo.ip}, Origin: ${userInfo.origin}`,
  )

  if (adminToken == token) {
    userInfo.isAdmin = true
  } else if (userToken && token !== userToken) {
    logger.warn(`Socket.io连接失败: 无效token. Token: ${token}`)
    return next(new Error('无效token'))
  }

  logger.mark(
    `Socket.io 认证成功, ${userInfo.isAdmin ? '管理员' : '用户'} ID: ${userInfo.id}`,
  )

  // 将用户信息挂载到 socket 对象上，方便后续使用
  socket.userInfo = userInfo

  return next()
}

// 提取包含协议的域名的函数
// 提取包含协议和端口的域名的函数
function getDomain(url) {
  if (!url) return null
  try {
    const urlObject = new URL(url)
    let domain = urlObject.protocol + '//' + urlObject.hostname
    if (urlObject.port) {
      domain += ':' + urlObject.port
    }
    return domain
  } catch (e) {
    logger.error(`解析URL失败: ${url}, 错误: ${e.message}`)
    return null // 或者返回一个默认值，例如 'unknown'
  }
}
