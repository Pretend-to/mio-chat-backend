import { randomBytes } from 'node:crypto'
import sessions from './sessions.js'
import { describeBrowser } from './browserContext.js'
import logger from '../../../../utils/logger.js'

const DEFAULT_TIMEOUT = 15000

// requestId → { resolve, reject, timer, clientId }
const pending = new Map()

export function resolveConsoleCaller(e) {
  const event = e?.parentEvent || e?.event || e || {}
  const client = event.channelContext?.webClient || event.client
  return {
    principalId: String(event.principalId || event.principal?.id || ''),
    callerSocketId: client?.socket?.id || null,
    agentId: event.agentId || null,
    sessionId: event.sessionId || event.channelContext?.sessionId || null,
    // Headless system/channel admin Agents share the system's admin browsers.
    // A Web principal always stays confined to that authenticated Web user.
    allowAdminBrowsers: Boolean(
      event.agentId &&
      event.user?.isAdmin &&
      !String(event.principalId || '').startsWith('web:'),
    ),
  }
}

function scopedClients({ principalId, allowAdminBrowsers }) {
  const id = String(principalId || '').replace(/^web:/, '')
  if (!id && !allowAdminBrowsers) return []
  return sessions
    .getAllClients()
    .filter(
      (client) =>
        client.socket &&
        client.socket.connected !== false &&
        (String(client.id) === id ||
          (allowAdminBrowsers && client.isAdmin === true)),
    )
}

export function listClients(caller) {
  return scopedClients(caller).map((client) => {
    const { userAgent: _userAgent, ...environment } = describeBrowser(client)
    return {
      ...environment,
      clientId: client.socket.id,
      userId: client.id,
      ip: client.ip || '',
      self: client.socket.id === caller.callerSocketId,
      agentId: client.activeAgentId || client.activeContactorId || null,
      sessionId: client.activeSessionId || null,
      capabilities: ['console'],
    }
  })
}

export function selectClient(caller, clientId) {
  const clients = scopedClients(caller)
  if (clientId) {
    const exact = clients.find((c) => c.socket.id === clientId)
    const matching = exact
      ? [exact]
      : clients.filter((c) => describeBrowser(c).id === clientId)
    if (matching.length > 1)
      throw new Error('标签页标识重复，请使用 list 中的连接 clientId')
    const target = matching[0]
    if (!target)
      throw new Error(`目标浏览器离线或不属于当前调用者：${clientId}`)
    return target
  }
  const current = clients.find((c) => c.socket.id === caller.callerSocketId)
  if (current) return current
  const observing = clients.filter(
    (c) =>
      caller.agentId &&
      (c.activeContactorId || c.activeAgentId) === caller.agentId &&
      (!caller.sessionId || c.activeSessionId === caller.sessionId),
  )
  if (observing.length === 1) return observing[0]
  if (clients.length === 1) return clients[0]
  throw new Error(
    clients.length
      ? '有多个在线浏览器，请先 list 并指定 clientId'
      : '没有可用的在线浏览器',
  )
}

/**
 * 让指定前端在页面里执行一段 JS，等它把结果回传。
 * 前端实现见 mio-chat-frontend/src/lib/webConsole.js。
 */
export function exec({
  code,
  timeoutMs = DEFAULT_TIMEOUT,
  clientId,
  ...caller
}) {
  const client = selectClient(caller, clientId)
  const targetId = client.socket.id
  timeoutMs = Math.min(60000, Math.max(1, Number(timeoutMs) || DEFAULT_TIMEOUT))
  if (typeof code !== 'string' || !code.trim()) {
    throw new Error('code 不能为空')
  }

  const requestId = `wc_${randomBytes(8).toString('hex')}`
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId)
      reject(new Error(`前端执行超时（${timeoutMs}ms）：${targetId}`))
    }, timeoutMs)

    pending.set(requestId, { clientId: targetId, reject, resolve, timer })
    logger.info(`[WebConsole] 下发命令到 ${targetId}：${code.slice(0, 120)}`)
    client.send({
      data: { code },
      protocol: 'console',
      request_id: requestId,
      type: 'exec',
    })
  })
}

/** 前端回传执行结果（由 services/client.js 转发进来） */
export function handleResult(event, client) {
  const entry = pending.get(event.request_id)
  if (!entry || client?.socket?.id !== entry.clientId) {
    return
  }
  clearTimeout(entry.timer)
  pending.delete(event.request_id)
  entry.resolve(event.data)
}

export function disconnectClient(clientId) {
  for (const [requestId, entry] of pending) {
    if (entry.clientId !== clientId) continue
    clearTimeout(entry.timer)
    pending.delete(requestId)
    entry.reject(new Error(`浏览器已断开：${clientId}`))
  }
}

export default { exec, handleResult, listClients, disconnectClient }
