import crypto from 'node:crypto'

/**
 * IlinkClient — 微信 ClawBot / iLink 协议层客户端（直连，不依赖 OpenClaw）
 *
 * 只负责「跟 ilinkai.weixin.qq.com 说话」：登录、长轮询收消息、发消息、typing、notify。
 * 不涉及任何业务/渠道语义（那些在 WechatChannel.js）。
 *
 * 协议依据参考 channels/wechat/PROTOCOL.md。
 * 支持主动推送（sendMessage），需 24h 内用户主动消息保活；-14 会话过期需重新扫码。
 */
export const DEFAULT_BASE_URL = 'https://ilinkai.weixin.qq.com'
export const ILINK_APP_ID = 'bot' // 腾讯插件包用的 app id（build/分发归属）

const DEFAULT_LONG_POLL_TIMEOUT_MS = 35_000
const DEFAULT_API_TIMEOUT_MS = 15_000
const DEFAULT_CONFIG_TIMEOUT_MS = 10_000

function buildClientVersion(version) {
  const [maj, min, patch] = version.split('.').map((p) => parseInt(p, 10) || 0)
  return String(((maj & 0xff) << 16) | ((min & 0xff) << 8) | (patch & 0xff))
}

/** X-WECHAT-UIN: random uint32 → decimal string → base64（防重放，每请求新值） */
function randomWechatUin() {
  const uint32 = crypto.randomBytes(4).readUInt32BE(0)
  return Buffer.from(String(uint32), 'utf-8').toString('base64')
}

