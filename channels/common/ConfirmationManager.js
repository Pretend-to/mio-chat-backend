/**
 * ConfirmationManager — 高危操作挂起确认拦截器 (Pending Action Interceptor)
 *
 * 职责：
 * 1. 管理危险工具/操作的用户确认队列 (TTL 5 分钟)；
 * 2. 将确认项绑定到来源用户/会话，并按 FIFO 顺序处理，避免并发审批串线；
 * 3. 拦截用户的下一句输入，智能匹配确认指令（'确认', '允许', '/allow', 'ok'）与取消指令（'取消', '拒绝', '/deny', 'no'）；
 * 4. 自动向用户推送确认授权卡片与超时取消提醒。
 */
export class ConfirmationManager {
  /**
   * @param {object} opts
   * @param {import('./BaseChannel.js').BaseChannel} opts.channel 所属渠道实例
   * @param {number} [opts.ttlMs=300000] 默认超时时间 (5分钟)
   */
  constructor({ channel, ttlMs = 5 * 60 * 1000 }) {
    this.channel = channel
    this.ttlMs = ttlMs
    this.pendingConfirmations = new Map() // pendingId -> pending item
  }

  get size() {
    return this.pendingConfirmations.size
  }

  /**
   * 挂起一个高危动作并等待用户在渠道中回复确认/取消
   * @param {object} params
   * @param {string} params.description 操作说明
   * @param {string} [params.title='安全操作确认'] 弹窗标题
   * @param {string} [params.command] 用于生成白名单选项的原始命令（仅展示前两个词）
   * @param {string} [params.commandPrefix1] 命令第一个词
   * @param {string} [params.commandPrefix2] 命令前两个词
   * @param {boolean} [params.rememberable=false] 是否允许持久化白名单
   * @param {object} ctx 上下文信息
   * @returns {Promise<{approved:boolean, rememberType?:'prefix1'|'prefix2', reason?:string}>}
   */
  request({
    description,
    title = '安全操作确认',
    command = '',
    commandPrefix1 = '',
    commandPrefix2 = '',
    rememberable = false,
    from = null,
    contextToken = null,
  }, ctx = {}) {
    return new Promise((resolve, reject) => {
      const pendingId = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      const sendCtx = {
        ...ctx,
        from: ctx.from || from || this.channel.masterId,
        contextToken: ctx.contextToken || contextToken || null,
      }
      const owner = {
        from: sendCtx.from == null ? null : String(sendCtx.from),
        sid: sendCtx.sid == null ? null : String(sendCtx.sid),
      }
      const item = {
        description,
        pendingId,
        reject,
        resolve,
        timer: null,
        owner,
        sendCtx,
        title,
        command,
        commandPrefix1,
        commandPrefix2,
        rememberable: rememberable === true,
        notified: false,
      }
      this.pendingConfirmations.set(pendingId, item)

      // 同一渠道只展示队首的一张卡片；后续审批在前一项结束后再展示。
      this._notifyNext()
    })
  }

  _notifyNext() {
    if (Array.from(this.pendingConfirmations.values()).some(entry => entry.notified)) return
    const item = Array.from(this.pendingConfirmations.values()).find(entry => !entry.notified)
    if (!item) return
    item.notified = true
    item.timer = setTimeout(() => {
      if (!this.pendingConfirmations.has(item.pendingId)) return
      this.pendingConfirmations.delete(item.pendingId)
      const noticePromise = this.channel._safeSend(item.sendCtx.from, item.sendCtx.contextToken,
        `⏰ 操作确认超时已自动取消：${item.description}`)
      item.resolve({ approved: false, reason: '操作确认超时已取消' })
      Promise.resolve(noticePromise).catch(() => {}).finally(() => this._notifyNext())
    }, this.ttlMs)

    const descBlock = (item.description || '').split('\n').map(line => `> ${line}`).join('\n')
    const lines = [`⚠️ **${item.title}**`, descBlock, '']
    if (item.command && item.rememberable && item.commandPrefix2) {
      lines.push(`👉 回复【1】执行并记住「${item.commandPrefix2}」`)
      if (item.commandPrefix1 && item.commandPrefix1 !== item.commandPrefix2) {
        lines.push(`👉 回复【2】执行并记住「${item.commandPrefix1}」`)
      }
    } else if (item.command) {
      lines.push('👉 回复【确认】执行本次操作')
    } else {
      lines.push('👉 回复【确认】或【/allow】执行')
    }
    lines.push('👉 回复【取消】或【拒绝 理由】放弃')
    this.channel._safeSend(item.sendCtx.from, item.sendCtx.contextToken, lines.join('\n')).catch(() => {})
  }

