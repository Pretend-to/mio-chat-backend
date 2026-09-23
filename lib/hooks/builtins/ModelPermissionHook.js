import { HOOK_POINTS } from '../types.js'
import BaseHook from '../BaseHook.js'

const TRUSTED_RUNTIME_SOURCES = new Set([
  'internal',
  'scheduled_task',
  'subagent',
  'system',
  'trigger',
])

function isAdminPrincipal(principal) {
  return (
    principal?.isAdmin === true ||
    principal?.role === 'admin' ||
    principal?.role === 'system_admin'
  )
}

function isTrustedRuntimeEvent(event) {
  return (
    TRUSTED_RUNTIME_SOURCES.has(event?.source) &&
    (event?.isWake === true ||
      event?.triggerKind === 'task' ||
      event?.triggerKind === 'system')
  )
}

export default class ModelPermissionHook extends BaseHook {
  constructor() {
    super('system:model-permission')
  }

  getPriority() {
    return 100 // 权限校验优先级最高
  }

  /**
   * 拦截 LLM 对话请求
   */
  async [HOOK_POINTS.LLM_BEFORE_CHAT](ctx) {
    const { event, instanceId } = ctx
    const { user, body } = event || {}
    const { settings } = body || {}

    // 1. 管理员绿灯
    // createBackendLlm 传入的 event 同时保留 principal 与兼容旧插件的
    // user；递归/桥接阶段优先读取 principal，避免身份只剩 user projection。
    if (isAdminPrincipal(event?.principal) || isAdminPrincipal(user)) {
      return true
    }

    // 后台唤醒/定时任务是服务端创建的运行时事件，不应因为某一层没有
    // 完整回填 principal 而回退到游客模型白名单。
    if (isTrustedRuntimeEvent(event)) return true

    // 2. 检查游客模型白名单
    const model = settings?.base?.model
    if (!model) {return true}

    // 调用 LLM Service 的内部方法进行校验
    // 注意：这里我们通过 ctx 传入的 llm 实例或 service 来判断
    const isAllowed = await ctx.llmService?._isGuestModelAllowed(instanceId, model)

    if (!isAllowed) {
      ctx.error = `模型 "${model}" 不在游客可用范围内，请登录或切换模型。`
      return false
    }

    return true
  }
}
