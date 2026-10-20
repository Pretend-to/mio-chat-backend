import {
  CONVERSATION_KIND,
  EVENT_SOURCE,
  TRIGGER_KIND,
} from '../constants.js'

/** Turn a durable inbox row into a side-effect-free candidate ChatEvent. */
export const WakeNormalizer = {
  normalize(workItem) {
    if (!workItem?.id || !workItem?.agentId || !workItem?.sessionId ||
        !workItem?.eventId || !workItem?.instruction) {
      throw new TypeError('[WakeNormalizer] 持久化工作项缺少身份或指令')
    }
    let principal = null
    try {
      principal = workItem.principalJson
        ? JSON.parse(workItem.principalJson)
        : null
    } catch {
      principal = null
    }
    const eventId = String(workItem.eventId)
    const instruction = String(workItem.instruction)
    return {
      actorId: `wake:${workItem.wakeKind || workItem.kind}`,
      agentId: String(workItem.agentId),
      cacheOwnerIds: [],
      contactorId: String(workItem.agentId),
      conversationKey: String(workItem.conversationKey),
      conversationKind: CONVERSATION_KIND.DIRECT,
      deliveryBindingId: workItem.deliveryBindingId || null,
      deliveryMode: workItem.deliveryMode || 'default',
      eventId,
      idempotencyKey: String(workItem.idempotencyKey),
      instruction,
      kind: workItem.kind,
      messageId: `msg_a_work_${eventId}`,
      messages: [{ role: 'user', content: instruction }],
      originRef: workItem.originRef || null,
      principalId: String(principal?.id || `system:${workItem.wakeKind || 'wake'}`),
      requestId: eventId,
      sessionId: String(workItem.sessionId),
      settings: {},
      source: EVENT_SOURCE.WAKE,
      triggerKind: TRIGGER_KIND.TASK,
      user: principal,
      wakeKind: workItem.wakeKind,
      workItemId: String(workItem.id),
    }
  },
}