  _findPending(ctx) {
    return Array.from(this.pendingConfirmations.values()).find(item => item.notified && this._ownerMatches(item, ctx))
  }

  _findOwned(ctx) {
    return Array.from(this.pendingConfirmations.values()).find(item => this._ownerMatches(item, ctx))
  }

  _ownerMatches(item, ctx) {
    const from = ctx?.from == null ? null : String(ctx.from)
    const sid = ctx?.sid == null ? null : String(ctx.sid)
    if (item.owner.from && from && item.owner.from !== from) return false
    if (item.owner.sid && item.owner.sid !== sid) return false
    // 已经进入主渠道但本次消息没有 sid 时，不冒险把回复投递到另一个会话。
    if (item.owner.sid && !sid) return false
    return true
  }

  /**
   * 检查并处理用户的回复是否为确认/取消指令
   * @param {string} text 用户输入的文字
   * @param {object} ctx 上下文信息
   * @returns {boolean} 是否成功被确认拦截器处理
   */
  handleMessage(text, ctx) {
    if (this.pendingConfirmations.size === 0) return false

    const item = this._findPending(ctx)
    if (!item) {
      const queuedItem = this._findOwned(ctx)
      if (!queuedItem) return false
      this.channel._safeSend(ctx?.from || queuedItem.sendCtx.from, ctx?.contextToken || queuedItem.sendCtx.contextToken,
        '⏳ 前面还有待确认操作，请先完成当前确认。').catch(() => {})
      return true
    }

    const raw = (text || '').trim()
    const normalized = raw.toLowerCase()
    let rememberType = null
    let isAllow = false
    if (item.command && item.rememberable) {
      if (['1', '确认 1', '允许 1', '/allow 1'].includes(normalized)) {
        isAllow = true
        rememberType = 'prefix2'
      }
      if (item.commandPrefix1 !== item.commandPrefix2 && ['2', '确认 2', '允许 2', '/allow 2'].includes(normalized)) {
        isAllow = true
        rememberType = 'prefix1'
      }
    } else {
      isAllow = ['确认', '允许', 'yes', 'y', 'ok', '/allow', '继续', '同意', '好的', '行', '通过'].includes(normalized)
    }
    let isReject = ['取消', '拒绝', 'no', 'n', 'cancel', '/deny', '放弃', '不行', '不通过'].includes(normalized)
    let rejectReason = ''

    if (!isAllow && !isReject) {
      // 提取“拒绝/取消/不通过”后面跟随的具体原因（如：“拒绝 因为当前是生产环境”）
      const match = raw.match(/^(?:拒绝|取消|不通过|不同意|cancel|\/deny)\s*[:：,\s]?\s*(.+)$/i)
      if (match) {
        isReject = true
        rejectReason = match[1]?.trim() || ''
      }
    }

    // 有归属的挂起确认必须消费所有输入，避免普通文字绕过确认流进入旁路会话。
    if (!isAllow && !isReject) {
      this.channel._safeSend(ctx?.from || item.sendCtx.from, ctx?.contextToken || item.sendCtx.contextToken,
        '⚠️ 当前有待确认操作，请按提示回复确认选项，或回复【取消】放弃。').catch(() => {})
      return true
    }

    const pendingId = item.pendingId
    clearTimeout(item.timer)
    this.pendingConfirmations.delete(pendingId)

    // 无论确认还是取消，用户回复带来的最新 contextToken 必须立刻更新并持久化
    if (ctx?.contextToken) {
      this.channel.latestContextToken = ctx.contextToken
      if (this.channel.memory) {
        this.channel.memory.setAgentMeta('latestContextToken', ctx.contextToken).catch(() => {})
      }
    }

    const replyToken = ctx?.contextToken || this.channel.latestContextToken || null

    let feedbackPromise
    if (isAllow) {
      feedbackPromise = this.channel._safeSend(ctx?.from || item.sendCtx.from, replyToken, '✅ 已确认授权，正在继续执行...')
      item.resolve({ approved: true, contextToken: replyToken, rememberType })
    } else {
      const feedback = rejectReason ? `🚫 已拒绝该操作（理由: ${rejectReason}）` : '🚫 已取消该操作'
      feedbackPromise = this.channel._safeSend(ctx?.from || item.sendCtx.from, replyToken, feedback)
      item.resolve({ approved: false, contextToken: replyToken, reason: rejectReason || '用户已手动取消该操作' })
    }

    Promise.resolve(feedbackPromise).catch(() => {}).finally(() => this._notifyNext())
    return true
  }

  /** 清空所有待确认项 */
  clear() {
    for (const item of this.pendingConfirmations.values()) {
      clearTimeout(item.timer)
      item.reject(new Error('渠道已重置或关闭'))
    }
    this.pendingConfirmations.clear()
  }
}
