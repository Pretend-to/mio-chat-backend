import { HOOK_POINTS } from '../../../hooks/types.js'
import BaseHook from '../../../hooks/BaseHook.js'
import { applyAgentToolPolicy } from '../../../chat/llm/toolPolicy.js'

/** Reassert the immutable Agent tool policy before every recursive LLM turn. */
export default class AgentToolsInjectorHook extends BaseHook {
  constructor() {
    super('agent:tools-injector')
  }

  getPriority() {
    return 80
  }

  async [HOOK_POINTS.LLM_BEFORE_RECURSION](ctx) {
    applyAgentToolPolicy(ctx.event)
  }
}
