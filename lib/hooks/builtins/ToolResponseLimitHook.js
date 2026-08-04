import { HOOK_POINTS } from '../types.js'
import BaseHook from '../BaseHook.js'
import fs from 'fs'
import crypto from 'crypto'

/**
 * 工具结果防御性截断钩子
 * 防止工具返回超长内容撑爆上下文（如 bash 遍历 node_modules）
 * 策略：超阈值时将完整内容写入 /tmp，LLM 可用 head/tail 按需读取
 */
export default class ToolResponseLimitHook extends BaseHook {
  constructor(options = {}) {
    super('system:response-limiter')
    this.maxLength = options.maxLength || 20000 // 默认 20k 字符
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

      // 生成唯一文件名：时间戳 + 随机 hex
      const ts = new Date().toISOString().replace(/[-:T]/g, '').replace(/\.\d{3}/, '')
      const hash = crypto.randomBytes(3).toString('hex')
      const filename = `mio-tool-${ts}-${hash}.txt`
      const filePath = `/tmp/${filename}`

      let written = false
      try {
        fs.writeFileSync(filePath, content, 'utf-8')
        written = true
      } catch (err) {
        logger.error(`[ToolResponseLimit] 写入 /tmp 失败: ${err.message}，降级为截断`)
      }

      let truncatedResult
      if (written) {
        truncatedResult = `[工具结果过大 (${originalLength.toLocaleString()} 字符)，已保存至 /tmp/${filename}]`

        logger.warn(`[拦截] 工具 ${ctx.tool.name} 结果过长 (${originalLength} 字符)，已保存至 ${filePath}`)
      } else {
        // 降级：写文件失败时回退到旧的头尾截断
        const head = content.substring(0, Math.floor(this.maxLength * 0.6))
        const tail = content.substring(content.length - Math.floor(this.maxLength * 0.3))
        truncatedResult = `${head}\n\n... [⚠️ 内容过长，已截断 ${originalLength - this.maxLength} 字符] ...\n\n${tail}\n\n💡 提示: 结果过长可能影响你的判断，建议尝试缩小搜索范围、分页读取或使用过滤工具。`

        logger.warn(`[拦截] 工具 ${ctx.tool.name} 结果过长 (${originalLength} 字符)，已执行防御性截断。`)
      }

      // 修改上下文中的结果
      if (typeof result === 'string') {
        // 字符串结果：直接替换为截断提示
        ctx.result = truncatedResult
      } else {
        // 对象结果：整体替换为精简结构，绝不能展开保留原始字段
        // （如 result/output/content 等大字段会被 base.js 的 `result.result` 解包原样透传给 LLM）
        const slim = {
          _truncated: true,
          result: truncatedResult,
        }
        // 透传成功标志（小布尔值，不占空间）
        if (pureResultForMeasure?.success !== undefined) {
          slim.success = pureResultForMeasure.success
        }
        // 透传内部链路字段（不发给 LLM，仅用于图片载体 / 前端渲染）
        if (postMessages) slim._postMessages = postMessages
        if (pureResultForMeasure?.extraRender) slim.extraRender = pureResultForMeasure.extraRender
        ctx.result = slim
      }
    }

    return true
  }
}
