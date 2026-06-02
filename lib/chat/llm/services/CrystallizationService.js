/**
 * CrystallizationService - 无状态上下文记忆结晶服务
 *
 * 核心职责：
 * 1. 扫描前端轮次边界（避免切断 tool_calls 对话）
 * 2. 构造滚雪球式 XML 结晶压缩 prompt
 * 3. 启动独立内部 Event 调用压缩 LLM
 * 4. 返回重组后的新 messageChain（XML crystal system msg + 最近1轮原始消息）
 */

import {
  CRYSTAL_TAGS,
  parseXmlZones,
  buildXmlFromZones,
  appendToXmlZone,
} from './CrystallizationUtils.js'

export { CRYSTAL_TAGS, parseXmlZones, buildXmlFromZones, appendToXmlZone }

/**
 * 应用 memory 工具的 CRUD 操作到 XML 字符串上
 */
export function applyMemoryCrud(xmlStr, params) {
  let action = params.action || 'add'
  let zone = params.zone || 'long_term_profile'
  let content = params.content || ''
  const target = params.target || ''

  const zones = parseXmlZones(xmlStr)

  if (action === 'read') {
    return xmlStr
  }

  if (action === 'add') {
    if (!content || !content.trim()) return xmlStr
    const existing = zones[zone] || ''
    zones[zone] = existing ? `${existing}\n${content.trim()}` : content.trim()
  } else if (action === 'delete') {
    if (!target || !target.trim()) return xmlStr
    const existing = zones[zone] || ''
    const lines = existing.split('\n')
    const filtered = lines.filter(line => !line.includes(target.trim()))
    zones[zone] = filtered.join('\n')
  } else if (action === 'update') {
    if (!content || !content.trim()) return xmlStr
    const existing = zones[zone] || ''
    if (target && target.trim()) {
      if (existing.includes(target.trim())) {
        zones[zone] = existing.replace(target.trim(), content.trim())
      } else {
        zones[zone] = existing ? `${existing}\n${content.trim()}` : content.trim()
      }
    } else {
      zones[zone] = content.trim()
    }
  }

  return buildXmlFromZones(zones)
}

/**
 * 反向扫描 messages 数组，识别完整的"前端轮次（Frontend Turn）"边界
 *
 * 一个"前端轮次"定义：
 *   - 从一条 `user` 消息开始
 *   - 包含其后所有连续的 `assistant(tool_calls)` + `tool` 结果消息
 *   - 直到下一条 `user` 消息之前（或数组末尾）结束
 *
 * @param {Array} messages - 当前完整的 messages 数组
 * @param {number} keepTurns - 要保留的完整前端轮次数（默认 1）
 * @returns {number} boundaryIndex - 保留区间的起始索引（包含），其前面的消息将被压缩
 */
export function scanFrontendTurns(messages, keepTurns = 1) {
  if (!messages || messages.length === 0) return 0

  let turnsFound = 0
  let i = messages.length - 1

  while (i >= 0) {
    const msg = messages[i]

    // 遇到 user 消息，代表一个轮次的起点
    if (msg.role === 'user') {
      turnsFound++
      if (turnsFound >= keepTurns) {
        // 找到了足够的轮次，返回这个 user 消息的索引作为边界
        return i
      }
    }
    i--
  }

  // 如果消息链太短，没有足够的轮次，返回 0（不压缩任何内容）
  return 0
}

/**
 * 构造滚雪球式 XML 压缩 prompt
 *
 * @param {string} compactPrompt - 系统设置中的压缩提示词
 * @param {string|null} previousSummary - 上次结晶的 XML 字符串（或 null）
 * @param {Array} messagesToCompress - 本次需要被压缩的消息段
 * @returns {Array} 适合内部 Event 使用的 messages 数组
 */
