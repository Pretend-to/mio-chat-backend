import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import { SlashHandler } from '../../channels/common/SlashHandler.js'
import { createBackendLlm } from '../../channels/llm.js'
import loader from '../../lib/server/socket.io/services/loader.js'
import sessions from '../../lib/server/socket.io/services/sessions.js'
import streamCache from '../../lib/server/socket.io/services/streamCache.js'

async function until(predicate) {
  const deadline = Date.now() + 3000
  while (!predicate()) {
    if (Date.now() > deadline) assert.fail('timed out')
    await new Promise(resolve => setImmediate(resolve))
  }
}

test('Web adjustment targets the running server Agent and splits persisted segments', async t => {
  const client = Object.assign(new EventEmitter(), {
    id: 'agent-adjust-owner', isAdmin: true, ip: '127.0.0.1', origin: 'web',
    activeEvents: new Map(), sent: [], socket: { connected: true }, finishSocketRequest() {},
    pushEvent(id, event) { this.activeEvents.set(id, event) },
    popEvent(id) { this.activeEvents.delete(id) },
    sendOpenaiMessage(type, data, requestId) { this.sent.push({ type, data, requestId }) },
  })
  const previousClients = sessions.getClientsByUserId
  sessions.getClientsByUserId = id => String(id) === client.id ? [client] : []
  const originalMiddleware = global.middleware
  global.middleware = { ...originalMiddleware, llm: {} }
  t.after(() => {
    sessions.getClientsByUserId = previousClients
    global.middleware = originalMiddleware
    streamCache.delete(client.id, 'agent-adjust-target')
    streamCache.delete('admin', 'agent-adjust-target')
  })
  loader.initClient(client, () => {})
  let active
  let starts = 0
  const persistedUsers = []
  const checkpoints = []
  const segments = []
  const snapshots = []
  const llm = createBackendLlm({ llmService: { handleMessage: async event => {
    starts++
    event.markRunning()
    active = event
  } } })
  const run = llm.process({
    agentId: 'agent-adjust-target', sessionId: 'agent-session-selected',
    messageId: 'original-reply', isWeb: true, source: 'web', from: client.id,
    principal: { id: `web:${client.id}`, externalUserId: client.id, isAdmin: true },
    channelId: 'agent-adjust-target', webClient: client,
    channel: { id: 'agent-adjust-target', channelType: 'session' },
    text: 'Original task', chat: [], toolNames: [], soul: '', globalMem: '', crystal: '',
    memory: { agentId: 'agent-adjust-target', getAgentMeta: async () => 0, appendUserMessageOnce: async (id, message) => persistedUsers.push({ id, message }) },
    onAdjustmentCheckpoint: async data => checkpoints.push(data),
    onAdjustmentSegmentStart: async data => segments.push(data),
    onToolCallPersist: data => snapshots.push(data),
  })
  t.after(async () => { if (active && !active.completed) active.abort(); await run.catch(() => {}) })
  await until(() => active)
  await active.update({ type: 'content', content: 'Before adjustment' })
  client.emit('llm_message', {
    request_id: 'direction-change', type: 'adjust',
    data: { contactorId: 'agent-adjust-target', targetRequestId: 'original-reply',
      eventId: 'direction-change', userMessageId: 'direction-user', text: 'Use the other approach' },
  })
  await until(() => client.sent.some(frame => frame.type === 'adjust_status'))
  assert.equal(client.sent.find(frame => frame.type === 'adjust_status').data.status, 'accepted_for_checkpoint')
  const batch = await active.consumeAdjustmentsAtCheckpoint()
  assert.equal(batch.length, 1)
  assert.equal(batch[0].event.agentId, 'agent-adjust-target')
  assert.equal(batch[0].event.sessionId, 'agent-session-selected')
  assert.equal(persistedUsers[0].message.id, 'direction-user')
  assert.equal(persistedUsers[0].message.metadata.kind, 'adjustment')
  assert.equal(persistedUsers[0].message.metadata.source.adapterId, 'web')
  assert.equal(persistedUsers[0].message.metadata.network.ip, client.ip)
  assert.equal(persistedUsers[0].message.time, batch[0].messageTime)
  assert.equal(checkpoints.length, 1)
  active.body.messages.push({ role: 'user', content: batch[0].instruction })
  await active.notifyAdjustmentsInjected(batch, { afterToolCallId: 'old-tool' })
  assert.equal(active.messageId, 'direction-change')
  assert.equal(segments[0].messageId, 'direction-change')
  await active.update({ type: 'content', content: 'After adjustment' })
  await active.update({ type: 'toolCall', content: {
    id: 'new-tool', name: 'test', action: 'running', parameters: {},
  } })
  assert.equal(JSON.stringify(snapshots.at(-1)).includes('Before adjustment'), false)
  assert.equal(JSON.stringify(snapshots.at(-1)).includes('After adjustment'), true)
  const slash = new SlashHandler({ channel: {}, memory: { agentId: active.agentId } })
  const slashResult = await slash.handle('/adjust Refine that approach', {
    isWeb: true, sid: active.sessionId, sessionId: active.sessionId,
    channelId: active.agentId, messageId: 'slash-direction-change',
    userMessageId: 'slash-direction-user', principal: { id: `web:${client.id}` },
  })
  assert.equal(slashResult, null)
  const secondBatch = await active.consumeAdjustmentsAtCheckpoint()
  assert.equal(secondBatch[0].eventId, 'slash-direction-change')
  assert.equal(secondBatch[0].userMessageId, 'slash-direction-user')
  await active.notifyAdjustmentsInjected(secondBatch, { afterToolCallId: 'new-tool' })
  assert.equal(active.messageId, 'slash-direction-change')
  assert.equal(persistedUsers.length, 2)
  await active.update({ type: 'content', content: 'Final direction' })
  await active.complete()
  const result = await run
  assert.equal(starts, 1)
  assert.equal(JSON.stringify(result.content).includes('Before adjustment'), false)
  assert.ok(client.sent.some(frame => frame.type === 'complete' &&
    frame.data.segmentBoundary && frame.data.metaData.messageId === 'original-reply'))
  assert.ok(client.sent.some(frame => frame.type === 'complete' &&
    !frame.data.segmentBoundary && frame.data.metaData.messageId === 'slash-direction-change'))
  client.emit('llm_message', {
    request_id: 'late-adjustment', type: 'adjust',
    data: { contactorId: active.contactorId, targetRequestId: 'original-reply',
      eventId: 'late-adjustment', text: 'One last change' },
  })
  await until(() => client.sent.some(frame => frame.requestId === 'late-adjustment'))
  assert.equal(client.sent.find(frame => frame.requestId === 'late-adjustment').data.status, 'deferred')
  assert.equal(starts, 1)
})
