import assert from 'node:assert/strict'
import test from 'node:test'
import './mock-env.js'
import BaseLLMAdapter from '../../lib/chat/llm/adapters/base.js'
import { Gemini } from '../../lib/chat/llm/adapters/lib/geminiHttpClient.js'
import { ChatEventFactory } from '../../lib/chat/llm/events/ChatEventFactory.js'
import { snapshotRequestBody } from '../../lib/chat/llm/utils/requestDiagnostics.js'

const invalidTool = {
  function_declarations: [
    {
      name: 'broken_tool',
      parameters: {
        type: 'object',
        properties: { value: { type: ['string', 'null'] } },
      },
    },
  ],
}

test('snapshots preserve invalid schemas and detach messages while redacting credentials', () => {
  const input = {
    tools: [invalidTool],
    messages: [{ content: 'original' }],
    api_key: 'secret',
    image: 'data:image/png;base64,AAAA',
    url: 'https://example.test/path?key=secret&alt=sse',
  }
  const snapshot = snapshotRequestBody(input)
  input.messages[0].content = 'changed'
  assert.equal(snapshot.messages[0].content, 'original')
  assert.deepEqual(
    snapshot.tools[0].function_declarations[0].parameters.properties.value.type,
    ['string', 'null'],
  )
  assert.equal(snapshot.api_key, '[REDACTED]')
  assert.equal(snapshot.image, '[inline binary omitted]')
  assert.equal(JSON.stringify(snapshot).includes('secret'), false)
})

test('failed Gemini requests capture the actual HTTP body and current recursion round', async (t) => {
  const previousFetch = globalThis.fetch
  const previousLogger = global.logger.error
  const errors = []
  global.logger.error = (...args) => errors.push(args.join(' '))
  t.after(() => {
    globalThis.fetch = previousFetch
    global.logger.error = previousLogger
  })
  let submittedBody
  globalThis.fetch = async (_url, request) => {
    submittedBody = JSON.parse(request.body)
    return { ok: false, text: async () => 'Invalid JSON payload received' }
  }
  const adapter = new BaseLLMAdapter({ type: 'test' })
  const core = new Gemini({
    base_url: 'https://example.test',
    api_key: 'private-key',
  })
  const event = ChatEventFactory.createMock({
    requestId: 'diagnose-recursion',
    messages: [{ role: 'user', content: 'keep original text' }],
    settings: {
      base: { model: 'gemini-test', stream: false },
      toolCallSettings: { tools: [] },
    },
  })
  event._recursionRound = 2
  event._requestDiagnostics = { upstreamBody: { stale: true } }
  adapter._prepareChatBody = async (body) => ({
    model: 'gemini-test',
    stream: false,
    messages: body.messages,
    tools: [invalidTool],
  })
  adapter._executeChatRequest = async (body, e) => {
    for await (const _chunk of core.chat(body, e)) {
    }
  }
  let failure
  adapter.logUsage = (_provider, _usage, metrics) => {
    failure = metrics
  }
  await adapter.handleChatRequest(event)
  assert.equal(failure.status, 'FAILED')
  assert.equal(failure.requestBody.round, 3)
  assert.deepEqual(failure.requestBody.upstreamBody, submittedBody)
  assert.equal(failure.requestBody.upstreamBody.stale, undefined)
  assert.ok(failure.errorStack.includes('Invalid JSON payload'))
  assert.ok(
    errors.some(
      (line) =>
        line.includes('[LLMRequestBody]') && line.includes('broken_tool'),
    ),
  )
  assert.equal(
    JSON.stringify(failure.requestBody).includes('private-key'),
    false,
  )
  event.messages[0].content = 'later mutation'
  assert.equal(
    failure.requestBody.inputBody.messages[0].content,
    'keep original text',
  )
})
