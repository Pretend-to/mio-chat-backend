/**
 * CrystallizationService - 无状态上下文记忆结晶服务
 *
 * 核心职责：
 * 1. 扫描前端轮次边界（避免切断 tool_calls 对话）
 * 2. 构造滚雪球式 XML 结晶压缩 prompt
 * 3. 启动独立内部 Event 调用压缩 LLM
 * 4. 返回重组后的新 messageChain（XML crystal system msg + 最近1~2轮原始消息）
 */

import SystemSettingsService from '../../../database/services/SystemSettingsService.js'

// 分区 XML 结晶的标签名
const CRYSTAL_TAGS = [
  'long_term_profile',
  'short_term_goals',
  'current_plan',
  'file_architecture_delta',
  'constraints',
]

/**
 * 往指定 XML 分区中追加记忆 facts 的工具函数 (与前端 logic 对齐)
 */
export function appendToXmlZone(xmlStr, tagName, content) {
  const openTag = `<${tagName}>`
  const closeTag = `</${tagName}>`
  const str = xmlStr || ''
  if (str.includes(openTag)) {
    return str.replace(closeTag, `\n${content}\n${closeTag}`)
  }
  return str + `\n${openTag}\n${content}\n${closeTag}`
}

/**
 * 解析 XML 分区
 */
export function parseXmlZones(xmlStr) {
  const result = {}
  CRYSTAL_TAGS.forEach(key => {
    const openTag = `<${key}>`
    const closeTag = `</${key}>`
    const startIdx = xmlStr ? xmlStr.indexOf(openTag) : -1
    const endIdx = xmlStr ? xmlStr.indexOf(closeTag) : -1
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      result[key] = xmlStr.slice(startIdx + openTag.length, endIdx).trim()
    } else {
      result[key] = ''
    }
  })
  return result
}

/**
 * 重组 XML 分区
 */
export function buildXmlFromZones(zones) {
  return CRYSTAL_TAGS.map(key => {
    const content = (zones[key] || '').trim()
    return `<${key}>\n${content}\n</${key}>`
  }).join('\n\n')
}

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
 * @param {number} keepTurns - 要保留的完整前端轮次数（默认 2）
 * @returns {number} boundaryIndex - 保留区间的起始索引（包含），其前面的消息将被压缩
 */
