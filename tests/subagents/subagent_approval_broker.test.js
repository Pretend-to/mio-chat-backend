import assert from 'node:assert/strict'
import test from 'node:test'

import { ApprovalNotificationBroker } from '../../lib/approvals/ApprovalNotificationBroker.js'

test('SubAgent approval is shown in the global queue and routed back', () => {
  const sent = []
  const client = {
    isAdmin: true,
    sendOpenaiMessage: (...args) => sent.push(args),
  }
  const broker = new ApprovalNotificationBroker({
    sessionPool: { getAllAdminClients: () => [client] },
    ttlMs: 10_000,
  })
  let response = null
  const event = {
    emitInteraction: (id, payload) => {
      assert.equal(id, 'interaction-1')
      response = payload
      return true
    },
  }

  const requestId = broker.register({
    action: {
      actionType: 'REQUEST_APPROVAL',
      interactionId: 'interaction-1',
      meta: { commandPreview: 'rm file' },
      prompt: '是否执行？',
    },
    event,
    interactionId: 'interaction-1',
    target: {
      agentId: 'agent-1',
      approvalSource: 'subagent',
      label: '调研',
      parentSessionId: 'parent-1',
      sourceSessionId: 'child-1',
      subagentRunId: 'run-1',
    },
  })

  assert.equal(sent.length, 1)
  assert.equal(sent[0][0], 'update')
  assert.equal(sent[0][1].metaData.agentId, 'agent-1')
  assert.equal(sent[0][1].metaData.contactorId, 'agent-1')
  assert.equal(sent[0][1].metaData.interactionOnly, true)
  assert.equal(sent[0][1].metaData.sessionId, 'parent-1')
  assert.equal(sent[0][1].content.meta.approvalSource, 'subagent')
  assert.match(sent[0][1].content.prompt, /SubAgent「调研」/)
  assert.equal(
    broker.respond({
      interactionId: 'interaction-1',
      payload: { approved: true },
      requestId,
    }),
    true,
  )
  assert.deepEqual(response, { approved: true })
  assert.equal(broker.pending.size, 0)
  assert.equal(sent.length, 2)
  assert.equal(sent[1][0], 'complete')
  assert.equal(sent[1][1].metaData.interactionOnly, true)
  broker.clear()
})

test('pending SubAgent approvals support contact-scoped compatibility replay', () => {
  const broker = new ApprovalNotificationBroker({
    sessionPool: { getAllAdminClients: () => [] },
    ttlMs: 10_000,
  })
  broker.register({
    action: {
      actionType: 'REQUEST_APPROVAL',
      interactionId: 'interaction-2',
    },
    event: { emitInteraction: () => true },
    interactionId: 'interaction-2',
    target: {
      agentId: 'agent-2',
      parentSessionId: 'parent-2',
      subagentRunId: 'run-2',
    },
  })
  const sent = []
  assert.equal(
    broker.notifyClient(
      {
        isAdmin: true,
        sendOpenaiMessage: (...args) => sent.push(args),
      },
      'agent-2',
    ),
    1,
  )
  assert.equal(sent[0][1].metaData.triggerType, 'subagent_approval')
  assert.equal(sent[0][1].metaData.interactionOnly, true)
  broker.clear()
})

test('pending approvals can be replayed as one global queue', () => {
  const broker = new ApprovalNotificationBroker({
    sessionPool: { getAllAdminClients: () => [] },
    ttlMs: 10_000,
  })
  for (const suffix of ['a', 'b']) {
    broker.register({
      action: {
        actionType: 'REQUEST_APPROVAL',
        interactionId: `interaction-${suffix}`,
      },
      event: { emitInteraction: () => true },
      interactionId: `interaction-${suffix}`,
      target: {
        agentId: `agent-${suffix}`,
        parentSessionId: `parent-${suffix}`,
        subagentRunId: `run-${suffix}`,
      },
    })
  }

  const sent = []
  assert.equal(
    broker.notifyClient({
      isAdmin: true,
      sendOpenaiMessage: (...args) => sent.push(args),
    }),
    2,
  )
  assert.deepEqual(
    sent.map((entry) => entry[1].metaData.contactorId).toSorted(),
    ['agent-a', 'agent-b'],
  )
  broker.clear()
})