function buildCompressMessages(compactPrompt, previousSummary, messagesToCompress) {
  // 浅拷贝原始的消息前缀，保证完全与原始上下文吻合，从而完美命中大模型的 Prompt Cache 缓存
  const copiedPrefix = messagesToCompress.map(msg => {
    const copied = {
      role: msg.role,
      content: msg.content,
    }
    if (msg.tool_calls) copied.tool_calls = msg.tool_calls
    if (msg.name) copied.name = msg.name
    if (msg.tool_call_id) copied.tool_call_id = msg.tool_call_id
    return copied
  })

  const instructionsMsg = {
    role: 'user',
    content: [
      `<SYSTEM_INSTRUCTION>`,
      `[CRITICAL INTERRUPT - CONTEXT COMPRESSION & MEMORY CRYSTALLIZATION]`,
      `注意：当前会话已暂停。请立即中断任何常规对话逻辑、代码开发、问答或工具调用。你当前的角色已切换为“高级上下文压缩与记忆结晶专家”。`,
      ``,
      `你必须根据下方的历史记忆结晶 <previous_summary> 和上文中的所有对话历史，执行合并、去重、提炼并输出最新的 XML 结构化记忆结晶。`,
      ``,
      `## 历史记忆结晶 (Previous Summary)`,
      previousSummary
        ? `<previous_summary>\n${previousSummary}\n</previous_summary>`
        : '<previous_summary>（暂无历史结晶，这是第一次压缩）</previous_summary>',
      ``,
      `## 结晶压缩规则与输出格式要求`,
      compactPrompt,
      ``,
      `## 强制性输出限制`,
      `1. 立即中断并中止上文的常规会话，不要回答用户的最后一个问题，不要表达抱歉，也不要进行任何后续对话阐述。`,
      `2. 你的回复必须且只能输出包含指定 XML 标签的结晶主体内容。`,
      `3. 严格禁止输出任何前导词（如“好的，这是为您提炼的...”）、解释性文字、 markdown 块包裹（如 \`\`\`xml）、或后记！请以标签 <long_term_profile> 作为你回复的第一个字符。`,
      `</SYSTEM_INSTRUCTION>`
    ].join('\n')
  }

  return [...copiedPrefix, instructionsMsg]
}

/**
 * 主压缩函数
 *
 * 从 `e` 中读取当前 messages 和 settings，
 * 扫描边界 → 构造 prompt → 调用压缩 LLM → 返回新 messageChain。
 *
 * @param {Object} e - 当前的 LLMMessageEvent 对象（只读，不修改）
 * @param {Object} llmService - LLMChatService 单例（用于调用 LLM）
 * @returns {Promise<{messages: Array, summary: string}>}
 *   - messages: 重组后的消息链（用于覆盖 e.body.messages）
 *   - summary: 新生成的 XML 结晶字符串
 */
export async function compress(e, llm, boundaryIndex) {
  const messages = e.body.messages || []
  const settings = e.body.settings || {}
  const previousSummary = settings.previous_summary || null

  // 2. 截取最近要保留的 1~2 轮消息，这将在压缩完成后用作消息链重组
  const recentMessages = messages.slice(boundaryIndex)

  logger.info(
    `[CrystallizationService] 触发压缩: 共 ${messages.length} 条消息，` +
    `待结晶区间长度 ${boundaryIndex}（boundary=${boundaryIndex}），` +
    `保留最近 ${recentMessages.length} 条`
  )

  // 3. 直接使用内置默认压缩提示词，不再从数据库读取
  const compactPrompt = getDefaultCompactPrompt()

  // 4. 构造压缩请求 messages (全量传入以实现最高 Prompt Cache 利用率)
  const compressMessages = buildCompressMessages(compactPrompt, previousSummary, messages)

  // 5. 使用当前对话一样的适配器实例，禁止自定义渠道以最大化复用缓存
  if (!llm) {
    logger.error('[CrystallizationService] 没有可用的 LLM 实例，跳过压缩')
    return null
  }

  // 6. 另起独立内部 Event 调用压缩 LLM（后台流式捕获，推送到前端）
  const { InternalEventFactory } = await import('../utils/InternalEventFactory.js')

  let summaryXml = ''
  const compressEvent = InternalEventFactory.createSimpleEvent({
    model: llm.models[0]?.models?.[0],
    requestId: `system_crystal_${Date.now()}`,
    messages: compressMessages,
    stream: true,
    settings: e.body.settings,
    onContent: (content) => {
      summaryXml += content
      // 实时流式通知前端，实现整理事实时的打字机效果，提升极客体验
      e.update({
        type: 'crystallize',
        content: { status: 'running', summary: summaryXml },
      })
    },
  })

  try {
    await llm.handleChatRequest(compressEvent)
  } catch (err) {
    logger.error('[CrystallizationService] 压缩 LLM 调用失败:', err.message)
    return null
  }

  summaryXml = summaryXml.trim()

  if (!summaryXml) {
    logger.warn('[CrystallizationService] 压缩 LLM 返回空内容，跳过压缩')
    return null
  }

  logger.debug(`[CrystallizationService] 压缩完成，新结晶长度: ${summaryXml.length} 字符`)

  // 7. 构造新 messageChain：system crystal message + 最近 N 轮原始消息
  const crystalSystemMessage = {
    role: 'system',
    content: `<memory_crystal>\n${summaryXml}\n</memory_crystal>`,
    _is_crystal: true, // 标记方便调试
  }

  const newMessages = [crystalSystemMessage, ...recentMessages]

  return {
    messages: newMessages,
    summary: summaryXml,
  }
}