export function scanFrontendTurns(messages, keepTurns = 2) {
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
      `[系统指令：请基于以上所有对话历史，进行上下文记忆结晶任务]`,
      ``,
      `请结合下方的历史记忆结晶（previous_summary，可能为空），对上述所有对话历史进行滚雪球式压缩总结，并在本次回复中输出最新的结构化 XML 记忆结晶。`,
      ``,
      `## 历史记忆结晶 (Previous Summary)`,
      previousSummary
        ? `<previous_summary>\n${previousSummary}\n</previous_summary>`
        : '<previous_summary>（暂无历史结晶，这是第一次压缩）</previous_summary>',
      ``,
      `## 压缩要求与输出格式`,
      compactPrompt,
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
export async function compress(e, llmService) {
  const messages = e.body.messages || []
  const settings = e.body.settings || {}
  let previousSummary = settings.previous_summary || null
  const keepTurns = settings.crystallization_keep_turns ?? 2

  // 1. 扫描当前整个消息链，提取出所有在本次请求中 AI 刚刚成功记录但前端还没来得及落盘的 memory 工具调用记忆
  //    实时追加到 previousSummary 中，完美解决后端无状态拦截在工具链迭代时的竞态信息丢失问题
  messages.forEach((msg) => {
    if (msg.role === 'assistant' && msg.tool_calls) {
      msg.tool_calls.forEach(tc => {
        const toolName = (tc.function?.name || tc.name || '').split('_mid_')[0]
        if (toolName === 'memory') {
          const toolCallId = tc.id
          const resultMsg = messages.find(m => m.role === 'tool' && m.tool_call_id === toolCallId)
          if (resultMsg) {
            let resultData = resultMsg.content
            if (typeof resultData === 'string') {
              try { resultData = JSON.parse(resultData) } catch (err) {}
            }
            if (resultData && (resultData.success === true || resultData.message === '记忆成功' || String(resultData.success) === 'true' || resultData.summary)) {
              let args = tc.function?.arguments || tc.arguments
              if (typeof args === 'string') {
                try { args = JSON.parse(args) } catch (err) {}
              }
              if (args) {
                logger.info(`[CrystallizationService] 实时捕获工具链中的新记忆操作: ${JSON.stringify(args)}，融合入压缩源`)
                previousSummary = applyMemoryCrud(previousSummary, args)
              }
            }
          }
        }
      })
    }
  })

  // 2. 扫描边界：确定要保留的最近 N 个前端轮次的起始位置
  const boundaryIndex = scanFrontendTurns(messages, keepTurns)

  // 如果边界是 0，说明没有可压缩的内容，直接返回 null（不压缩）
  if (boundaryIndex <= 0) {
    logger.debug('[CrystallizationService] 消息链过短，跳过压缩')
    return null
  }

  // 2. 切割：待压缩的旧消息段 vs 要保留的最近轮次
  //    注意：旧消息段中过滤掉 system 消息（它们会被 previousSummary 代替）
  const messagesToCompress = messages.slice(0, boundaryIndex)
  const recentMessages = messages.slice(boundaryIndex)

  logger.info(
    `[CrystallizationService] 触发压缩: 共 ${messages.length} 条消息，` +
    `压缩前 ${messagesToCompress.length} 条（boundary=${boundaryIndex}），` +
    `保留最近 ${recentMessages.length} 条`
  )

  // 3. 获取压缩提示词
  let compactPrompt
  try {
    const promptSetting = await SystemSettingsService.get('system_llm_compact_prompt')
    compactPrompt = promptSetting?.value
  } catch (err) {
    logger.warn('[CrystallizationService] 获取压缩提示词失败，使用内置提示词', err.message)
  }

  if (!compactPrompt) {
    compactPrompt = getDefaultCompactPrompt()
  }

  // 4. 构造压缩请求 messages
  const compressMessages = buildCompressMessages(compactPrompt, previousSummary, messagesToCompress)

  // 5. 获取 LLM 实例（使用系统指定渠道，或第一个可用渠道）
  let llm
  try {
    const channelSetting = await SystemSettingsService.get('system_llm_channel')
    const channelId = channelSetting?.value
    llm = llmService.llms[channelId] || Object.values(llmService.llms)[0]
  } catch (err) {
    llm = Object.values(llmService.llms)[0]
  }

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

/**
 * 默认的分区 XML 压缩提示词（兜底）
 */
function getDefaultCompactPrompt() {
  return `你是一个专业的对话上下文压缩专家。请对提供的对话历史进行滚雪球式压缩总结，生成结构化的 XML 记忆结晶。

## 输入格式
- <previous_summary>：上次已生成的 XML 结晶（可能为空）
- <new_messages>：本次新增的对话内容

## 输出格式
请严格输出以下 XML 结构，不要添加任何解释性文字：

<long_term_profile>
用户的基本信息、技术偏好、编程习惯、工作风格等稳定的长期特征。
合并 previous_summary 中已有的信息，去除冗余。
</long_term_profile>

<short_term_goals>
本次会话或近期对话中用户明确提出的目标、需求、期望结果。
</short_term_goals>

<current_plan>
当前正在执行的任务计划、步骤进度、已完成的里程碑。
</current_plan>

<file_architecture_delta>
涉及的文件路径、代码结构变更、新增或修改的关键函数/模块。
</file_architecture_delta>

<constraints>
必须遵守的技术约束、用户明确的限制条件、已知的 bug 或待修复问题。
</constraints>

## 重要规则
1. 旧结晶的有效信息必须被继承和融合，不要丢失重要上下文
2. 无效、过时的信息可以被新信息替代
3. 保持简洁，每个区块聚焦关键信息，避免冗余
4. 严格保持 XML 格式，不要输出 XML 标签以外的内容`
}

export default {
  compress,
  scanFrontendTurns,
  CRYSTAL_TAGS,
}
