import BaseOnebotAdapter from './base.js'
import WebSocket from 'ws'

export default class OnebotWebSocketAdapter extends BaseOnebotAdapter {
  constructor(config) {
    super(config)
    this.ws = null // WebSocket 实例
    this.connected = false // 连接状态
    this.avaliable = false // 可用状态，同时考虑连接状态和 WebSocket 连接状态
    this.connect() // 尝试连接
  }

  connect() {
    const { url, botId, userAgent } = this.config
    logger.info(`正在连接 Onebot 服务: ${url}`)
    this.ws = new WebSocket(url, {
      headers: {
        'User-Agent': userAgent,
        'X-Client-Role': 'Universal',
        'X-Impl': 'Mio-Chat',
        'X-Onebot-Version': '11',
        'X-QQ-Version': 'android 9.0.17',
        'X-Self-ID': botId,
      },
    })

    // 绑定 WebSocket 事件
    this.ws.on('open', this.onConnected.bind(this))
    this.ws.on('error', this.onError.bind(this))
  }

  onConnected() {
    this.connected = true
    this.avaliable = true
    logger.mark('WebSocket 连接成功')
    this.emit('connected')
    // 发送生命周期事件
    this.enableLifecycleEvent()

    // 绑定其他事件
    this.ws.on('message', this.onMessage.bind(this))
    this.ws.on('close', this.onDisconnected.bind(this))
  }

  onMessage(message) {
    try {
      const data = JSON.parse(message)
      logger.json(data)
      this.handleEvent(data)
    } catch (error) {
      console.error('解析数据失败:', error)
    }
  }

  onError(e) {
    logger.error('WebSocket 连接出错\n' + e)
  }

  onDisconnected(code, reason) {
    this.connected = false
    this.avaliable = false
    logger.warn(`WebSocket 连接关闭，代码：${code}, 原因: ${reason}。`)
    // 延迟后尝试重连
    setTimeout(() => {
      logger.warn('正在尝试重连...')
      this.connect()
    }, 3000) // 3 秒后重连
  }

  sendMessage(message) {
    // 只有在处于连接状态且 ws.readyState 为 OPEN 时才发送消息
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      logger.warn('无法发送消息，当前WebSocket未连接')
    }
  }

  // 实现 isAvaliable 方法
  isAvaliable() {
    return this.avaliable && this.ws && this.ws.readyState === WebSocket.OPEN
  }
}