function getDefaultCompactPrompt() {
  return `请对上文所有的对话历史进行滚雪球式提炼与压缩总结，更新并输出以下 5 个维度的结构化 XML 记忆分区。

## XML 分区定义：
1. <long_term_profile>
用户的基本信息、技术栈偏好、编程习惯、工作风格等稳定的长期个人特征。合并并融合 previous_summary 中的已有内容。
⚠️ 遗忘策略：保守保留。仅在新对话明确反驳或修正时才覆盖旧信息，否则保留不动。
</long_term_profile>

2. <short_term_goals>
本次会话或近期对话中用户明确提出的核心目标、当前任务、期望达成的主要结果。
⚠️ 遗忘策略：激退出清。标记为 ✅ 已完成的目标，如果后续对话中未再次提及，必须移除。
</short_term_goals>

3. <current_plan>
为达成 short_term_goals 当前正在执行的任务计划、详细步骤以及已完成的阶段性任务。
⚠️ 遗忘策略：已完成的任务列表压缩为一句「已完成」描述，不再逐条陈列细节。无待办任务时写「无待办任务」。
</current_plan>

4. <file_architecture_delta>
本次会话中涉及的所有关键文件路径及其功能摘要，用于快速了解代码结构。
⚠️ 遗忘策略：只保留对后续对话仍有用的摘要（文件路径+功能）。不要保留文件修改过程、变更历史或 commit 日志。
</file_architecture_delta>

5. <constraints>
开发过程中必须遵守的技术约束、用户明确提出的限制条件、已知未解决的 bug 或待修复问题。
⚠️ 遗忘策略：超过 3 次结晶未被更新或提及的 constraint 自动移除。已解决的 bug 描述必须在本次结晶中移除。
</constraints>

## 全局遗忘与压缩规则：
1. 【同义合并】：同一件事在多个分区中出现时，只保留最相关的那一份。例如一个 bug 同时出现在 short_term_goals 和 constraints 中时，优先保留在 constraints 中。
2. 【版本覆盖】：新信息与旧信息矛盾时，旧信息必须移除，不能两个都保留。
3. 【容量上限】：总结晶正文（不含 XML 标签）建议控制在 1500 字符以内。超出时按以下优先级剪裁：long_term_profile > constraints > short_term_goals > current_plan > file_architecture_delta（左侧优先保留）。

## 输出约束：
1. 【滚雪球继承】：必须读取并融合 previous_summary 中的有效内容，严禁丢失长期个人特征记忆！
2. 【客观准确】：仅记录事实、文件路径和用户意图，禁止猜测。
3. 【纯净输出】：以 <long_term_profile> 作为回复的第一个字符。禁止任何前言、后记、代码块包裹或解释性文字。`
}

export default {
  compress,
  scanFrontendTurns,
  CRYSTAL_TAGS,
}
