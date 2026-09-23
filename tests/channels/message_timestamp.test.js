import assert from 'node:assert/strict'
import test from 'node:test'

import {
  appendFileReferences,
  appendRecursiveContextMessages,
  collectRecursiveUserMessages,
  convertChatHistoryToLLMMessages,
  createBackendLlm,
  prepareChannelUserInput,
} from '../../channels/llm.js'
import {
  ensureMessageTime,
  formatMessageTime,
  wrapUserMessageWithMetadata,
  wrapUserMessageWithTimestamp,
} from '../../lib/chat/messageTimestamp.js'

test('message timestamp helpers are deterministic and source-independent', () => {
  const time = 1_780_000_000_123
  const iso = formatMessageTime(time)

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

test('channel metadata envelope is stable, allowlisted, and attribute-escaped', () => {
  const time = 1_780_000_000_123
  const envelope = {
    actor: { displayName: 'A & "B"', externalUserId: 'user<1>' },
    conversation: { externalConversationId: 'group-1', type: 'group' },
    message: { externalMessageId: 'message-1', sentAt: time },
    raw: { secret: 'must-not-leak' },
    source: { adapterId: 'wechat', channelId: 'wechat-main', channelName: '工作微信' },
    version: 2,
  }
  const wrapped = wrapUserMessageWithMetadata('hello', time, envelope)

  assert.match(wrapped, /^<message version="2" channel="工作微信"/)
  assert.match(wrapped, /user_id="user&lt;1&gt;"/)
  assert.match(wrapped, /user_name="A &amp; &quot;B&quot;"/)
  assert.doesNotMatch(wrapped, /must-not-leak|secret/)
  assert.equal(wrapUserMessageWithMetadata(wrapped, time, envelope), wrapped)
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
  const iso = formatMessageTime(history[0].time)

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
    agentId: 'agent-timestamp',
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
    sessionId: 'session-timestamp',
    text: 'current',
  })

  const expected = `<message time="${formatMessageTime(messageTime)}">`
  assert.ok(result.content.some((item) => item.type === 'text' && item.data?.text === 'ok'))
  assert.ok(observed.some((m) => m.role === 'user' && m.content[0]?.text?.includes(`${expected}\nprevious`)))
  assert.ok(observed.some((m) => m.role === 'user' && m.content[0]?.text?.includes(`${expected}\ncurrent`)))
})

test('multimodal channel input round-trips to the identical request content', () => {
  const messageTime = 1_780_000_000_123
  const prepared = prepareChannelUserInput('请看这张图', ['/f/up/photo.png'], messageTime)
  const restored = convertChatHistoryToLLMMessages([{
    content: prepared.persistedContent,
    role: 'user',
    time: messageTime,
  }])

  assert.deepEqual(restored[0].content, prepared.latestContent)
})

test('file attachments are folded into the current Agent turn without duplicate links', () => {
  const files = [
    { name: '课程安排.docx', url: '/uploaded/file/course.docx' },
  ]
  const appended = appendFileReferences('这个是啥', files)

  assert.match(appended, /这个是啥/)
  assert.match(appended, /课程安排\.docx/)
  assert.match(appended, /\/uploaded\/file\/course\.docx/)
  assert.equal(
    appendFileReferences(appended, files).match(/course\.docx/g)?.length,
    1,
  )
})

test('recursive user context is preserved at its tool-call boundary', () => {
  const currentUser = {
    content: [{ text: '本轮输入', type: 'text' }],
    role: 'user',
  }
  const rawMessages = [
    currentUser,
    {
      content: '先调用工具',
      role: 'assistant',
      tool_calls: [{
        function: { arguments: '{}', name: 'vision' },
        id: 'call-vision',
        type: 'function',
      }],
    },
    { content: '工具结果', role: 'tool', tool_call_id: 'call-vision' },
    {
      content: [{ text: '工具注入的图片上下文', type: 'text' }],
      role: 'user',
    },
  ]
  const entries = collectRecursiveUserMessages(rawMessages, currentUser)
  const persistedAssistant = appendRecursiveContextMessages([
    { data: { text: '先调用工具' }, type: 'text' },
    {
      data: {
        action: 'finished',
        arguments: '{}',
        id: 'call-vision',
        name: 'vision',
        result: '工具结果',
      },
      type: 'tool_call',
    },
    { data: { text: '最终回答' }, type: 'text' },
  ], entries)

  const converted = convertChatHistoryToLLMMessages([
    {
      content: [{ data: { text: '上一轮输入' }, type: 'text' }],
      role: 'user',
      time: 1_780_000_000_000,
    },
    { content: persistedAssistant, role: 'assistant' },
  ])

  assert.deepEqual(converted.map(message => message.role), ['user', 'assistant', 'tool', 'user', 'assistant'])
  assert.equal(converted[3].content[0].text, '工具注入的图片上下文')
  assert.equal(converted[4].content, '最终回答')
})

