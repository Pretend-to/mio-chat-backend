import sessions from '../server/socket.io/services/sessions.js'

const keyOf = (requestId, interactionId) =>
  `${String(requestId)}:${String(interactionId)}`

/** Route asynchronous child-Agent approvals through the global admin queue. */
export class ApprovalNotificationBroker {
  constructor({ sessionPool = sessions, ttlMs = 5 * 60 * 1000 } = {}) {
    this.sessionPool = sessionPool
    this.ttlMs = ttlMs
    this.pending = new Map()
  }

  register({ action, event, interactionId, target }) {
    const requestId =
      target.requestId ||
      `approval_${target.subagentRunId || 'agent'}_${interactionId}`
    const item = {
      action: {
        ...action,
        meta: {
          ...action?.meta,
          approvalSource: target.approvalSource || 'subagent',
          parentSessionId: target.parentSessionId || null,
          sourceSessionId: target.sourceSessionId || null,
          subagentRunId: target.subagentRunId || null,
        },
        prompt:
          target.approvalSource === 'subagent'
            ? `SubAgent「${target.label || target.subagentRunId || '后台任务'}」请求授权：${action?.prompt || '是否允许执行？'}`
            : action?.prompt,
      },
      contactorId: String(target.agentId),
      event,
      interactionId: String(interactionId),
      parentSessionId: target.parentSessionId || null,
      requestId: String(requestId),
      timer: null,
    }
    item.timer = setTimeout(() => {
      const key = keyOf(item.requestId, item.interactionId)
      if (!this.pending.has(key)) return
      this.pending.delete(key)
      item.event.emitInteraction(item.interactionId, {
        approved: false,
        reason: '审批超时已自动拒绝',
      })
      this._notifyResolution(item, 'failed', '审批超时已自动拒绝')
    }, this.ttlMs)
    item.timer.unref?.()
    this.pending.set(keyOf(item.requestId, item.interactionId), item)
    for (const client of this.sessionPool.getAllAdminClients() || []) {
      this.notifyClient(client, item.contactorId)
    }
    return item.requestId
  }

  notifyClient(client, contactorId = null) {
    if (!client?.isAdmin || typeof client.sendOpenaiMessage !== 'function') {
      return 0
    }
    let count = 0
    for (const item of this.pending.values()) {
      if (
        contactorId !== null &&
        contactorId !== undefined &&
        String(item.contactorId) !== String(contactorId)
      )
        continue
      client.sendOpenaiMessage(
        'update',
        {
          content: item.action,
          metaData: {
            agentId: item.contactorId,
            approvalSource: item.action.meta?.approvalSource,
            contactorId: item.contactorId,
            interactionOnly: true,
            messageId: item.requestId,
            parentSessionId: item.parentSessionId,
            sessionId: item.parentSessionId,
            subagentRunId: item.action.meta?.subagentRunId,
            triggerType: 'subagent_approval',
          },
          type: 'action',
        },
        item.requestId,
      )
      count += 1
    }
    return count
  }

  respond({ interactionId, payload, requestId }) {
    const key = keyOf(requestId, interactionId)
    const item = this.pending.get(key)
    if (!item) return false
    const handled = item.event.emitInteraction(item.interactionId, payload)
    if (handled) {
      clearTimeout(item.timer)
      this.pending.delete(key)
      this._notifyResolution(item, 'complete')
    }
    return handled
  }

  _notifyResolution(item, type, error = null) {
    for (const client of this.sessionPool.getAllAdminClients() || []) {
      client.sendOpenaiMessage?.(
        type,
        {
          ...(error ? { message: error } : {}),
          metaData: {
            agentId: item.contactorId,
            approvalSource: item.action.meta?.approvalSource,
            contactorId: item.contactorId,
            interactionOnly: true,
            messageId: item.requestId,
            parentSessionId: item.parentSessionId,
            sessionId: item.parentSessionId,
            subagentRunId: item.action.meta?.subagentRunId,
            triggerType: 'subagent_approval',
          },
        },
        item.requestId,
      )
    }
  }

  clear() {
    for (const item of this.pending.values()) clearTimeout(item.timer)
    this.pending.clear()
  }
}

export const approvalNotificationBroker = new ApprovalNotificationBroker()
export default approvalNotificationBroker
