import { HOOK_POINTS } from '../types.js'
import BaseHook from '../BaseHook.js'
import { normalizeUsage } from '../../chat/llm/utils/usageHelper.js'

/**
 * 全局审计钩子
 * 负责记录工具执行用量和 LLM Token 消耗
 */
export default class AuditHook extends BaseHook {
  constructor() {
    super('system:audit-logger')
    this.stats = {
      chatUsage: {
        totalRequests: 0,
        promptTokens: 0,
        completionTokens: 0,
        byModel: {} // { modelName: { p: 0, c: 0 } }
      },
      errors: 0,
      toolUsage: {},
      totalCalls: 0
    }
  }

  /**
   * 工具执行前记录
   */
  async [HOOK_POINTS.TOOL_BEFORE_EXECUTE](ctx) {
    this.stats.totalCalls++
    const toolName = ctx.tool.name
    this.stats.toolUsage[toolName] = (this.stats.toolUsage[toolName] || 0) + 1
    
    ctx._auditStart = Date.now()
    const userName = ctx.user?.isAdmin ? '管理员' : (ctx.user?.id || '未知')
    const userIp = ctx.user?.ip ? `(${ctx.user.ip})` : ''
    logger.debug(`[审计] 用户 ${userName}${userIp} 准备执行工具: ${ctx.tool.name}`)
    return true
  }

  /**
   * 工具执行后记录耗时
   */
  async [HOOK_POINTS.TOOL_AFTER_EXECUTE](ctx) {
    const duration = Date.now() - (ctx._auditStart || Date.now())
    const userName = ctx.user?.isAdmin ? '管理员' : (ctx.user?.id || 'Guest')
    const userIp = ctx.user?.ip ? `(${ctx.user.ip})` : ''
    logger.info(`[审计] 工具执行完成: ${ctx.tool.name} | 耗时: ${duration}ms | 用户: ${userName}${userIp}`)
    return true
  }

  /**
   * 工具报错记录
   */
  async [HOOK_POINTS.TOOL_ON_ERROR](ctx) {
    this.stats.errors++
    logger.error(`[审计] 工具执行失败: ${ctx.tool.name} | 错误: ${ctx.error?.message}`)
    return true
  }

  /**
   * 对话后审计：记录 Token 用量
   */
  async [HOOK_POINTS.LLM_AFTER_CHAT](ctx) {
    const { usage, model, user, timeMetrics } = ctx
    if (!usage) {
      if (timeMetrics?.status === 'FAILED' || timeMetrics?.status === 'ABORTED') {
        const userName = user?.isAdmin ? '管理员' : (user?.id || 'Guest')
        const userIp = user?.ip ? `(${user.ip})` : ''
        logger.error(`[审计] 对话失败 | 模型: ${model || timeMetrics?.model} | 用户: ${userName}${userIp} | 状态: ${timeMetrics.status} | 原因: ${timeMetrics.errorMessage}`)
      }
      return true
    }

    const u = normalizeUsage(usage)
    const prompt = u.prompt_tokens
    const candidates = u.completion_tokens
    const thoughts = u.reasoning_tokens
    const cached = u.cached_tokens

    const s = this.stats.chatUsage
    s.totalRequests++
    s.promptTokens += prompt
    s.completionTokens += candidates

    // 按模型细分统计
    if (model) {
      if (!s.byModel[model]) {s.byModel[model] = { p: 0, c: 0 }}
      s.byModel[model].p += prompt
      s.byModel[model].c += candidates
    }

    const userName = user?.isAdmin ? '管理员' : (user?.id || 'Guest')
    const userIp = user?.ip ? `(${user.ip})` : ''
    let logMsg = `[审计] 对话完成 | 模型: ${model} | 用户: ${userName}${userIp} | Tokens: P=${prompt}, C=${candidates}`
    if (cached > 0) {logMsg += `, Cached=${cached}`}
    if (thoughts > 0) {logMsg += `, Thoughts=${thoughts}`}
    logger.info(logMsg)
    return true
  }
}