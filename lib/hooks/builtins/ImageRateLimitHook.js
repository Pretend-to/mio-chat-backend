import BaseHook from '../BaseHook.js'
import { HOOK_POINTS } from '../types.js'
import logger from '../../../utils/logger.js'

/**
 * 生图限流 Hook
 *
 * 在工具执行前对 draw / send_ui 等生图工具做滑动窗口限流：
 *   - IP 维度：大限制（默认 100 次/小时）
 *   - 用户维度：小限制（默认 20 次/小时，仅登录用户生效；游客回退为只看 IP）
 *   - 管理员（user.isAdmin）：完全豁免
 *   - 同时触发两个维度时，任一超限即拦截，且拦截的那次调用不消耗另一维度
 *   - 超限报错中会写明【刷新时间】（滑动窗口内最早一次命中 + 窗口期）
 *
 * 存储：进程内存滑动窗口（单实例 pm2 部署可行，与 guestUploadAuth.js 一致）。
 *       如需多实例共享计数，请替换为 Redis 等外部存储。
 */
export default class ImageRateLimitHook extends BaseHook {
  constructor(options = {}) {
    super({
      description: '生图工具滑动窗口限流：IP(大限制) + 用户(小限制) 双维度，管理员豁免，超限报错含刷新时间',
      hookPoint: HOOK_POINTS.TOOL_BEFORE_EXECUTE,
      name: 'image-rate-limit',
      namespace: '__builtin__',
      priority: 80, // 低于权限检查(90)，权限不过就不占用生图配额
    })
    // 滑动窗口配置（可通过 options 覆盖）
    this.windowMs = options.windowMs ?? 60 * 60 * 1000 // 默认 1 小时窗口
    this.ipLimit = options.ipLimit ?? 100 // IP 维度大限制：100 次/窗口
    this.userLimit = options.userLimit ?? 20 // 用户维度小限制：20 次/窗口
    // 生图工具名单：匹配 MioFunction 的工具名前缀（name 形如 draw_mid_xxxx）
    this.imageTools = options.imageTools || ['draw', 'send_ui']
    // 滑动窗口记录：key -> number[]（升序时间戳）
    this.hits = new Map()
    this._lastCleanup = Date.now()
    this._cleanupIntervalMs = options.cleanupIntervalMs ?? 10 * 60 * 1000 // 每 10 分钟清理过期 key
  }

  /**
   * 判断当前调用是否属于生图工具（且实际触发生图）
   */
  _isImageGeneration(ctx) {
    const className = ctx.tool?.constructor?.name || ''
    const toolName = ctx.tool?.name || ''
    const matchName = this.imageTools.some(t => toolName.startsWith(`${t}_`) || toolName === t)
    const matchClass = this.imageTools.some(t => className === t)
    if (!matchName && !matchClass) return false
    // send_ui 仅在实际提交生图时消耗配额：纯 UI 渲染 / 静态图片不计入
    const isSendUi = className === 'SendUi' || className === 'sendUi' || toolName.startsWith('send_ui_')
    if (isSendUi) {
      const params = ctx.params || {}
      const raw = params.prompt || params.imagePrompt
      if (raw && typeof raw === 'string' && raw.trim()) return true
      // variables 可能是 JSON 字符串，需解析后检查 prompt 系列字段
      if (typeof params.variables === 'string' && params.variables.includes('prompt')) {
        try {
          const v = JSON.parse(params.variables)
          if (v && (v.prompt || v.imagePrompt || v.image_prompt)) return true
        } catch {
          return false
        }
      }
      return false
    }
    return true
  }

  /**
   * 只读检查：返回窗口内当前命中次数（不新增记录）
   */
  _countHits(key, now) {
    const list = (this.hits.get(key) || []).filter(t => now - t < this.windowMs)
    this.hits.set(key, list)
    return list
  }

