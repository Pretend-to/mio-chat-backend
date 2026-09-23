const SESSION_YOLO_META_KEY = 'session_yolo'

/**
 * Read the session-scoped shell execution override.
 *
 * The state is kept in agent metadata as a map so it works unchanged across
 * the legacy filesystem, shadow, and database persistence implementations.
 */
export async function getSessionYolo(memory, sessionId) {
  if (!memory || !sessionId || typeof memory.getAgentMeta !== 'function') {
    return false
  }
  const states = await memory.getAgentMeta(SESSION_YOLO_META_KEY, {})
  if (!states || typeof states !== 'object') return false

  // 子 Session 动态继承根会话的执行策略，避免派发时复制状态后失同步。
  let currentId = String(sessionId)
  const visited = new Set()
  while (currentId && !visited.has(currentId)) {
    if (states[currentId] === true) return true
    visited.add(currentId)
    if (typeof memory.getSessionParentId === 'function') {
      const parentSessionId = await memory.getSessionParentId(currentId)
      currentId = parentSessionId ? String(parentSessionId) : ''
      continue
    }
    if (typeof memory.getSession !== 'function') break
    const session = await memory.getSession(currentId)
    currentId = session?.parentSessionId ? String(session.parentSessionId) : ''
  }
  return false
}

/** Set or clear the session-scoped shell execution override. */
export async function setSessionYolo(memory, sessionId, enabled) {
  if (!memory || !sessionId || typeof memory.getAgentMeta !== 'function' || typeof memory.setAgentMeta !== 'function') {
    throw new Error('Session yolo state requires a session-aware memory store')
  }
  const current = await memory.getAgentMeta(SESSION_YOLO_META_KEY, {})
  const states = current && typeof current === 'object' && !Array.isArray(current)
    ? { ...current }
    : {}
  if (enabled) states[sessionId] = true
  else delete states[sessionId]
  await memory.setAgentMeta(SESSION_YOLO_META_KEY, states)
  return Boolean(enabled)
}

export { SESSION_YOLO_META_KEY }
