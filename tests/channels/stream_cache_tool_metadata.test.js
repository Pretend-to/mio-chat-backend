import assert from 'node:assert/strict'
import test from 'node:test'
import streamCache from '../../lib/server/socket.io/services/streamCache.js'

const USER_ID = 'stream-cache-tool-metadata-user'
const CONTACTOR_ID = 'stream-cache-tool-metadata-contactor'

test.afterEach(() => {
  streamCache.delete(USER_ID, CONTACTOR_ID)
})

test('streamCache backfills Gemini step and thought signature from later tool-call states', () => {
  const messageId = 'tool-metadata-message'

  streamCache.push(USER_ID, CONTACTOR_ID, messageId, {
    content: {
      action: 'started',
      id: 'call-1',
      name: 'meta_tool',
      parameters: '{}',
      result: '',
    },
    type: 'toolCall',
  })

  streamCache.push(USER_ID, CONTACTOR_ID, messageId, {
    content: {
      action: 'running',
      id: 'call-1',
      name: 'meta_tool',
      parameters: '{}',
      result: '',
      step: 0,
      thoughtSignature: 'signed-step-zero',
    },
    type: 'toolCall',
  })

  streamCache.push(USER_ID, CONTACTOR_ID, messageId, {
    content: {
      action: 'finished',
      id: 'call-1',
      name: 'meta_tool',
      parameters: '{}',
      result: 'done',
    },
    type: 'toolCall',
  })

  const [message] = streamCache.snapshot(USER_ID, CONTACTOR_ID)
  assert.equal(message.chunks.length, 1)
  assert.deepEqual(message.chunks[0].content, {
    action: 'finished',
    id: 'call-1',
    name: 'meta_tool',
    parameters: '{}',
    result: 'done',
    step: 0,
    thoughtSignature: 'signed-step-zero',
  })
})

test('streamCache does not erase existing tool metadata when a later state omits it', () => {
  const messageId = 'tool-metadata-preservation-message'

  streamCache.push(USER_ID, CONTACTOR_ID, messageId, {
    content: {
      action: 'started',
      id: 'call-2',
      name: 'meta_tool',
      parameters: '{}',
      result: '',
      step: 2,
      thoughtSignature: 'original-signature',
    },
    type: 'toolCall',
  })

  streamCache.push(USER_ID, CONTACTOR_ID, messageId, {
    content: {
      action: 'finished',
      id: 'call-2',
      name: 'meta_tool',
      parameters: '{}',
      result: 'done',
    },
    type: 'toolCall',
  })

  const [message] = streamCache.snapshot(USER_ID, CONTACTOR_ID)
  assert.equal(message.chunks[0].content.step, 2)
  assert.equal(message.chunks[0].content.thoughtSignature, 'original-signature')
})
