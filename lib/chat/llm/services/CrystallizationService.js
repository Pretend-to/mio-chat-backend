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
  appendToXmlZone,
  buildXmlFromZones,
  parseXmlZones,
} from './CrystallizationUtils.js'

export { CRYSTAL_TAGS, parseXmlZones, buildXmlFromZones, appendToXmlZone }

/**
 * 应用 memory 工具的 CRUD 操作到 XML 字符串上
 */
export function applyMemoryCrud(xmlStr, params) {
  const action = params.action || 'add'
  const zone = params.zone || 'long_term_profile'
  const content = params.content || ''
  const target = params.target || ''

  const zones = parseXmlZones(xmlStr)

  if (action === 'read') {
    return xmlStr
  }

  if (action === 'add') {
    if (!content || !content.trim()) {return xmlStr}
    const existing = zones[zone] || ''
    zones[zone] = existing ? `${existing}\n${content.trim()}` : content.trim()
  } else if (action === 'delete') {
    if (!target || !target.trim()) {return xmlStr}
    const existing = zones[zone] || ''
    const lines = existing.split('\n')
    const filtered = lines.filter(line => !line.includes(target.trim()))
    zones[zone] = filtered.join('\n')
  } else if (action === 'update') {
    if (!content || !content.trim()) {return xmlStr}
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
  if (!messages || messages.length === 0) {return 0}

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
function buildCompressMessages(compactPrompt, previousSummary, messagesToCompress, pendingEvents = []) {
  // 浅拷贝原始的消息前缀，保证完全与原始上下文吻合，从而完美命中大模型的 Prompt Cache 缓存
  const copiedPrefix = messagesToCompress.map(msg => {
    const copied = {
      content: msg.content,
      role: msg.role,
    }
    if (msg.tool_calls) {copied.tool_calls = msg.tool_calls}
    if (msg.name) {copied.name = msg.name}
    if (msg.tool_call_id) {copied.tool_call_id = msg.tool_call_id}
    return copied
  })

  // 如果前端下发了待合并的记忆事件清单，格式化为 XML 区块作为高优先级提炼依据
  let pendingEventsBlock = ''
  if (Array.isArray(pendingEvents) && pendingEvents.length > 0) {
    const lines = pendingEvents.map(evt => {
      const action = evt.action || 'add'
      const zone = evt.zone || 'long_term_profile'
      const content = evt.content || ''
      const target = evt.target ? ` (target: "${evt.target}")` : ''
      return `  - [${action} -> ${zone}] ${content}${target}`
    })
    pendingEventsBlock = [
      `## 近期会话中明确记录的记忆变动 (Pending Memory Events)`,
      `以下是 Agent 在近期对话中通过 memory 工具明确记录/变更的事实清单，请重点提炼并无缝融合到对应的 XML 结晶分区中：`,
      `<pending_memory_events>`,
      ...lines,
      `</pending_memory_events>`,
      ``,
    ].join('\n')
  }

  const instructionsMsg = {
    content: [
      `<SYSTEM_INSTRUCTION>`,
      `🚨 [CRITICAL EMERGENCY INTERRUPT - CONTEXT COMPRESSION & MEMORY CRYSTALLIZATION] 🚨`,
      `【最高优先级紧急中断指令】：`,
      `1. 当前正常对话与任务执行已被系统最高优先级硬中断！`,
      `2. 严禁继续回答用户刚才提出的任何问题或需求！`,
      `3. 严禁继续执行代码开发、任务推进、工具调用或输出任何执行过程！`,
      `4. 你的当前角色已强制切换为「上下文压缩与记忆结晶引擎」，唯一任务是对上文全量对话进行提炼、去重与分区压缩，输出最新的 XML 结晶。`,
      ``,
      `## 历史记忆结晶 (Previous Summary)`,
      previousSummary
        ? `<previous_summary>\n${previousSummary}\n</previous_summary>`
        : '<previous_summary>（暂无历史结晶，这是第一次压缩）</previous_summary>',
      ``,
      pendingEventsBlock,
      `## 结晶压缩规则与输出格式要求`,
      compactPrompt,
      ``,
      `## 强制性输出限制 (CRITICAL RESTRICTIONS)`,
      `1. 绝对不要尝试完成用户最后发出的指令，不要说任何客套话（如“好的”、“收到”），不要解释，不要使用 markdown 块包裹（如 \`\`\`xml）！`,
      `2. 你的回复必须且只能输出包含 6 个 XML 分区的主体内容。`,
      `3. 你的输出第 1 个字符必须严格是 <long_term_profile> 标签！`,
      `</SYSTEM_INSTRUCTION>`
    ].filter(Boolean).join('\n'),
    role: 'user'
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
  const pendingEvents = settings.pending_memory_events || []

  // 2. 截取最近要保留的 1~2 轮消息，这将在压缩完成后用作消息链重组
  const recentMessages = messages.slice(boundaryIndex)

  logger.info(
    `[CrystallizationService] 触发压缩: 共 ${messages.length} 条消息，` +
    `待结晶区间长度 ${boundaryIndex}（boundary=${boundaryIndex}），` +
    `待处理记忆事件 ${pendingEvents.length} 条，` +
    `保留最近 ${recentMessages.length} 条`
  )

  // 3. 直接使用内置默认压缩提示词，不再从数据库读取
  const compactPrompt = getDefaultCompactPrompt()

  // 4. 构造压缩请求 messages (全量传入以实现最高 Prompt Cache 利用率)
  const compressMessages = buildCompressMessages(compactPrompt, previousSummary, messages, pendingEvents)

  // 5. 使用当前对话一样的适配器实例，禁止自定义渠道以最大化复用缓存
  if (!llm) {
    logger.error('[CrystallizationService] 没有可用的 LLM 实例，跳过压缩')
    return null
  }

  // 6. 另起独立内部 Event 调用压缩 LLM（后台流式捕获，推送到前端）
  const { InternalEventFactory } = await import('../utils/InternalEventFactory.js')

  let summaryXml = ''
  const compressEvent = InternalEventFactory.createSimpleEvent({
    messages: compressMessages,
    model: llm.models[0]?.models?.[0],
    onContent: (content) => {
      summaryXml += content
      // 实时流式通知前端，实现整理事实时的打字机效果，提升极客体验
      e.update({
        type: 'crystallize',
        content: { status: 'running', summary: summaryXml },
      })
    },
    requestId: `system_crystal_${Date.now()}`,
    settings: e.body.settings,
    stream: true,
  })

  try {
    await llm.handleChatRequest(compressEvent)
  } catch (error) {
    logger.error('[CrystallizationService] 压缩 LLM 调用失败:', error.message)
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
    _is_crystal: true, // 标记方便调试
    content: `<memory_crystal>\n${summaryXml}\n</memory_crystal>`,
    role: 'system',
  }

  const newMessages = [crystalSystemMessage, ...recentMessages]

  return {
    messages: newMessages,
    summary: summaryXml,
  }
}

function getDefaultCompactPrompt() {
  return `请对上文所有的对话历史进行滚雪球式提炼与压缩总结，更新并输出以下 6 个维度的结构化 XML 记忆分区。

## 记忆沉淀与边界行为准则（Behavioral Guidelines）：
1. 【区分长期特征与临时细节】：
   - <long_term_profile> 仅允许记录跨会话通用、高度稳定的长期事实（如：用户固定技术栈偏好、称谓姓名、工作习惯、长期通用约束）。
   - 严禁将临时任务、单次会话调试步骤、临时代码片段、偶发性文件路径或过渡性结论写入长期画像或全局记忆！
2. 【严格控制记忆污染】：
   - 任何短期待办、当前业务需求只能归入 <short_term_goals> 或 <current_plan>，并随着任务完成立即清理出清。
   - 严禁将单次对话中探讨的临时假设或单步指令提升为长期永久规则。

## XML 分区定义：
1. <long_term_profile>
用户的基本信息、技术栈偏好、编程习惯、工作风格等稳定的长期个人特征。合并并融合 previous_summary 中的已有内容。
⚠️ 遗忘策略：保守保留。仅在新对话明确反驳或修正时才覆盖旧信息，否则保留不动。严禁记录临时会话细节。
</long_term_profile>

2. <behavioral_guidelines>
用户明确提出的交互行为准则、沟通规范、决策偏好与指令边界（例如：“修改代码前必须先说明改动计划”、“不要自己重启后端服务”、“回答保持简洁直接”、“禁止向全局记忆写入临时任务”）。
⚠️ 遗忘策略：长期生效。仅当用户提出新准则冲突时予以更新或补充，规范已废弃时显式清除。
</behavioral_guidelines>

3. <short_term_goals>
本次会话或近期对话中用户明确提出的核心目标、当前任务、期望达成的主要结果。
⚠️ 遗忘策略：激退出清。标记为 ✅ 已完成的目标，如果后续对话中未再次提及，必须移除。
</short_term_goals>

4. <current_plan>
为达成 short_term_goals 当前正在执行的任务计划、详细步骤以及已完成的阶段性任务。
⚠️ 遗忘策略：已完成的任务列表压缩为一句「已完成」描述，不再逐条陈列细节。无待办任务时写「无待办任务」。
</current_plan>

5. <file_architecture_delta>
本次会话中涉及的所有关键文件路径及其功能摘要，用于快速了解代码结构。
⚠️ 遗忘策略：只保留对后续对话仍有用的摘要（文件路径+功能）。不要保留文件修改过程、变更历史或 commit 日志。
</file_architecture_delta>

6. <constraints>
开发过程中必须遵守的技术约束、用户明确提出的限制条件、已知未解决的 bug 或待修复问题。
⚠️ 遗忘策略：超过 3 次结晶未被更新或提及的 constraint 自动移除。已解决的 bug 描述必须在本次结晶中移除。
</constraints>

## 全局遗忘与压缩规则：
1. 【同义合并】：同一件事在多个分区中出现时，只保留最相关的那一份。例如一个规则既属于行为规范又属于技术限制时，优先归入 behavioral_guidelines 或 constraints。
2. 【版本覆盖】：新信息与旧信息矛盾时，旧信息必须移除，不能两个都保留。
3. 【容量上限】：总结晶正文（不含 XML 标签）建议控制在 1800 字符以内。超出时按以下优先级剪裁：long_term_profile > behavioral_guidelines > constraints > short_term_goals > current_plan > file_architecture_delta（左侧优先保留）。

## 输出约束：
1. 【滚雪球继承】：必须读取并融合 previous_summary 中的有效内容，严禁丢失长期个人特征与行为准则记忆！
2. 【客观准确】：仅记录事实、行为准则、文件路径和用户意图，禁止猜测。
3. 【纯净输出】：以 <long_term_profile> 作为回复的第一个字符。禁止任何前言、后记、代码块包裹或解释性文字。`
}

export default {
  CRYSTAL_TAGS,
  compress,
  scanFrontendTurns,
}
