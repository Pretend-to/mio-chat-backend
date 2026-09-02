import assert from 'node:assert/strict'
import test from 'node:test'

import {
  convertChatHistoryToLLMMessages,
  createBackendLlm,
} from '../../channels/llm.js'
import {
  ensureMessageTime,
  formatMessageTime,
  wrapUserMessageWithTimestamp,
} from '../../lib/chat/messageTimestamp.js'

test('message timestamp helpers are deterministic and source-independent', () => {
  const time = 1_780_000_000_123
  const iso = new Date(time).toISOString()

  assert.equal(ensureMessageTime(undefined, time), time)
  assert.equal(formatMessageTime(time), iso)
  assert.equal(
    wrapUserMessageWithTimestamp('hello', time),
    `<message time="${iso}">\nhello\n</message>`,
  )
  assert.equal(
    wrapUserMessageWithTimestamp(`<message time="${iso}">\nhello\n</message>`, time),
    `<message time="${iso}">\nhello\n</message>`,
  )
})

test('channel history wraps persisted user times without mutating stored messages', () => {
  const history = [
    {
      content: [{ data: { text: 'hello' }, type: 'text' }],
      role: 'user',
      text: 'hello',
      time: 1_780_000_000_123,
    },
    {
      content: [{ data: { text: 'world' }, type: 'text' }],
      role: 'assistant',
      text: 'world',
      time: 1_780_000_001_123,
    },
  ]
  const before = JSON.stringify(history)
  const converted = convertChatHistoryToLLMMessages(history)
  const iso = new Date(history[0].time).toISOString()

  assert.equal(converted[0].role, 'user')
  assert.equal(converted[0].content[0].text, `<message time="${iso}">\nhello\n</message>`)
  assert.equal(JSON.stringify(history), before)
})

test('runtime LLM history does not adapt legacy { role, text } messages', () => {
  assert.deepEqual(
    convertChatHistoryToLLMMessages([{ role: 'user', text: 'legacy message' }]),
    [],
  )
})

test('current channel input and persisted history use stable timestamp envelopes', async () => {
  let observed = null
  const llm = createBackendLlm({
    llmService: {
      handleMessage: async (event) => {
        observed = event.body.messages
        await event.update({ content: 'ok', type: 'content' })
        await event.complete()
      },
    },
  })

  const messageTime = 1_780_000_000_123
  const result = await llm.process({
    channel: {},
    chat: [{
      content: [{ data: { text: 'previous' }, type: 'text' }],
      role: 'user',
      text: 'previous',
      time: messageTime,
    }],
    crystal: '',
    globalMem: '',
    messageTime,
    memory: {
      getAgentMeta: async () => null,
    },
    text: 'current',
  })

  const expected = `<message time="${new Date(messageTime).toISOString()}">`
  assert.ok(result.content.some((item) => item.type === 'text' && item.data?.text === 'ok'))
  assert.ok(observed.some((m) => m.role === 'user' && m.content[0]?.text?.includes(`${expected}\nprevious`)))
  assert.ok(observed.some((m) => m.role === 'user' && m.content[0]?.text?.includes(`${expected}\ncurrent`)))
})
