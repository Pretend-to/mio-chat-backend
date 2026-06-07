import { HOOK_POINTS } from '../types.js'
import BaseHook from '../BaseHook.js'

export default class PresetHistoryHook extends BaseHook {
  constructor() {
    super('system:preset-history')
  }

  getPriority() {
    return 40 // 紧跟在技能注入之后
  }

  async [HOOK_POINTS.LLM_BEFORE_CHAT](ctx) {
    const { llmService, event } = ctx
    if (llmService && typeof llmService._mergePresetHistory === 'function') {
      llmService._mergePresetHistory(event)
    }
    return true
  }
}
