/**
 * lib/chat/llm/events/constants.js
 * 正交场景模型与事件常量定义
 */

/**
 * 维度 1: 流量来源 (Source)
 */
export const EVENT_SOURCE = Object.freeze({
  WEB: 'web',           // Web 浏览器客户端
  CHANNEL: 'channel',   // 外部渠道 (微信、飞书、钉钉、Telegram 等)
  PROXY: 'proxy',       // HTTP OpenAI 代理 (/oai-proxy)
  INTERNAL: 'internal', // 系统内部单次调用 (标题生成、摘要等)
  WAKE: 'wake',         // 指向已有 Agent Session 的候选唤醒
})

/**
 * 维度 2: 会话形态 (ConversationKind)
 */
export const CONVERSATION_KIND = Object.freeze({
  DIRECT: 'direct', // 单聊 / 私聊
  GROUP: 'group',   // 多人 / 多 Agent 群聊
  NONE: 'none',     // 无会话概念 (如独立代理请求、系统内部单次提取)
})

/**
 * 维度 3: 触发性质 (TriggerKind)
 */
export const TRIGGER_KIND = Object.freeze({
  INTERACTIVE: 'interactive', // 人类实时交互输入
  TASK: 'task',               // 后台定时任务 / 触发器自动化执行
  SYSTEM: 'system',           // 系统自主任务 (如自动起标题)
})

const VALID_SOURCES = new Set(Object.values(EVENT_SOURCE))
const VALID_CONVERSATION_KINDS = new Set(Object.values(CONVERSATION_KIND))
const VALID_TRIGGER_KINDS = new Set(Object.values(TRIGGER_KIND))

/**
 * 验证三维场景参数是否合法
 * @param {object} param0
 * @param {string} param0.source
 * @param {string} param0.conversationKind
 * @param {string} param0.triggerKind
 * @returns {void}
 * @throws {TypeError} 若存在非法枚举值
 */
export function assertValidSceneDimensions({ source, conversationKind, triggerKind }) {
  if (!VALID_SOURCES.has(source)) {
    throw new TypeError(
      `[ChatEvent] 无效的 source: "${source}"，必须为: ${[...VALID_SOURCES].join(', ')}`,
    )
  }
  if (!VALID_CONVERSATION_KINDS.has(conversationKind)) {
    throw new TypeError(
      `[ChatEvent] 无效的 conversationKind: "${conversationKind}"，必须为: ${[...VALID_CONVERSATION_KINDS].join(', ')}`,
    )
  }
  if (!VALID_TRIGGER_KINDS.has(triggerKind)) {
    throw new TypeError(
      `[ChatEvent] 无效的 triggerKind: "${triggerKind}"，必须为: ${[...VALID_TRIGGER_KINDS].join(', ')}`,
    )
  }
}