  /**
   * 检查指定维度是否超限
   * @returns {{allowed: boolean, retryAfterMs: number, count: number, limit: number}}
   */
  _check(key, limit, now) {
    const list = this._countHits(key, now)
    if (list.length >= limit) {
      // 滑动窗口刷新时间 = 最早一次命中 + 窗口期
      const retryAfterMs = Math.max(0, list[0] + this.windowMs - now)
      return { allowed: false, retryAfterMs, count: list.length, limit }
    }
    return { allowed: true, retryAfterMs: 0, count: list.length, limit }
  }

  /**
   * 记录一次命中（仅限检查通过后调用）
   */
  _recordHit(key, now) {
    const list = (this.hits.get(key) || []).filter(t => now - t < this.windowMs)
    list.push(now)
    this.hits.set(key, list)
  }

  /**
   * 将毫秒转成人类可读的倒计时
   */
  _formatRetry(retryAfterMs) {
    const totalSec = Math.ceil(retryAfterMs / 1000)
    if (totalSec <= 0) return '刚刚已可重试'
    if (totalSec >= 3600) {
      const h = Math.floor(totalSec / 3600)
      const m = Math.ceil((totalSec % 3600) / 60)
      return `${h} 小时 ${m} 分钟`
    }
    if (totalSec >= 60) {
      const m = Math.floor(totalSec / 60)
      const s = totalSec % 60
      return s > 0 ? `${m} 分 ${s} 秒` : `${m} 分钟`
    }
    return `${totalSec} 秒`
  }

  /**
   * 窗口时长描述
   */
  _formatWindow() {
    const s = Math.round(this.windowMs / 1000)
    if (s >= 3600) return `${s / 3600} 小时`
    if (s >= 60) return `${s / 60} 分钟`
    return `${s} 秒`
  }

  /**
   * 定时清理窗口内已无命中的 key，防止内存无限增长
   */
  _cleanupIfNeeded(now) {
    if (now - this._lastCleanup < this._cleanupIntervalMs) return
    this._lastCleanup = now
    for (const [key, list] of this.hits) {
      const alive = list.filter(t => now - t < this.windowMs)
      if (alive.length === 0) this.hits.delete(key)
      else this.hits.set(key, alive)
    }
    logger.info(`[ImageRateLimit] 已清理过期窗口记录，当前活跃 key 数 = ${this.hits.size}`)
  }

  async execute(ctx) {
    // 1. 仅限生图工具
    if (!this._isImageGeneration(ctx)) return true
    const user = ctx.user || {}
    // 2. 管理员豁免
    if (user.isAdmin) return true

    const now = Date.now()
    this._cleanupIfNeeded(now)

    const ip = user.ip || 'unknown'
    const userId = user.id ?? user.userId ?? null

    // 3. 先只读检查两个维度（都允许才一并计数，被拦截的请求不消耗另一维度）
    const ipKey = `img:ip:${ip}`
    const ipCheck = this._check(ipKey, this.ipLimit, now)
    if (!ipCheck.allowed) {
      const msg = `生图过于频繁：当前 IP 在 ${this._formatWindow()} 内已生成 ${ipCheck.count} 张（上限 ${ipCheck.limit} 张），请在 ${this._formatRetry(ipCheck.retryAfterMs)} 后重试。`
      logger.warn(`[ImageRateLimit] 拦截 IP=${ip}: ${msg}`)
      ctx.error = msg
      return false
    }

    let userCheck = null
    if (userId) {
      const userKey = `img:user:${userId}`
      userCheck = this._check(userKey, this.userLimit, now)
      if (!userCheck.allowed) {
        const msg = `生图过于频繁：你在 ${this._formatWindow()} 内已生成 ${userCheck.count} 张（上限 ${userCheck.limit} 张），请在 ${this._formatRetry(userCheck.retryAfterMs)} 后重试。`
        logger.warn(`[ImageRateLimit] 拦截 user=${userId}: ${msg}`)
        ctx.error = msg
        return false
      }
    }

    // 4. 两个维度都通过，才记录本次命中
    this._recordHit(ipKey, now)
    if (userId) this._recordHit(`img:user:${userId}`, now)
    return true
  }
}