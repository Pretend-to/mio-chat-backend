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
  const userToken = authConfig.user_code
  const adminToken = authConfig.admin_code

  const userInfo = {
    ip: getIP(socket.request),
    origin: socket.request.headers.origin ||  socket.request.headers.referer,
    id: id,
    isAdmin: false,
  }

  logger.info(`Socket.io 链接初始化. IP: ${userInfo.ip}, Origin: ${userInfo.origin}`)

  if (adminToken == token) {
    userInfo.isAdmin = true
  } else if (userToken && token !== userToken) {
    logger.warn(`Socket.io连接失败: 无效token. Token: ${token}`)
    return next(new Error('无效token'))
  }

  logger.mark(`Socket.io 认证成功, ${userInfo.isAdmin ? '管理员' : '用户' } ID: ${userInfo.id}`)
  // 将用户信息挂载到 socket 对象上，方便后续使用
  socket.userInfo = userInfo
  return next()
}