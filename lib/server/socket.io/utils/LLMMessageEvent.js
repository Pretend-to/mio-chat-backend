export default class LLMMessageEvent {
  constructor(req, client) {
    this.body = req.data
    this.requestId = req.request_id

    const { id, ip, isAdmin, origin } = client

    this.user = { id, ip, isAdmin, origin }

    this.server = client
  }

  pending() {
    logger.debug('LLM Message pending')
    this.send('pending')
  }

  update(chunk) {
    // logger.debug('openaiMessage update')
    this.res('update', chunk)
  }
  complete() {
    logger.debug('LLM Message complete')
    this.res('complete')
  }
  reply(chunk) {
    this.res('reply', chunk)
  }
  error(error) {
    logger.error(error)
    this.res('failed', error)
  }
  res(type, data) {
    this.server.sendOpenaiMessage(type, data, this.requestId)
  }
}
