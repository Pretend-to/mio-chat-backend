import sessions from '../services/sessions.js'
import loader from '../services/loader.js'
import config from '../../../config.js'
import logStreamController from './logStream.js'
import logStreamService from '../services/logStream.js'
import logger from '../../../../utils/logger.js'

const adminId = config.onebot.admin_qq

const ACTIONS_TO_BOARDCAST = ['delete_msg']

/**
 * Handles a PubOnebot message, routing it to the appropriate client(s) and marking it as processed.
 * @param {object} event - The Onebot message event to handle.
 */
export async function handlePubOnebotMessage(event) {
  const { action, receiverId } = processOnebotMessage(event)
  const isAdmin = adminId === receiverId
  let clients
  if (ACTIONS_TO_BOARDCAST.includes(action)) {
    clients = sessions.getAllClients()
  } else if (!isAdmin) {
    clients = sessions.getClientsByUserId(receiverId) || []
  } else {
    clients = sessions.getAllAdminClients()
  }

  // Iterate through the determined clients and handle the event.
  for (const client of clients) {
    try {
      await client.handleOnebotEvent(event)
    } catch (error) {
      console.error('Error handling Onebot event:', error)
      // Consider error handling strategies, e.g., retry, logging, etc.
    }
  }
}

export function setClientMessageHandler(type, handler) {
  if (type === 'onebot') {
    loader.initClientMessageHandler('onebot', handler)
  } else if (type === 'llm') {
    loader.initClientMessageHandler('llm', handler)
  }
}

/**
 * 处理日志协议消息
 * @param {Object} socket - Socket.IO socket 实例
 * @param {Object} message - 消息对象
 */
export function handleLogMessage(socket, message) {
  try {
    const { type, data, request_id } = message

    switch (type) {
      case 'subscribe':
        logStreamController.handleLogSubscription(socket, data, request_id)
        break

      case 'unsubscribe':
        logStreamController.handleLogUnsubscription(socket, data, request_id)
        break

      case 'search':
        logStreamController.handleLogSearch(socket, data, request_id)
        break

      case 'export':
        logStreamController.handleLogExport(socket, data, request_id)
        break

      case 'config':
        logStreamController.handleConfigUpdate(socket, data, request_id)
        break

      case 'stats':
        logStreamController.handleGetLogStats(socket, data, request_id)
        break

      case 'heartbeat':
        // 更新心跳时间
        const clientId = socket.userInfo?.id || socket.id
        logStreamService.updateHeartbeat(clientId)
        
        // 发送心跳响应
        const heartbeatResponse = {
          request_id: request_id,
          protocol: 'logs',
          type: 'heartbeat',
          success: true,
          data: {
            timestamp: Date.now(),
            clientId: clientId
          }
        }
        socket.emit('message', JSON.stringify(heartbeatResponse))
        break

      default:
        // 发送未知类型错误
        const errorResponse = {
          request_id: request_id,
          protocol: 'logs',
          type: 'ERROR',
          success: false,
          error: {
            code: 'UNKNOWN_TYPE',
            message: `未知的日志消息类型: ${type}`
          }
        }
        socket.emit('message', JSON.stringify(errorResponse))
        break
    }

  } catch (error) {
    logger.error('处理日志消息失败', error, { 
      messageType: message?.type,
      clientId: socket.userInfo?.id || socket.id 
    })

    // 发送内部错误响应
    const errorResponse = {
      request_id: message?.request_id || 'unknown',
      protocol: 'logs',
      type: 'ERROR',
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '消息处理失败'
      }
    }
    socket.emit('message', JSON.stringify(errorResponse))
  }
}

function processOnebotMessage(event) {
  const message = event.params.message
  const messageId = event.params.message_id
  const action = event.action
  // TODO: 适配群聊，暂时以单聊处理
  const receiverId = event.params.group_id || event.params.user_id

  return {
    message,
    action,
    receiverId,
    messageId,
  }
}