test('crystallization persistence completes before the backend process resolves', async () => {
  const order = []
  const llm = createBackendLlm({
    llmService: {
      handleMessage: async (event) => {
        await event.update({
          content: { commit: true, status: 'finished', summary: '<memory_crystal>new</memory_crystal>' },
          type: 'crystallize',
        })
        await event.complete()
      },
    },
  })

  const result = await llm.process({
    agentId: 'agent-crystal',
    channel: {},
    chat: [],
    crystal: '',
    globalMem: '',
    memory: {
      clearPendingMemories: async () => order.push('clear'),
      getAgentMeta: async () => null,
      rotateChat: async () => { order.push('rotate'); return { rotated: false } },
      setCrystal: async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        order.push('set')
      },
    },
    messageTime: 1_780_000_000_123,
    sessionId: 'session-crystal',
    text: 'current',
  })

  assert.deepEqual(order, ['set', 'rotate', 'clear'])
  assert.equal(result.crystalPersisted, true)
})

test('ordinary Channel turns never re-persist the existing crystal', async () => {
  const calls = []
  const llm = createBackendLlm({ llmService: {
    handleMessage: async event => {
      await event.update({ content: 'ok', type: 'content' })
      await event.complete()
    },
  } })
  const result = await llm.process({
    agentId: 'agent-no-compression', channel: {}, chat: [], crystal: '<memory_crystal>committed</memory_crystal>',
    globalMem: '', memory: {
      clearPendingMemories: async () => calls.push('clear'),
      getAgentMeta: async () => null,
      rotateChat: async () => calls.push('rotate'),
      setCrystal: async () => calls.push('set'),
    }, sessionId: 'session-no-compression', text: 'current',
  })
  assert.equal(result.crystal, null)
  assert.equal(result.crystalPersisted, false)
  assert.deepEqual(calls, [])
})

test('failed crystallization snapshots cannot mutate durable memory', async () => {
  const calls = []
  const llm = createBackendLlm({ llmService: {
    handleMessage: async event => {
      await event.update({
        content: { commit: false, status: 'failed', summary: '<memory_crystal>stale</memory_crystal>' },
        type: 'crystallize',
      })
      await event.complete()
    },
  } })
  const result = await llm.process({
    agentId: 'agent-failed-compression', channel: {}, chat: [], crystal: '<memory_crystal>committed</memory_crystal>',
    globalMem: '', memory: {
      clearPendingMemories: async () => calls.push('clear'),
      getAgentMeta: async () => null,
      rotateChat: async () => calls.push('rotate'),
      setCrystal: async () => calls.push('set'),
    }, sessionId: 'session-failed-compression', text: 'current',
  })
  assert.equal(result.crystal, null)
  assert.equal(result.crystalPersisted, false)
  assert.deepEqual(calls, [])
})

test('crystal persistence failure rejects and preserves pending memories', async () => {
  const calls = []
  const llm = createBackendLlm({ llmService: {
    handleMessage: async event => {
      await event.update({
        content: { commit: true, status: 'finished', summary: '<memory_crystal>new</memory_crystal>' },
        type: 'crystallize',
      })
      await event.complete()
    },
  } })
  await assert.rejects(llm.process({
    agentId: 'agent-persistence-failure', channel: {}, chat: [], crystal: '<memory_crystal>old</memory_crystal>',
    globalMem: '', memory: {
      clearPendingMemories: async () => calls.push('clear'),
      getAgentMeta: async () => null,
      rotateChat: async () => { calls.push('rotate'); throw new Error('rotate failed') },
      setCrystal: async () => calls.push('set'),
    }, sessionId: 'session-persistence-failure', text: 'current',
  }), /rotate failed/)
  assert.deepEqual(calls, ['set', 'rotate'])
})
