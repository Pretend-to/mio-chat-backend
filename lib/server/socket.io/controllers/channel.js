import { coalesceCrystallizeEvents } from '../../../chat/crystallizationContent.js'
import { normalizeMessageTime } from '../../../chat/messageTimestamp.js'

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

/** Channel is transport-only. Conversation RPC must use Agent + Session. */
export async function handleChannelMessage(client, message) {
  client.send({
    code: 1,
    message: `Channel ${message.id} 仅是 I/O 连接，不能执行 ${message.type}；请使用 agentId + sessionId 调用 Agent 协议`,
    protocol: 'channel',
    request_id: message.request_id,
  })
}
