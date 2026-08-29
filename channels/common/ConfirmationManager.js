/**
 * ConfirmationManager — 高危操作挂起确认拦截器 (Pending Action Interceptor)
 *
 * 职责：
 * 1. 管理危险工具/操作的用户确认队列 (TTL 5 分钟)；
 * 2. 拦截用户的下一句输入，智能匹配确认指令（'确认', '允许', '/allow', 'ok'）与取消指令（'取消', '拒绝', '/deny', 'no'）；
 * 3. 自动向用户推送确认授权卡片与超时取消提醒。
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
    this.pendingConfirmations = new Map() // pendingId -> { pendingId, description, resolve, reject, timer }
  }

  get size() {
    return this.pendingConfirmations.size
  }

  /**
   * 挂起一个高危动作并等待用户在渠道中回复确认/取消
   * @param {object} params
   * @param {string} params.description 操作说明
   * @param {string} [params.title='安全操作确认'] 弹窗标题
   * @param {object} ctx 上下文信息
   * @returns {Promise<boolean>}
   */
  request({ description, title = '安全操作确认' }, ctx) {
    return new Promise((resolve, reject) => {
      const pendingId = `p_${Date.now().toString(36)}`
      const timer = setTimeout(() => {
        if (this.pendingConfirmations.has(pendingId)) {
          this.pendingConfirmations.delete(pendingId)
          this.channel._safeSend(ctx.from, ctx.contextToken, `⏰ 操作确认超时已自动取消：${description}`)
          resolve({ approved: false, reason: '操作确认超时已取消' })
        }
      }, this.ttlMs)

      this.pendingConfirmations.set(pendingId, {
        description,
        pendingId,
        reject,
        resolve,
        timer,
      })

      // 向用户推送交互确认提示
      const confirmNotice = [
        `⚠️ **${title}**`,
        `> ${description}`,
        '',
        '👉 回复【确认】或【/allow】执行',
        '👉 回复【取消】或【拒绝 理由】放弃',
      ].join('\n')

      this.channel._safeSend(ctx.from, ctx.contextToken, confirmNotice).catch(() => {})
    })
  }

  /**
   * 检查并处理用户的回复是否为确认/取消指令
   * @param {string} text 用户输入的文字
   * @param {object} ctx 上下文信息
   * @returns {boolean} 是否成功被确认拦截器处理
   */
  handleMessage(text, ctx) {
    if (this.pendingConfirmations.size === 0) return false

    const raw = (text || '').trim()
    const normalized = raw.toLowerCase()
    const isAllow = ['确认', '允许', 'yes', 'y', 'ok', '/allow', '继续', '同意', '好的', '行', '通过'].includes(normalized)
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

    if (!isAllow && !isReject) return false

    // 取出最新的 pending item
    const [pendingId, item] = Array.from(this.pendingConfirmations.entries())[this.pendingConfirmations.size - 1]
    clearTimeout(item.timer)
    this.pendingConfirmations.delete(pendingId)

    if (isAllow) {
      this.channel._safeSend(ctx.from, ctx.contextToken, '✅ 已确认授权，正在继续执行...')
      item.resolve({ approved: true })
    } else {
      const feedback = rejectReason ? `🚫 已拒绝该操作（理由: ${rejectReason}）` : '🚫 已取消该操作'
      this.channel._safeSend(ctx.from, ctx.contextToken, feedback)
      item.resolve({ approved: false, reason: rejectReason || '用户已手动取消该操作' })
    }

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
