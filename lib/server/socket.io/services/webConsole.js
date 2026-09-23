import { randomBytes } from 'node:crypto'
import sessions from './sessions.js'

const DEFAULT_TIMEOUT = 15000

// requestId → { resolve, reject, timer, clientId }
const pending = new Map()

function summarize(client) {
  return {
    clientId: client.socket?.id || null,
    userId: client.id,
    ip: client.ip || '',
    origin: client.origin || '',
    userAgent: client.socket?.handshake?.headers?.['user-agent'] || '',
  }
}

/**
 * 调用者名下的前端连接。
 * 作用域铁律：只认 principalId 相同的连接（ChatEvent 保证 user.id === principalId），
 * 所以普通用户也只能操作自己的浏览器，跨用户不可能。
 */
function scopedClients(principalId) {
  return sessions
    .getAllClients()
    .filter((client) => String(client.id) === String(principalId))
}

/** 调用者名下的在线前端列表（web_console 点名用） */
export function listClients({ principalId, callerSocketId }) {
  return scopedClients(principalId).map((client) => ({
    ...summarize(client),
    self: client.socket?.id === callerSocketId,
  }))
}

/**
 * 让指定前端在页面里执行一段 JS，等它把结果回传。
 * 前端实现见 mio-chat-frontend/src/lib/webConsole.js。
 */
export function exec({
  principalId,
  callerSocketId,
  clientId,
  code,
  timeoutMs = DEFAULT_TIMEOUT,
}) {
  const targetId = clientId || callerSocketId
  const client = scopedClients(principalId).find(
    (item) => item.socket?.id === targetId,
  )
  if (!client) {
    throw new Error(`目标前端不在你名下的连接里：${targetId}`)
  }
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
export function handleResult(event) {
  const entry = pending.get(event.request_id)
  if (!entry) {
    return
  }
  clearTimeout(entry.timer)
  pending.delete(event.request_id)
  entry.resolve(event.data)
}

export default { exec, handleResult, listClients }
