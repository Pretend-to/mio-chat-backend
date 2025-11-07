import sessions from '../services/sessions.js'
import loader from '../services/loader.js'
import config from '../../../config.js'

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
