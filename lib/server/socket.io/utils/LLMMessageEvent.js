export default class LLMMessageEvent {
  constructor(req, client) {
    this.body = req.data

    this.metaData = req.metaData || {}

    this.requestId = req.request_id

    this._everUpdate = false

    const { id, ip, isAdmin, origin } = client

    this.user = { id, ip, isAdmin, origin }

    this.client = client
  }

  pending() {
    logger.debug('LLM Message pending')
    this.res('pending', {})
  }

  update(chunk) {
    if (!this._everUpdate) {
      this._everUpdate = true
    }
    // logger.debug('openaiMessage update')
    this.res('update', chunk)
  }
  complete() {
    if (!this._everUpdate) {
      const Tip = '模型无响应，请检查输入是否合法！'
      this.update({
        type: 'content',
        content: Tip,
      })
    }
    logger.debug('LLM Message complete')
    this.res('complete', {})
  }
  reply(chunk) {
    this.res('reply', chunk)
  }
  error(error) {
    logger.error(error)
    // 删掉错误信息中的堆栈信息
    if (error && error.stack) {
      delete error.stack
    }
    // 看看message是否是对象，如果是对象，序列化一下
    try {
      const errorObject = JSON.parse(error.message)
      error.message = errorObject
    } catch (e) {
      // pass
    }
    // 把Error对象转换成普通对象
    const errorObject = {
      message: error.message || '未知错误',
      ...error, // 复制其他属性
    }
    this.res('failed', errorObject)
  }

  res(type, data) {
    let fullData = {
      metaData: this.metaData,
    }

    if (typeof data === 'string') {
      fullData.message = data
    } else if (typeof data === 'object' && data !== null) {
      fullData = { ...data, metaData: this.metaData }
    } else {
      console.warn('Unexpected data type:', typeof data, data) // 记录警告
    }

    this.client.sendOpenaiMessage(type, fullData, this.requestId)
  }
}
