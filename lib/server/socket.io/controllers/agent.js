import { getChannelRuntime } from '../../http/controllers/channelController.js'
import { coalesceCrystallizeEvents } from '../../../chat/crystallizationContent.js'
import { normalizeMessageTime } from '../../../chat/messageTimestamp.js'
import SessionTurnService from '../../../chat/sessions/SessionTurnService.js'
import { setSessionYolo } from '../../../chat/sessionExecutionState.js'
import {
  formatWebErrorMessage,
  parseErrorDetails,
} from '../../../../utils/errorFormatter.js'

let turnService = null

export function buildWebPrincipal(client) {
  return {
    externalUserId: String(client.id),
    id: `web:${client.id}`,
    isAdmin: client.isAdmin === true,
    role: client.isAdmin === true ? 'system_admin' : 'user',
  }
}

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

export function buildAgentHistory(chat, payload = {}, ctx = {}) {
  const total = chat.length
  const limit = Math.max(1, parseInt(payload.limit, 10) || 20)
  const before = payload.before == null ? null : Number(payload.before)
  const resolveTime = (item, index) =>
    normalizeMessageTime(item.time) ||
    normalizeMessageTime(item.createdAt) ||
    normalizeMessageTime(item.created_at) ||
    Math.max(
      0,
      (normalizeMessageTime(ctx.sessionCreatedAt) || Date.now()) + index,
    )
  let endIndex = chat.length
  if (Number.isFinite(before)) {
    const found = chat.findIndex(
      (item, index) => resolveTime(item, index) >= before,
    )
    if (found >= 0) endIndex = found
  }
  const startIndex = Math.max(0, endIndex - limit)
  const messages = chat.slice(startIndex, endIndex).map((item, offset) => {
    const index = startIndex + offset
    const time = resolveTime(item, index)
    const persistedStatus = item.persistence_status
    const status =
      item.status ||
      (persistedStatus === 'streaming'
        ? 'streaming'
        : persistedStatus && persistedStatus !== 'final'
          ? 'failed'
          : 'completed')
    return {
      content:
        Array.isArray(item.content) && item.content.length
          ? coalesceCrystallizeEvents(item.content)
          : status === 'streaming'
            ? [{ data: {}, type: 'blank' }]
            : [{ data: { text: '' }, type: 'text' }],
      id: item.id || `hist_${ctx.sessionId}_${index}_${time}`,
      role: item.role === 'user' ? 'user' : 'other',
      senderAvatar: item.role === 'user' ? '' : ctx.agent?.avatar || '',
      senderName: item.role === 'user' ? '用户' : ctx.agent?.name || 'Agent',
      status,
      time,
      ...(item.metadata?.triggerType
        ? { triggerType: item.metadata.triggerType }
        : {}),
      ...(item.metadata?.wakeType ? { wakeType: item.metadata.wakeType } : {}),
      ...(item.toolCalls ? { toolCalls: item.toolCalls } : {}),
    }
  })
  return { hasMore: startIndex > 0, messages, total }
}

export async function handleAgentMessage(client, message) {
  const { type, id: agentId, data = {}, request_id } = message
  try {
    const runtime = getChannelRuntime()
    const prisma = await runtime.channelStore._database()
    const agent = await prisma.agent.findUnique({
      where: { id: String(agentId) },
    })
    if (!agent) throw new Error(`Agent ${agentId} 未找到`)
    const sessionId = String(data.sessionId || agent.defaultSessionId || '')
    if (!sessionId) throw new Error(`Agent ${agentId} 没有默认 Session`)
    const sessionRow = await prisma.session.findUnique({
      where: { id: sessionId },
    })
    if (!sessionRow || sessionRow.agentId !== agent.id)
      throw new Error(`Session ${sessionId} 不属于 Agent ${agentId}`)
    const memory = await service().getMemory(agent.id)

    if (type === 'history') {
      const session = (await memory.getSession(sessionId)) || {
        chat: [],
        crystal: '',
      }
      const result = buildAgentHistory(
        Array.isArray(session.chat) ? session.chat : [],
        data,
        {
          agent,
          sessionCreatedAt: session.created_at,
          sessionId,
        },
      )
      return client.send({
        code: 0,
        data: { agent, crystal: session.crystal || '', sessionId, ...result },
        message: 'ok',
        protocol: 'agent',
        request_id,
      })
    }

    if (type === 'yolo') {
      if (!client.isAdmin) throw new Error('修改 YOLO 模式需要系统管理员权限')
      const enabled = data.enabled !== false
      const value = await setSessionYolo(memory, sessionId, enabled)
      return client.send({
        code: 0,
        data: { agentId: agent.id, enabled: value, sessionId },
        message: 'ok',
        protocol: 'agent',
        request_id,
      })
    }

    if (type === 'message') {
      const messageId = data.messageId || `msg_${Date.now()}`
      client.send({
        code: 0,
        data: { messageId, status: 'processing' },
        message: 'ok',
        protocol: 'agent',
        request_id,
      })
      service()
        .runTurn({
          agentId: agent.id,
          files: data.files || [],
          from: client.id,
          images: data.images || [],
          isWeb: true,
          messageId,
          userMessageId: data.userMessageId || null,
          principal: buildWebPrincipal(client),
          sessionId,
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
      return
    }

    if (type === 'abort') {
      const aborted = await service().abort({ agentId: agent.id, sessionId })
      return client.send({
        code: 0,
        data: { aborted },
        message: 'ok',
        protocol: 'agent',
        request_id,
      })
    }

    if (type === 'get_soul') {
      return client.send({
        code: 0,
        data: { soul: await memory.readSoul() },
        message: 'ok',
        protocol: 'agent',
        request_id,
      })
    }
    if (type === 'save_soul') {
      await memory.writeSoul(data.soul || '')
      return client.send({
        code: 0,
        data: { success: true },
        message: 'ok',
        protocol: 'agent',
        request_id,
      })
    }
    if (type === 'get_memory') {
      const globals = {}
      for (const category of await memory.listGlobalCategories())
        globals[category] = await memory.readGlobal(category)
      const session = await memory.getSession(sessionId)
      return client.send({
        code: 0,
        data: { crystal: session?.crystal || '', globals },
        message: 'ok',
        protocol: 'agent',
        request_id,
      })
    }
    if (type === 'save_crystal') {
      await memory.setCrystal(sessionId, data.crystal || '')
      return client.send({
        code: 0,
        data: { success: true },
        message: 'ok',
        protocol: 'agent',
        request_id,
      })
    }
    if (type === 'save_global') {
      if (data.category)
        await memory.writeGlobal(data.category, data.content || '')
      return client.send({
        code: 0,
        data: { success: true },
        message: 'ok',
        protocol: 'agent',
        request_id,
      })
    }
    throw new Error(`未知的 Agent 协议操作: ${type}`)
  } catch (error) {
    client.send({
      code: 1,
      message: error.message || '操作失败',
      protocol: 'agent',
      request_id,
    })
  }
}
