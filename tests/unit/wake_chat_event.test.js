import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ChatEventFactory } from '../../lib/chat/llm/events/ChatEventFactory.js'
import { WakeChatEvent } from '../../lib/chat/llm/events/subtypes/WakeChatEvent.js'

test('durable wake becomes a side-effect-free ChatEvent candidate', () => {
  const event = ChatEventFactory.createForWake({
    agentId: 'agent-1',
    conversationKey: 'agent:agent-1:session:session-1',
    deliveryMode: 'session_only',
    eventId: 'event-1',
    id: 'work-1',
    idempotencyKey: 'cron:execution-1',
    instruction: 'Continue the scheduled task',
    kind: 'scheduler',
    originRef: 'task_execution:1',
    principalJson: JSON.stringify({ id: 'system:cron' }),
    sessionId: 'session-1',
    wakeKind: 'cron_manual',
  })

  assert.ok(event instanceof WakeChatEvent)
  assert.equal(event.workItemId, 'work-1')
  assert.equal(event.eventId, 'event-1')
  assert.equal(event.conversationKey, 'agent:agent-1:session:session-1')
  assert.equal(event.deliveryStatus, 'created')
  assert.equal(event.instruction, 'Continue the scheduled task')
  assert.equal(event.principalId, 'system:cron')
})
