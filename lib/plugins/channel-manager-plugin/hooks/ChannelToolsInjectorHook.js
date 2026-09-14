import { HOOK_POINTS } from '../../../hooks/types.js'
import BaseHook from '../../../hooks/BaseHook.js'
import { applyChannelToolPolicy } from '../../../chat/llm/toolPolicy.js'

/**
 * Reassert the immutable Channel tool policy before every recursive LLM turn.
 * Task executions retain their explicit allowlist.
 */
export default class ChannelToolsInjectorHook extends BaseHook {
  constructor() {
    super('channel:tools-injector')
  }

  getPriority() {
    return 80
  }

  async [HOOK_POINTS.LLM_BEFORE_RECURSION](ctx) {
    applyChannelToolPolicy(ctx.event)
  }
}
