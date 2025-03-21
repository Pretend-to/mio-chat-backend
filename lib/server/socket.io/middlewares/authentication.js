import config from '../../../config.js'
import { getIP } from '../../http/utils/getIP.js'

// // WebSocket认证函数
// export function authWsConnection(request) {
//   logger.debug(`认证WebSocket连接. URL: ${request.url}`)
//   const params = new URLSearchParams(request.url.split('?')[1])
//   const token = params.get('mio-chat-token')
//   const id = params.get('mio-chat-id')
    
//   if (id == 'undefined') {
//     logger.error('WebSocket连接失败: 缺少ID')
//     throw new Error('缺少ID')
//   }
    
//   const authConfig = config.web
//   const userToken = authConfig.user_code
//   const adminToken = authConfig.admin_code
    
//   const userInfo = {
//     ip: getIP(request),
//     origin: request.headers.origin,
//     id: id,
//     isAdmin: false,
//   }
    
//   logger.debug(`WebSocket userInfo初始化. IP: ${userInfo.ip}, Origin: ${userInfo.origin}, ID: ${userInfo.id}`)
    
//   if (adminToken == token) {
//     userInfo.isAdmin = true
//     logger.debug('WebSocket连接: 用户是管理员.')
//   } else if (userToken && token !== userToken) {
//     logger.warn(`WebSocket连接失败: 无效token. Token: ${token}`)
//     throw new Error('无效token')
//   }
    
//   logger.info(`WebSocket已认证, 用户ID: ${userInfo.id}, isAdmin: ${userInfo.isAdmin}`)
//   return userInfo
// }

// Socket.io认证函数
export function authSocketConnection(socket, next) {
  logger.debug('认证Socket.io连接.')

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

  logger.debug(`Socket.io userInfo初始化. IP: ${userInfo.ip}, Origin: ${userInfo.origin}, ID: ${userInfo.id}`)

  if (adminToken == token) {
    userInfo.isAdmin = true
    logger.debug('Socket.io连接: 用户是管理员.')
  } else if (userToken && token !== userToken) {
    logger.warn(`Socket.io连接失败: 无效token. Token: ${token}`)
    return next(new Error('无效token'))
  }

  logger.info(`Socket.io已认证, 用户ID: ${userInfo.id}, isAdmin: ${userInfo.isAdmin}`)
  // 将用户信息挂载到 socket 对象上，方便后续使用
  socket.userInfo = userInfo
  return next()
}