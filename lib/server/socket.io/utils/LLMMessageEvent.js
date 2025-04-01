export default class LLMMessageEvent {
  constructor(req, client) {
    this.body = req.data

    this.metaData = req.data.metaData || {}

    this.requestId = req.request_id

    const { id, ip, isAdmin, origin } = client

    this.user = { id, ip, isAdmin, origin }

    this.client = client
  }

  pending() {
    logger.debug('LLM Message pending')
    this.res('pending')
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
    this.res('failed', error.message)
  }
  res(type, data) {
    let fullData = {
      metaData: this.metaData,
    };
  
    if (typeof data === 'string') {
      fullData.message = data;
    } else if (typeof data === 'object' && data !== null) {
      fullData = { ...data, metaData: this.metaData };
    } else {
      console.warn("Unexpected data type:", typeof data, data); // 记录警告
    }
  
    this.client.sendOpenaiMessage(type, fullData, this.requestId);
  }
}
