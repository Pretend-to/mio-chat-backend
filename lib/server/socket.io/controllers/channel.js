import { coalesceCrystallizeEvents } from '../../../chat/crystallizationContent.js'
import { normalizeMessageTime } from '../../../chat/messageTimestamp.js'
import { getChannelRuntime } from '../../http/controllers/channelController.js'
import SessionTurnService from '../../../chat/sessions/SessionTurnService.js'
import {
  formatWebErrorMessage,
  parseErrorDetails,
} from '../../../../utils/errorFormatter.js'

import { buildWebMessageEnvelope } from '../services/browserContext.js'

const SESSION_LEASE_WAIT_MS = 10 * 60 * 1000
let turnService = null

function service() {
  if (!turnService) {
    const runtime = getChannelRuntime()
    turnService = new SessionTurnService({
      channelRuntime: runtime,
      prisma: runtime.prisma || runtime.channelStore?.prisma || null,
    })
  }
  return turnService
}

export function buildWebPrincipal(client) {
  return {
    externalUserId: String(client.id),
    id: `web:${client.id}`,
    isAdmin: client.isAdmin === true,
    role: client.isAdmin === true ? 'system_admin' : 'user',
  }
}

async function handleWebAgentChannelMessage(client, message) {
  const { id: agentId, data = {}, request_id } = message
  try {
    const runtime = getChannelRuntime()
    const prisma = await runtime.channelStore._database()
    const agent = await prisma.agent.findUnique({ where: { id: String(agentId) } })
    if (!agent) throw new Error(`Agent ${agentId} 未找到`)

    const sessionId = String(data.sessionId || agent.defaultSessionId || '')
    if (!sessionId) throw new Error(`Agent ${agentId} 没有默认 Session`)
    const sessionRow = await prisma.session.findUnique({ where: { id: sessionId } })
    if (!sessionRow || sessionRow.agentId !== agent.id)
      throw new Error(`Session ${sessionId} 不属于 Agent ${agentId}`)

    const messageId = data.messageId || `msg_${Date.now()}`
    client.send({
      code: 0,
      data: { messageId, status: 'processing' },
      message: 'ok',
      protocol: 'agent',
      request_id,
    })

    const principal = buildWebPrincipal(client)
    client.activeAgentId = agent.id
    client.activeSessionId = sessionId

    service()
      .runTurn({
        agentId: agent.id,
        envelope: buildWebMessageEnvelope(client, { sessionId, messageId: data.userMessageId || messageId }),
        files: data.files || [],
        from: client.id,
        images: data.images || [],
        isWeb: true,
        messageId,
        userMessageId: data.userMessageId || null,
        onQueued: () => {
          client.sendOpenaiMessage(
            'update',
            {
              content: {
                text: '📥 已收到请求，当前任务正在处理中，您的消息已加入队列，将按顺序执行。',
              },
              metaData: { contactorId: agent.id, messageId },
              type: 'queue_status',
            },
            messageId,
          )
        },
        principal,
        sessionId,
        sessionLeaseWaitMs: SESSION_LEASE_WAIT_MS,
        source: 'web',
        text: data.text || '',
        webClient: client,
      })
      .catch((error) => {
        const details = parseErrorDetails(error)
        client.sendOpenaiMessage(
          'failed',
          {
            code: details.code,
            message: formatWebErrorMessage(error),
            metaData: { contactorId: agent.id, messageId, sessionId },
            requestId: details.requestId,
            status: details.status,
          },
          messageId,
        )
      })
  } catch (error) {
    client.send({
      code: 1,
      message: error.message || '操作失败',
      protocol: 'agent',
      request_id,
    })
  }
}

/** Pure pagination helper. Runtime chat is unavailable through Channel identity. */
export function buildChannelHistory(chat, payload = {}, ctx = {}) {
  const { sessionId = '', channel = {} } = ctx
  const total = chat.length
  const limit = Math.max(1, parseInt(payload.limit, 10) || 20)
  let firstRealIdx = -1
  let firstRealTime = 0
  for (let i = 0; i < chat.length; i++) {
    const time = normalizeMessageTime(chat[i].time)
      || normalizeMessageTime(chat[i].createdAt)
      || normalizeMessageTime(chat[i].created_at)
    if (time) {
      firstRealIdx = i
      firstRealTime = time
      break
    }
  }
  const fallbackAnchor = normalizeMessageTime(ctx.sessionCreatedAt) || Date.now()
  const resolveTime = (item, index) => {
    const real = normalizeMessageTime(item.time)
      || normalizeMessageTime(item.createdAt)
      || normalizeMessageTime(item.created_at)
    if (real) return real
    if (firstRealIdx === -1) return Math.max(0, fallbackAnchor - (total - 1 - index) * 1000)
    return Math.max(0, firstRealTime + (index - firstRealIdx) * 1000)
  }
  let endIndex = chat.length
  if (payload.before != null && Number.isFinite(Number(payload.before))) {
    const found = chat.findIndex((item, index) => resolveTime(item, index) >= Number(payload.before))
    if (found >= 0) endIndex = found
  }
  const startIndex = Math.max(0, endIndex - limit)
  const messages = chat.slice(startIndex, endIndex).map((item, offset) => {
    const index = startIndex + offset
    const time = resolveTime(item, index)
    return {
      content: Array.isArray(item.content) && item.content.length
        ? coalesceCrystallizeEvents(item.content)
        : [{ data: { text: '' }, type: 'text' }],
      id: item.id || `hist_${sessionId}_${index}_${time}`,
      role: item.role === 'user' ? 'user' : 'other',
      senderAvatar: item.role === 'user' ? '' : (channel.avatar || ''),
      senderName: item.role === 'user' ? (item.from_user_id || '用户') : (channel.name || 'Agent'),
      status: item.status || 'completed',
      time,
      ...(item.toolCalls ? { toolCalls: item.toolCalls } : {}),
    }
  })
  return { hasMore: startIndex > 0, messages, total }
}

/** Route normalized Web channel messages into the ServerAgent session pipeline. */
export async function handleChannelMessage(client, message) {
  if (message.channelKind === 'web-agent') {
    return handleWebAgentChannelMessage(client, message)
  }
  client.send({
    code: 1,
    message: `Channel ${message.id} 仅是 I/O 连接，不能执行 ${message.type}；请使用 agentId + sessionId 调用 Agent 协议`,
    protocol: 'channel',
    request_id: message.request_id,
  })
}
