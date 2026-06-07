import { HOOK_POINTS } from '../types.js'
import BaseHook from '../BaseHook.js'

export default class ToolResolutionHook extends BaseHook {
  constructor() {
    super('system:tool-resolution')
  }

  /**
   * 当工具查找失败时触发
   */
  async [HOOK_POINTS.TOOL_NOT_FOUND](ctx) {
    const { toolName, allTools } = ctx
    const calledBase = toolName.split('_mid_')[0]
    
    const suggestions = []
    // 遍历所有可用工具进行模糊匹配
    for (const name of allTools.keys()) {
      const toolBase = name.split('_mid_')[0]
      if (toolBase === calledBase) {
        suggestions.push(name)
      }
    }

    let msg = `未找到工具: ${toolName}`
    if (suggestions.length > 0) {
      msg += `。你是不是想调用: ${suggestions.join(', ')}? 请使用完整的工具名重新调用。`
      
      // 我们将建议存入 ctx，这样外层可以决定是直接纠错还是报错
      ctx.suggestions = suggestions
    }

    ctx.error = msg
    return false // 明确告知查找失败
  }
}