export class IlinkClient {
  /**
   * @param {object} opts
   * @param {string} [opts.baseUrl] 默认 ilinkai.weixin.qq.com
   * @param {string} [opts.token] bot_token（Bearer）
   * @param {string} [opts.botId] ilink_bot_id
   * @param {string} [opts.userId] ilink_user_id（bot 的微信 id）
   * @param {string} [opts.channelVersion] 本实现版本号（用于 base_info.channel_version / ClientVersion）
   */
  constructor({
    baseUrl = DEFAULT_BASE_URL,
    token = null,
    botId = null,
    userId = null,
    channelVersion = '0.1.0',
  } = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, '') + '/'
    this.token = token
    this.botId = botId
    this.userId = userId
    this.channelVersion = channelVersion
    this.botAgent = 'MioChat-iLink'
  }

  get authed() {
    return !!this.token
  }

  /** 写入登录态（扫码成功后） */
  setAuth({ token, botId, userId }) {
    if (token != null) this.token = token
    if (botId != null) this.botId = botId
    if (userId != null) this.userId = userId
    return this
  }

  // ---------------------------------------------------------------
  // 内部 HTTP
  // ---------------------------------------------------------------
  _buildHeaders(token = this.token) {
    const h = {
      'Content-Type': 'application/json',
      AuthorizationType: 'ilink_bot_token',
      'X-WECHAT-UIN': randomWechatUin(),
      'iLink-App-Id': ILINK_APP_ID,
      'iLink-App-ClientVersion': buildClientVersion(this.channelVersion),
    }
    if (token?.trim()) h.Authorization = `Bearer ${token.trim()}`
    return h
  }

  _baseInfo() {
    return { bot_agent: this.botAgent, channel_version: this.channelVersion }
  }

  /**
   * 通用 POST JSON。
   * @returns {Promise<object|null>} 成功返回解析后的对象；超时返回 null（长轮询超时属正常控制流）
   */
  async _post(endpoint, body, { timeoutMs, token = this.token, label = endpoint, signal } = {}) {
    const url = new URL(endpoint, this.baseUrl)
    const controller = new AbortController()
    const timer = timeoutMs != null ? setTimeout(() => controller.abort(), timeoutMs) : null
    const effSignal = signal ? AbortSignal.any([controller.signal, signal]) : controller.signal
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this._buildHeaders(token),
        body: JSON.stringify(body),
        signal: effSignal,
      })
      const text = await res.text()
      if (!res.ok) throw new Error(`${label} ${res.status}: ${text}`)
      return text ? JSON.parse(text) : {}
    } catch (err) {
      if (err?.name === 'AbortError') return null // 超时/外部中止 → 调用方按需处理
      throw err
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  // ---------------------------------------------------------------
  // 登录（二维码）
  // ---------------------------------------------------------------
  /** 获取登录二维码。返回 { qrcode, qrcode_img_content, ... } */
  async getLoginQrCode({ botType = 3 } = {}) {
    const url = new URL(`ilink/bot/get_bot_qrcode?bot_type=${encodeURIComponent(botType)}`, this.baseUrl)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DEFAULT_CONFIG_TIMEOUT_MS)
    try {
      const res = await fetch(url, { headers: this._buildHeaders(), signal: controller.signal })
      if (!res.ok) throw new Error(`get_bot_qrcode ${res.status}`)
      return await res.json()
    } catch (err) {
      if (err?.name === 'AbortError') throw new Error('get_bot_qrcode timeout', { cause: err })
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  /** 轮询扫码状态（长轮询，GET）。status: wait|scaned|confirmed|expired|... confirmed 后取 token */
  async pollQrStatus(qrcode, { verifyCode = null, timeoutMs = DEFAULT_CONFIG_TIMEOUT_MS, signal } = {}) {
    let ep = `ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`
    if (verifyCode) ep += `&verify_code=${encodeURIComponent(verifyCode)}`
    return await this._get(ep, { timeoutMs, signal })
  }

  /** 通用 GET JSON（返回 null 表示超时） */
  async _get(endpoint, { timeoutMs, token = this.token, signal } = {}) {
    const url = new URL(endpoint, this.baseUrl)
    const controller = new AbortController()
    const timer = timeoutMs != null ? setTimeout(() => controller.abort(), timeoutMs) : null
    const effSignal = signal ? AbortSignal.any([controller.signal, signal]) : controller.signal
    try {
      const res = await fetch(url, { headers: this._buildHeaders(token), signal: effSignal })
      const text = await res.text()
      if (!res.ok) throw new Error(`GET ${res.status}: ${text}`)
      return text ? JSON.parse(text) : {}
    } catch (err) {
      if (err?.name === 'AbortError') return null
      throw err
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  // ---------------------------------------------------------------
  // 运行（消息收发 / typing / notify）
  // ---------------------------------------------------------------
  /**
   * 长轮询收消息。
   * @param {string} buff get_updates_buf（上轮返回的游标；首次 ""）
   * @returns {Promise<{ret, msgs, get_updates_buf}>} 超时返回 {ret:0, msgs:[], get_updates_buf: buff}
   */
  async getUpdates(buff = '', { timeoutMs = DEFAULT_LONG_POLL_TIMEOUT_MS, signal } = {}) {
    const raw = await this._post(
      'ilink/bot/getupdates',
      { get_updates_buf: buff ?? '', base_info: this._baseInfo() },
      { timeoutMs, label: 'getUpdates', signal },
    )
    if (raw === null) return { ret: 0, msgs: [], get_updates_buf: buff ?? '' }
    return raw
  }

  /**
   * 发消息。msg 需为 WeixinMessage（发回复必须带回 context_token）。
   * @returns {Promise<object>} { ret, errmsg }
   */
  async sendMessage(msg, { token } = {}) {
    const resp = await this._post(
      'ilink/bot/sendmessage',
      { msg, base_info: this._baseInfo() },
      { label: 'sendMessage', token, timeoutMs: DEFAULT_API_TIMEOUT_MS },
    )
    if (resp && resp.ret && resp.ret !== 0) {
      throw new Error(`sendMessage ret=${resp.ret} errmsg=${resp.errmsg ?? '(none)'}`)
    }
    return resp
  }

  /** 获取配置（typing_ticket） */
  async getConfig({ ilinkUserId = this.userId, contextToken } = {}) {
    if (!ilinkUserId) throw new Error('getConfig requires ilink_user_id')
    return await this._post(
      'ilink/bot/getconfig',
      { ilink_user_id: ilinkUserId, context_token: contextToken, base_info: this._baseInfo() },
      { label: 'getConfig', timeoutMs: DEFAULT_CONFIG_TIMEOUT_MS },
    )
  }

  /** 发送输入状态：status 1=typing 2=cancel */
  async sendTyping({ ilinkUserId = this.userId, typingTicket, status = 1 } = {}) {
    if (!ilinkUserId) throw new Error('sendTyping requires ilink_user_id')
    await this._post(
      'ilink/bot/sendtyping',
      { ilink_user_id: ilinkUserId, typing_ticket: typingTicket, status, base_info: this._baseInfo() },
      { label: 'sendTyping', timeoutMs: DEFAULT_CONFIG_TIMEOUT_MS },
    )
  }

  /** 通知服务器 channel 正在关闭/启动 */
  async notifyStop() {
    return await this._post('ilink/bot/msg/notifystop', { base_info: this._baseInfo() }, { label: 'notifyStop', timeoutMs: DEFAULT_CONFIG_TIMEOUT_MS })
  }
  async notifyStart() {
    return await this._post('ilink/bot/msg/notifystart', { base_info: this._baseInfo() }, { label: 'notifyStart', timeoutMs: DEFAULT_CONFIG_TIMEOUT_MS })
  }
}

export default IlinkClient