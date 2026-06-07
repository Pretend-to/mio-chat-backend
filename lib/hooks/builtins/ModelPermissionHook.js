import { HOOK_POINTS } from '../types.js'
import BaseHook from '../BaseHook.js'

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
    const { event, instanceId, adapterType } = ctx
    const { user, body } = event
    const { settings } = body

    // 1. 管理员绿灯
    if (user?.isAdmin) return true

    // 2. 检查游客模型白名单
    const model = settings?.base?.model
    if (!model) return true

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
