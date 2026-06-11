import { HOOK_POINTS } from '../types.js'
import BaseHook from '../BaseHook.js'

/**
 * 工具结果防御性截断钩子
 * 防止工具返回超长内容撑爆上下文（如 bash 遍历 node_modules）
 */
export default class ToolResponseLimitHook extends BaseHook {
  constructor(options = {}) {
    super('system:response-limiter')
    this.maxLength = options.maxLength || 10000 // 默认 10k 字符
  }

  async [HOOK_POINTS.TOOL_AFTER_EXECUTE](ctx) {
    let { result } = ctx
    if (!result) return true

    // 分离内部元数据字段（_postMessages 等），它们不计入工具结果长度
    // 因为 _postMessages 是 vision tool 传递图片的中间载体，不发给 LLM
    let pureResultForMeasure = result
    let postMessages = null
    if (typeof result === 'object' && result !== null) {
      const { _postMessages, ...rest } = result
      pureResultForMeasure = rest
      postMessages = _postMessages
    }

    let content = typeof pureResultForMeasure === 'string' ? pureResultForMeasure : JSON.stringify(pureResultForMeasure)

    if (content.length > this.maxLength) {
      const originalLength = content.length
      const head = content.substring(0, Math.floor(this.maxLength * 0.6))
      const tail = content.substring(content.length - Math.floor(this.maxLength * 0.3))
      
      const truncatedResult = `${head}\n\n... [⚠️ 内容过长，已截断 ${originalLength - this.maxLength} 字符] ...\n\n${tail}\n\n💡 提示: 结果过长可能影响你的判断，建议尝试缩小搜索范围、分页读取或使用过滤工具。`

      // 修改上下文中的结果，保留 _postMessages 以保证图片链路完整
      ctx.result = typeof result === 'string' ? truncatedResult : { 
        ...pureResultForMeasure,
        ...(postMessages ? { _postMessages: postMessages } : {}),
        _truncated: true,
        text: truncatedResult
      }

      logger.warn(`[拦截] 工具 ${ctx.tool.name} 结果过长 (${originalLength} 字符)，已执行防御性截断。`)
    }

    return true
  }
}
