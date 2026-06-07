import { HOOK_POINTS } from '../types.js'
import BaseHook from '../BaseHook.js'

export default class SkillCatalogHook extends BaseHook {
  constructor() {
    super('system:skill-catalog')
  }

  getPriority() {
    return 50 // 在权限校验之后，对话发送之前
  }

  async [HOOK_POINTS.LLM_BEFORE_CHAT](ctx) {
    const { llmService, event } = ctx
    if (llmService && typeof llmService._injectSkillCatalog === 'function') {
      llmService._injectSkillCatalog(event)
    }
    return true
  }
}
