import BaseHook from '../BaseHook.js'
import { HOOK_POINTS } from '../types.js'
import { SlidingWindowLimiter } from '../../ratelimit/SlidingWindowLimiter.js'
import logger from '../../../utils/logger.js'

/**
 * 通用工具限流 Hook（策略层）
 *
 * 与基础设施 SlidingWindowLimiter 解耦：本 Hook 只负责"规则声明 + 执行编排"，
 * 限流算法（滑动窗口、刷新时间）全部委托给 SlidingWindowLimiter。
 *
 * 规则为代码内声明（本次范围），每个规则：
 *   {
 *     name:        'image-generation',                       // 规则名（日志用）
 *     label:       '生图',                                    // 错误信息里的业务名称
 *     matchTool:   (ctx) => boolean,                          // 命中哪些工具
 *     consumes:    (ctx) => boolean,                          // 是否消耗配额（可省略=总是消耗）
 *     adminExempt: true,                                      // 管理员豁免（不计数）
 *     limits: [                                               // 多维度限制，任一超限即拦截
 *       {
 *         name:            'ip',
 *         dimensionLabel:  '当前 IP',
 *         key:             (ctx) => ctx.user?.ip,             // 维度 key（falsy 则跳过该维度）
 *         limit:           100,                                // 上限次数
 *         windowMs:        3600_000,                           // 窗口时长
 *         skip:            (ctx) => boolean,                   // 可选：跳过该维度的条件
 *         error:           (rule, limit, check, winText, retryText) => string  // 可选：自定义报错
 *       }
 *     ],
 *   }
 *
 * 拦截语义：任一维度超限 → 设 ctx.error（含刷新时间）并 return false，
 *           且被拦截的那次调用不消耗任何维度配额（先全部只读检查、全通过才计数）。
 */
export default class ToolRateLimitHook extends BaseHook {
  constructor(options = {}) {
    super({
      description: '通用工具滑动窗口限流：声明式规则、多维度、管理员豁免，超限报错含刷新时间',
      hookPoint: HOOK_POINTS.TOOL_BEFORE_EXECUTE,
      name: 'tool-rate-limit',
      namespace: '__builtin__',
      priority: 80, // 低于权限检查(90)，权限不过就不占用配额
    })
    const rawRules = options.rules && options.rules.length > 0 ? options.rules : this._defaultRules()
    this.rules = rawRules.map(rule => this._prepareRule(rule))
  }

  /**
   * 为规则中的每个维度挂独立的 limiter（各自 windowMs），并补齐默认字段
   */
  _prepareRule(rule) {
    return {
      ...rule,
      limits: (rule.limits || []).map(limit => ({
        ...limit,
        limiter: new SlidingWindowLimiter({ windowMs: limit.windowMs }),
      })),
    }
  }

  /**
   * 默认规则：生图工具（draw / send_ui）限流
   * IP 大限制 + 用户小限制，管理员豁免；send_ui 仅在实际触发生图时消耗配额。
   */
  _defaultRules() {
    const isImageTool = (ctx) => {
      const name = ctx.tool?.name || ''
      const cls = ctx.tool?.constructor?.name || ''
      return (
        name.startsWith('draw_') || name === 'draw' ||
        name.startsWith('send_ui_') || cls === 'SendUi'
      )
    }
    const consumesImage = (ctx) => {
      // 纯 UI 渲染 / 静态图片不计入：仅当 send_ui 实际提交生图（prompt 系列字段）才消耗
      if (!(ctx.tool?.name || '').startsWith('send_ui_')) return true // 非 send_ui（如 draw）必然消耗
      const params = ctx.params || {}
      if (params.prompt || params.imagePrompt) return true
      if (typeof params.variables === 'string' && params.variables.includes('prompt')) {
        try {
          const v = JSON.parse(params.variables)
          return !!(v && (v.prompt || v.imagePrompt || v.image_prompt))
        } catch {
          return false
        }
      }
      return false
    }
    return [
      {
        name: 'image-generation',
        label: '生图',
        matchTool: isImageTool,
        consumes: consumesImage,
        adminExempt: true,
        limits: [
          {
            name: 'ip',
            dimensionLabel: '当前 IP',
            key: ctx => ctx.user?.ip,
            limit: 100,
            windowMs: 3600_000, // 1 小时
            error: (rule, limit, check, winText, retryText) =>
              `生图过于频繁：${limit.dimensionLabel} 在 ${winText} 内已生成 ${check.count} 张（上限 ${check.limit} 张），请在 ${retryText} 后重试。`,
          },
          {
            name: 'user',
            dimensionLabel: '当前账号',
            key: ctx => ctx.user?.id,
            limit: 20,
            windowMs: 3600_000, // 1 小时
            skip: ctx => !ctx.user?.id, // 游客无 id，回退为只看 IP
            error: (rule, limit, check, winText, retryText) =>
              `生图过于频繁：${limit.dimensionLabel} 在 ${winText} 内已生成 ${check.count} 张（上限 ${check.limit} 张），请在 ${retryText} 后重试。`,
          },
        ],
      },
    ]
  }

  async execute(ctx) {
    for (const rule of this.rules) {
      // 1. 规则命中判定
      if (typeof rule.matchTool === 'function' && !rule.matchTool(ctx)) continue
      if (typeof rule.consumes === 'function' && !rule.consumes(ctx)) continue
      // 2. 管理员豁免（直接跳过整个规则，不计数）
      if (rule.adminExempt && ctx.user?.isAdmin) continue

      // 3. 先只读检查所有维度（被拦截的调用不消耗任何维度）
      const checks = []
      for (const limit of rule.limits) {
        if (limit.skip && limit.skip(ctx)) continue
        const key = typeof limit.key === 'function' ? limit.key(ctx) : limit.key
        if (!key) continue // 无 key 的维度跳过
        checks.push({ limit, key, result: limit.limiter.check(key, limit.limit) })
      }

      // 4. 任一维度超限 → 拦截
      const blocked = checks.find(c => !c.result.allowed)
      if (blocked) {
        const { limit, key, result } = blocked
        ctx.error = this._buildError(rule, limit, result)
        logger.warn(`[ToolRateLimit] 拦截 rule=${rule.name} dim=${limit.name} key=${key}: ${ctx.error}`)
        return false
      }

      // 5. 全部通过 → 记录本次命中
      for (const { limit, key } of checks) {
        limit.limiter.hit(key)
      }
    }
    return true
  }

  /**
   * 生成超限报错：默认模板通用，limit.error 可覆盖（如"已生成 X 张"措辞）
   */
  _buildError(rule, limit, check) {
    const winText = this._formatWindow(check.windowMs)
    const retryText = this._formatRetry(check.retryAfterMs)
    if (typeof limit.error === 'function') {
      return limit.error(rule, limit, check, winText, retryText)
    }
    const label = rule.label || '工具'
    const dim = limit.dimensionLabel || ''
    return `${label}调用过于频繁：${dim} 在 ${winText} 内已调用 ${check.count} 次（上限 ${check.limit} 次），请在 ${retryText} 后重试。`
  }

  /**
   * 毫秒 → 窗口时长描述（如 "1 小时" / "30 分钟"）
   */
  _formatWindow(windowMs) {
    const s = Math.round(windowMs / 1000)
    if (s >= 3600) return `${s / 3600} 小时`
    if (s >= 60) return `${s / 60} 分钟`
    return `${s} 秒`
  }

  /**
   * 毫秒 → 可读倒计时（如 "1 分 30 秒"）
   */
  _formatRetry(retryAfterMs) {
    const totalSec = Math.max(1, Math.ceil(retryAfterMs / 1000))
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
}