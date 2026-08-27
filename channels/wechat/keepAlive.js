/**
 * WeChat 24h 窗口保活管理器
 */

export class KeepAliveManager {
  /**
   * @param {object} opts
   * @param {import('../wechat/IlinkClient.js').IlinkClient} opts.client
   * @param {import('../memory/MemoryStore.js').MemoryStore} opts.memory
   * @param {string} opts.masterId
   * @param {object} [opts.config]
   */
  constructor({ client, memory, masterId, config = {}, logger = console }) {
    this.client = client
    this.memory = memory
    this.masterId = masterId
    this.log = logger
    this.enabled = config.enabled ?? true
    this.userTimeoutMs = config.userTimeoutMs ?? 24 * 60 * 60 * 1000 // 24h
    this.remindBeforeMs = config.remindBeforeMs ?? 60 * 60 * 1000 // 到期前 1h 提醒
    this.checkEveryMs = config.checkEveryMs ?? 5 * 60 * 1000
    this.remindText = config.remindText ?? '你有一阵没跟我说话啦～微信通道很快需要保活，回我一句话我们就保持联系！'
    this.expireText = config.expireText ?? '微信通道可能已失效：回复任意消息重新激活，或到管理后台重新绑定。'
    this._timer = null
    this.lastContextToken = null
  }

  start() {
    if (!this.enabled) return
    this._timer = setInterval(() => {
      this.check().catch(() => {})
    }, this.checkEveryMs)
    this._timer.unref?.()
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }

  async recordActivity(contextToken = null) {
    if (contextToken) this.lastContextToken = contextToken
    if (!this.enabled) return
    try {
      await this.memory.setAgentMeta('last_user_activity', Date.now())
    } catch {}
  }

  async check() {
    if (!this.enabled) return
    const last = await this.memory.getAgentMeta('last_user_activity', null)
    if (last == null) {
      await this.recordActivity()
      return
    }
    const idle = Date.now() - last
    const remaining = this.userTimeoutMs - idle
    if (idle >= this.userTimeoutMs) {
      const reminded = await this.memory.getAgentMeta('keepalive_expire_reminded', false)
      if (!reminded) {
        await this._send(this.expireText)
        await this.memory.setAgentMeta('keepalive_expire_reminded', true)
      }
      return
    }
    if (remaining < this.remindBeforeMs) {
      const lastRemind = await this.memory.getAgentMeta('keepalive_last_reminder', 0)
      if (!lastRemind || Date.now() - lastRemind > this.remindBeforeMs) {
        await this._send(this.remindText)
        await this.memory.setAgentMeta('keepalive_last_reminder', Date.now())
      }
    } else {
      if (await this.memory.getAgentMeta('keepalive_last_reminder', 0)) {
        await this.memory.setAgentMeta('keepalive_last_reminder', 0)
      }
      if (await this.memory.getAgentMeta('keepalive_expire_reminded', false)) {
        await this.memory.setAgentMeta('keepalive_expire_reminded', false)
      }
    }
  }

  async _send(text) {
    try {
      await this.client.sendMessage({
        context_token: this.lastContextToken ?? undefined,
        from_user_id: this.client.botId,
        message_state: 2,
        message_type: 2,
        item_list: [{ type: 1, text, text_item: { text } }],
        to_user_id: this.masterId,
      })
    } catch {}
  }
}
