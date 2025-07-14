import Client from '../services/client.js'
import sessions from '../services/sessions.js'
import loader from '../services/loader.js'

export function handleConnection(socket) {
  try {
    const baseInfo = socket.userInfo

    const client = new Client(baseInfo, socket)
    sessions.addSession(client)

    loader.initClient(client, (client) => {
      sessions.removeSession(client)
    })
  } catch (error) {
    logger.error(error)
  }
}
