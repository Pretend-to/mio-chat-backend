/**
 * WechatChannel 的 llmProcessor 工厂（可注入，默认可实现先跑通全链路）
 *
 * llm.process(ctx) 契约：
 *   ctx = { sessionId, soul, globalMem, chat, text, guidance? }
 *   返回 = { text, crystal? }，crystal 为可选的本会话结晶/记忆摘要更新（写入 session.crystal）
 */
export function createEchoLlm({ prefix = '' } = {}) {
  return {
    process: async (ctx) => ({ text: `${prefix}${ctx.text}` }),
  }
}

/**
 * 接入 miochat 真实 LLM 后端的工厂（占位，M2.5/M4）。
 * 目标：用 soul/global/chat 组装 messages → 调 lib/chat/llm adapter → 返回完整 text + 走结晶更新 crystal。
 * 未接好前回落 echo，方便本地无模型配置也能端到端跑通。
 */
export function createBackendLlm(opts = {}) {
  validateOpts(opts)
  return createEchoLlm()
}
function validateOpts() {} // 保留扩展点

export default { createEchoLlm, createBackendLlm }