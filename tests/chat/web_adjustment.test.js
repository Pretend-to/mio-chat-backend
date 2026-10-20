import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import loader from '../../lib/server/socket.io/services/loader.js'
import sessions from '../../lib/server/socket.io/services/sessions.js'
import streamCache from '../../lib/server/socket.io/services/streamCache.js'
import prismaManager from '../../lib/database/prisma.js'

test('Web adjustment keeps one ChatEvent and splits visible assistant messages', async (t) => {
  t.after(async () => {
    await prismaManager.disconnect()
  })
  const client = new EventEmitter()
  client.id = 'web-adjust-test-user'
  client.ip = '127.0.0.1'
  client.origin = 'web'
  client.isAdmin = true
  client.activeEvents = new Map()
  client.sent = []
  client.sendOpenaiMessage = (type, data, requestId) => {
    client.sent.push({ type, data, requestId })
  }
  client.finishSocketRequest = () => {}
  client.pushEvent = (id, event) => client.activeEvents.set(id, event)
  client.popEvent = (id) => client.activeEvents.delete(id)

  const previousClients = sessions.getClientsByUserId
  sessions.getClientsByUserId = () => [client]
  let activeEvent
  let started = 0
  loader.initClientMessageHandler('llm', async (event) => {
    started++
    activeEvent = event
    event.markRunning()
  })
  loader.initClient(client, () => {})

  try {
    client.emit('llm_message', {
      request_id: 'active-web-reply',
      type: 'completions',
      data: { messages: [{ role: 'user', content: 'Initial task' }], settings: {} },
      metaData: { contactorId: 'web-adjust-contact', messageId: 'active-web-reply' },
    })
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(started, 1)

    client.emit('llm_message', {
      request_id: 'adjust-web-1',
      type: 'adjust',
      data: {
        contactorId: 'web-adjust-contact',
        eventId: 'adjust-web-1',
        targetRequestId: 'active-web-reply',
        text: 'Also compare the results',
      },
    })
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(started, 1)
    assert.equal(
      client.sent.some((frame) =>
        frame.type === 'adjust_status' &&
        frame.requestId === 'adjust-web-1' &&
        frame.data.status === 'accepted_for_checkpoint',
      ),
      true,
    )

    const batch = await activeEvent.consumeAdjustmentsAtCheckpoint()
    assert.equal(batch.length, 1)
    assert.equal(batch[0].instruction, 'Also compare the results')
    activeEvent.notifyAdjustmentsInjected(batch, { afterToolCallId: 'call-1' })
    assert.equal(
      client.sent.some((frame) =>
        frame.type === 'update' &&
        frame.requestId === 'active-web-reply' &&
        frame.data.type === 'adjustment' &&
        frame.data.content.eventId === 'adjust-web-1',
      ),
      true,
    )
    assert.equal(
      client.sent.some((frame) =>
        frame.type === 'complete' &&
        frame.requestId === 'active-web-reply' &&
        frame.data.metaData.messageId === 'active-web-reply' &&
        frame.data.segmentBoundary === true,
      ),
      true,
    )
    activeEvent.update({ type: 'content', content: 'After the adjustment' })
    assert.equal(
      client.sent.some((frame) =>
        frame.type === 'update' &&
        frame.requestId === 'active-web-reply' &&
        frame.data.metaData.messageId === 'adjust-web-1' &&
        frame.data.content === 'After the adjustment',
      ),
      true,
    )
    assert.equal(
      client.sent.some((frame) =>
        ['complete', 'failed'].includes(frame.type) &&
        frame.requestId === 'adjust-web-1',
      ),
      false,
    )
    activeEvent.complete()
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(
      client.sent.some((frame) =>
        frame.type === 'complete' &&
        frame.data.metaData.messageId === 'adjust-web-1' &&
        frame.data.segmentBoundary !== true,
      ),
      true,
    )

    client.emit('llm_message', {
      request_id: 'second-web-reply',
      type: 'completions',
      data: { messages: [{ role: 'user', content: 'Second task' }], settings: {} },
      metaData: { contactorId: 'web-adjust-contact', messageId: 'second-web-reply' },
    })
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(started, 2)
    const secondActiveEvent = activeEvent

    client.emit('llm_message', {
      request_id: 'ordinary-followup',
      type: 'completions',
      data: { messages: [{ role: 'user', content: 'One more thing' }], settings: {} },
      metaData: { contactorId: 'web-adjust-contact', messageId: 'ordinary-followup' },
    })
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(started, 2)
    const ordinaryBatch = await secondActiveEvent.consumeAdjustmentsAtCheckpoint()
    assert.equal(ordinaryBatch.length, 1)
    assert.equal(ordinaryBatch[0].instruction, 'One more thing')
    secondActiveEvent.notifyAdjustmentsInjected(ordinaryBatch, { afterToolCallId: 'call-2' })
    assert.equal(
      client.sent.some((frame) =>
        frame.type === 'adjust_status' &&
        frame.requestId === 'ordinary-followup' &&
        frame.data.status === 'absorbed',
      ),
      true,
    )
    assert.equal(
      client.sent.some((frame) =>
        frame.type === 'complete' &&
        frame.requestId === 'second-web-reply' &&
        frame.data.metaData.messageId === 'second-web-reply' &&
        frame.data.segmentBoundary === true,
      ),
      true,
    )
    secondActiveEvent.update({ type: 'content', content: 'Following up' })
    assert.equal(
      client.sent.some((frame) =>
        frame.type === 'update' &&
        frame.requestId === 'second-web-reply' &&
        frame.data.metaData.messageId === 'ordinary-followup' &&
        frame.data.content === 'Following up',
      ),
      true,
    )
    secondActiveEvent.error(new Error('Owning turn failed'))
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(
      client.sent.some((frame) =>
        frame.type === 'adjust_status' &&
        frame.requestId === 'ordinary-followup' &&
        frame.data.status === 'deferred',
      ),
      true,
    )
  } finally {
    sessions.getClientsByUserId = previousClients
    streamCache.deleteMessage(client.id, 'web-adjust-contact', 'active-web-reply')
    streamCache.deleteMessage(client.id, 'web-adjust-contact', 'second-web-reply')
  }
})
