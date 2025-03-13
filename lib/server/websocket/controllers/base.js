import { authWsConnection } from '../middlewares/authentication.js'
import Client from '../services/client.js'
import sessions from '../services/sessions.js'
import loader from '../services/loader.js'

export function handleConnection(ws, req) {
  try {
    const baseInfo = authWsConnection(req)
    if (!baseInfo) {
      ws.close()
      return
    } else {
      const client = new Client(ws, baseInfo)
      sessions.addSession(client)

      loader.initClient(client, (client) =>{
        sessions.removeSession(client)
      })

    }
  } catch (error) {
    logger.error(error)
  }
}