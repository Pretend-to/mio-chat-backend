import { HOOK_POINTS } from '../types.js'
import BaseHook from '../BaseHook.js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const TMP_PREFIX = 'mio-tool-'
const MAX_KEEP = 20 // /tmp 最多保留的落盘文件数，防堆积
const PREVIEW_LINES = 20 // 摘要里给 LLM 的预览行数
const LINE_CLAMP = 120 // 预览单行最大字符数，超出截断

/**
 * 工具结果防御性截断钩子
 * 防止工具返回超长内容撑爆上下文（如 bash 遍历 node_modules）
 * 策略：超阈值时将完整内容写入 /tmp（JSON 保留缩进换行，可被 read/grep 按行使用），
 *       同时返回结构化摘要（路径/行数/JSON 顶层结构/前 N 行预览），LLM 可按需按行读取
 */
export default class ToolResponseLimitHook extends BaseHook {
  constructor(options = {}) {
    super('system:response-limiter')
    // 默认 40k 字符。落盘内容不进上下文，阈值只决定"多大算大"，
    // 40k ≈ 1.3 万 tokens，对 200k 上下文安全，且覆盖更多合法输出
    this.maxLength = options.maxLength || 40000
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

    const isJsonObject = typeof pureResultForMeasure === 'object' && pureResultForMeasure !== null
    // JSON 对象落盘时 pretty-print（保留换行缩进，read/grep 可按行使用）；字符串原样写入
    const content = isJsonObject
      ? JSON.stringify(pureResultForMeasure, null, 2)
      : typeof pureResultForMeasure === 'string'
        ? pureResultForMeasure
        : String(pureResultForMeasure)

    if (content.length <= this.maxLength) return true

    const originalLength = content.length
    const lineCount = content.split('\n').length

    // 生成唯一文件名：时间戳 + 随机 hex；JSON 用 .json 后缀便于工具识别，文本用 .txt
    const ts = new Date().toISOString().replace(/[-:T]/g, '').replace(/\.\d{3}/, '')
    const hash = crypto.randomBytes(3).toString('hex')
    const filename = `${TMP_PREFIX}${ts}-${hash}.${isJsonObject ? 'json' : 'txt'}`
    const filePath = path.join('/tmp', filename)

    let written = false
    try {
      this._cleanupOldFiles()
      fs.writeFileSync(filePath, content, 'utf-8')
      written = true
    } catch (err) {
      logger.error(`[ToolResponseLimit] 写入 /tmp 失败: ${err.message}，降级为截断`)
    }

    let truncatedResult
    if (written) {
      truncatedResult = this._buildSummary(originalLength, lineCount, filePath, pureResultForMeasure, content)
      logger.warn(`[拦截] 工具 ${ctx.tool.name} 结果过长 (${originalLength} 字符 / ${lineCount} 行)，已保存至 ${filePath}`)
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

    return true
  }

  /**
   * 构建给 LLM 的结构化摘要：路径/行数/JSON 顶层结构/前 N 行预览/读取指引。
   * 目的是让 LLM 不读文件就知道里面有什么，按需按行读取，避免二次触发截断。
   */
  _buildSummary(originalLength, lineCount, filePath, rawValue, content) {
    const lines = [`[工具结果过大 (${originalLength.toLocaleString()} 字符 / ${lineCount} 行)，已保存至 ${filePath}]`]

    if (typeof rawValue === 'object' && rawValue !== null) {
      try {
        lines.push(`顶层结构: ${this._summarizeJson(rawValue)}`)
      } catch {
        /* 结构提取失败忽略 */
      }
    }

    const preview = content
      .split('\n')
      .slice(0, PREVIEW_LINES)
      .map((l, i) => `  ${i + 1}: ${l.length > LINE_CLAMP ? l.slice(0, LINE_CLAMP) + '…' : l}`)
    lines.push(`预览 (前 ${preview.length} 行):`, ...preview)

    lines.push('', '读取建议: 用 read 工具指定 startLine/endLine 或 keyword 按需读取，避免整文件读取再次触发截断。')

    return lines.join('\n')
  }

  /** 提取 JSON 顶层结构（key → 类型/长度），让 LLM 不用读文件就知道里面有什么 */
  _summarizeJson(value) {
    if (Array.isArray(value)) {
      const firstType = value.length ? (value[0] === null ? 'null' : typeof value[0]) : 'empty'
      return `数组 (${value.length} 项, 元素类型: ${firstType})`
    }
    if (value !== null && typeof value === 'object') {
      const keys = Object.entries(value)
        .slice(0, 8)
        .map(([k, v]) => {
          if (Array.isArray(v)) return `${k}: 数组(${v.length}项)`
          if (v === null) return `${k}: null`
          return `${k}: ${typeof v}`
        })
      const total = Object.keys(value).length
      const suffix = total > 8 ? `, …共 ${total} 个 key` : ''
      return `对象 { ${keys.join(', ')}${suffix} }`
    }
    return typeof value
  }

  /** /tmp 只保留最近 MAX_KEEP 个落盘文件，避免堆积 */
  _cleanupOldFiles() {
    try {
      const files = fs
        .readdirSync('/tmp')
        .filter((f) => f.startsWith(TMP_PREFIX))
        .sort()
      const excess = files.length - MAX_KEEP
      if (excess > 0) {
        for (const f of files.slice(0, excess)) {
          fs.unlinkSync(path.join('/tmp', f))
        }
      }
    } catch (err) {
      logger.debug(`[ToolResponseLimit] 清理旧落盘文件失败: ${err.message}`)
    }
  }
}
