import BaseOnebotAdapter from './base.js'
import WebSocket from 'ws'

/**
 * OneBot 应用端（go-cqhttp / NapCat / Lagrange 等）的 WebSocket 连接适配器。
 *
 * 生命周期只有两个入口：connect() 与 close()。
 * - 重连由单一定时器（retryTimer）驱动，不会出现 error + close 双份重连；
 * - connect() 会先销毁旧 socket，避免改配置重启时连接泄漏；
 * - close() 之后彻底停止（stopped 置位），不会再偷偷重连；
 * - getStatus() 暴露"是否尝试过、结果如何"，供状态接口与设置页展示。
 */
export default class OnebotWebSocketAdapter extends BaseOnebotAdapter {
  constructor(config) {
    super(config)
    this.ws = null
    this.available = false
    this.stopped = false
    this.retryTimer = null
    this.reconnectDelay =
      config.reconnectDelay ?? BaseOnebotAdapter.RECONNECT_DELAY
    this.attemptCount = 0
    this.lastAttemptAt = null
    this.lastAttemptSource = null
    this.lastError = null
    this.connectedAt = null
    this.connect('initial')
  }

  /** 当前连接快照（状态接口 / 设置页展示用） */
  getStatus() {
    return {
      attemptCount: this.attemptCount,
      connected: this.connected,
      connectedAt: this.connectedAt,
      lastAttemptAt: this.lastAttemptAt,
      lastAttemptSource: this.lastAttemptSource,
      lastError: this.lastError,
      readyState: this.ws ? this.ws.readyState : null,
      reconnecting: Boolean(this.retryTimer),
      stopped: this.stopped,
      url: this.config.url,
    }
  }

  connect(source = 'manual') {
    if (this.stopped) return

    // 先停心跳：否则重建连接时 enableLifecycleEvent 会覆盖旧句柄，旧 interval 永久泄漏
    this.disableLifecycleEvent()
    this._disposeSocket()
    clearTimeout(this.retryTimer)
    this.retryTimer = null

    this.attemptCount += 1
    this.lastAttemptAt = Date.now()
    this.lastAttemptSource = source
    this.lastError = null

    const { url, botId, userAgent, token } = this.config
    logger.info(
      `[OneBot] 第 ${this.attemptCount} 次连接尝试 (${source}): ${url}`,
    )

    const ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': userAgent,
        'X-Client-Role': 'Universal',
        'X-Impl': 'Mio-Chat',
        'X-Onebot-Version': '11',
        'X-QQ-Version': 'android 9.0.17',
        'X-Self-ID': botId,
      },
    })
    this.ws = ws
    ws.on('open', () => this.onConnected())
    ws.on('error', (e) => this.onError(e))
  }

  onConnected() {
    if (!this.ws) return
    this.connected = true
    this.available = true
    this.lastError = null
    this.connectedAt = Date.now()
    logger.mark(`[OneBot] WebSocket 连接成功: ${this.config.url}`)
    this.emit('connected')
    this.enableLifecycleEvent()

    this.ws.on('message', (message) => this.onMessage(message))
    this.ws.on('close', (code, reason) => this.onDisconnected(code, reason))
  }

  onMessage(message) {
    try {
      this.handleEvent(JSON.parse(message))
    } catch (error) {
      logger.error('[OneBot] 解析事件失败', error)
    }
  }

  onError(e) {
    this.lastError = e?.message || String(e)
    logger.error(`[OneBot] 连接出错: ${this.lastError}`)
    this._scheduleReconnect('连接出错')
  }

  onDisconnected(code, reason) {
    this.connected = false
    this.available = false
    this.connectedAt = null
    this.disableLifecycleEvent()
    logger.warn(
      `[OneBot] 连接关闭 code=${code} reason=${reason?.toString() || '-'}`,
    )
    this._scheduleReconnect('连接关闭')
  }

  _scheduleReconnect(reason) {
    if (this.stopped || this.retryTimer) return
    logger.warn(`[OneBot] ${reason}，${this.reconnectDelay / 1000}s 后重连`)
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.connect('retry')
    }, this.reconnectDelay)
  }

  _disposeSocket() {
    const ws = this.ws
    this.ws = null
    if (!ws) return
    // 先摘监听：避免旧 socket 的 close/error 再触发一次重连；
    // 但必须留一个吞异常的空 handler —— CONNECTING 阶段 close() 会 emit 'error'，
    // 没有监听者时 Node 会把它升级为 uncaughtException。
    ws.removeAllListeners()
    ws.on('error', () => {})
    try {
      ws.close()
    } catch {
      // 关闭旧连接失败无所谓，引用已释放
    }
  }

  /** 停止连接并禁止自动重连（改配置重启 / 停机时调用） */
  close() {
    this.stopped = true
    clearTimeout(this.retryTimer)
    this.retryTimer = null
    this.disableLifecycleEvent()
    this._disposeSocket()
    this.connected = false
    this.available = false
  }

  sendMessage(message) {
    if (this.isAvaliable()) {
      this.ws.send(JSON.stringify(message))
    } else {
      logger.warn('[OneBot] 无法发送消息，当前 WebSocket 未连接')
    }
  }

  isAvaliable() {
    return this.available && this.ws?.readyState === WebSocket.OPEN
  }
}
