import SessionTurnService from '../chat/sessions/SessionTurnService.js'

const MAX_RESULT_TEXT = 16 * 1024
const MAX_SUMMARY_TEXT = 4 * 1024

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function contentText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((item) => {
      if (typeof item === 'string') return item
      if (item?.type === 'text')
        return item.text || item.content || item.data?.text || ''
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function assistantText(message) {
  return String(message?.text || contentText(message?.content) || '').trim()
}

function truncate(value, max) {
  const text = String(value || '')
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

function buildPrompt(run) {
  const input = parseJson(run.inputJson, {})
  const outputContract = parseJson(run.outputContractJson, {})
  return [
    '你是一个由主 Agent 异步派出的 SubAgent。只处理本次任务，不扩展任务边界。',
    `任务目标：${run.objective}`,
    input.contextDigest ? `主会话上下文摘要：${input.contextDigest}` : '',
    Object.keys(input.input || {}).length
      ? `任务输入：${JSON.stringify(input.input)}`
      : '',
    input.continuationInstruction
      ? `这是同一 SubAgent Session 的后续回合。请保留并利用此前完整上下文，继续执行：${input.continuationInstruction}`
      : '',
    Object.keys(outputContract).length
      ? `输出契约：${JSON.stringify(outputContract)}`
      : '',
    '完成后直接给出最终结果。不要向用户提问，不要等待人工确认，也不要描述内部调度过程。',
  ]
    .filter(Boolean)
    .join('\n\n')
}

export class SubAgentExecutor {
  constructor({ sessionTurns = new SessionTurnService() } = {}) {
    this.sessionTurns = sessionTurns
  }

  async execute(run) {
    const memory = await this.sessionTurns.getMemory(run.agentId)
    const before = await memory.getSession(run.sessionId)
    const previousAssistantCount = (before?.chat || []).filter(
      (message) => message.role === 'assistant',
    ).length

    const subagentContact = {
      agentId: run.agentId,
      groupId: run.groupId,
      id: run.id,
      jobKey: run.jobKey,
      objective: run.objective,
      parentSessionId: run.parentSessionId,
      role: run.subagentRole || run.jobKey || 'SubAgent',
      runId: run.id,
      sessionId: run.sessionId,
      status: run.status,
    }
    await this.sessionTurns.runTurn({
      agentId: run.agentId,
      deliveryMode: 'session_only',
      isTask: true,
      isWeb: false,
      messageId: `msg_subagent_${run.id}`,
      principal: {
        externalUserId: 'subagent-runtime',
        id: 'system:subagent',
        isAdmin: true,
        role: 'system_admin',
      },
      approvalTarget: {
        agentId: run.agentId,
        approvalSource: 'subagent',
        label: run.jobKey || run.objective,
        parentSessionId: run.parentSessionId,
        sourceSessionId: run.sessionId,
        subagentRunId: run.id,
      },
      sessionId: run.sessionId,
      silentQueue: true,
      source: 'subagent',
      streamContactorId: `sub_agent_${run.sessionId}`,
      subagentContact,
      subagentRunId: run.id,
      text: buildPrompt(run),
      toolNames: parseJson(run.toolNamesJson, []),
    })

    const after = await memory.getSession(run.sessionId)
    const assistants = (after?.chat || []).filter(
      (message) => message.role === 'assistant',
    )
    const resultMessage = assistants.slice(previousAssistantCount).at(-1)
    const fullText = assistantText(resultMessage)
    if (!fullText) {
      throw new Error('SubAgent completed without a persisted assistant result')
    }
    if (/<｜｜DSML｜｜\s*calls>|<tool_calls?>/iu.test(fullText)) {
      throw new Error(
        'SubAgent returned unexecuted tool-call markup instead of a final result',
      )
    }
    const resultText = truncate(fullText, MAX_RESULT_TEXT)
    return {
      resultJson: {
        messageId: resultMessage.id || null,
        sessionId: run.sessionId,
        summary: truncate(fullText, MAX_SUMMARY_TEXT),
        truncated: resultText.length < fullText.length,
      },
      resultText,
    }
  }

  async abort(run) {
    return await this.sessionTurns.abort({
      agentId: run.agentId,
      sessionId: run.sessionId,
    })
  }
}

export default SubAgentExecutor
