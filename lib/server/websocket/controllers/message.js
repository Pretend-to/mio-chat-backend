import sessions from '../services/sessions.js'
import loader from '../services/loader.js'

const ACTIONS_TO_BOARDCAST = ['delete_msg']

export function handlePubOnebotMessage(event) {
  const { message, action, receiverId } = processOnebotMessage(event)
  if (ACTIONS_TO_BOARDCAST.includes(action)) {
    const clients = sessions.getAllClients()
    clients.forEach((client) => {
      client.handleOnebotEvent(message)
    }) 
  } else {
    const client = sessions.getClientByUserId(receiverId)
    if(client) client.handleOnebotEvent(message)
  }
}

export function setClientMessageHandler(type, handler) {
  if(type === 'onebot') {
    loader.initClientMessageHandler('onebot', handler)
  }else if(type === 'llm') {
    loader.initClientMessageHandler('llm', handler)
  } 
}

function processOnebotMessage(event){
  const message = event.params
  const action = event.action
  // TODO: 适配群聊，暂时以单聊处理
  const receiverId = event.group_id || event.user_id

  return {
    message,
    action,
    receiverId
  }
}