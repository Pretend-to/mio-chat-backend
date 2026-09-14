import { test } from 'node:test'
import assert from 'node:assert'
import '../adapters/mock-env.js' // Loads base mocks like global.logger and global.middleware

import SystemSettingsService from '../../lib/database/services/SystemSettingsService.js'
import * as oaiProxyController from '../../lib/server/http/controllers/oaiProxyController.js'
import config from '../../lib/config.js'

// Mock config admin_code
config.web = {
  admin_code: 'mock-admin-code-123'
}

// Redirect logger.error to console.error to see error details
global.logger.error = console.error

// Mock SystemSettingsService get
SystemSettingsService.get = async (key) => {
  if (key === 'system_llm_channel') {
    return { value: 'openai-1' }
  }
  return null
}

// Populate mock global middleware adapters
global.middleware.llm = {
  instanceMetadata: {
    'args-echo': { adapterType: 'test', displayName: 'Args-Echo' },
    'gemini-1': { adapterType: 'gemini', displayName: 'Gemini-主要' },
    'gemini-stream-tools': { adapterType: 'gemini', displayName: 'Gemini-Stream-Tools' },
    'openai-1': { adapterType: 'openai', displayName: 'OpenAI-主要' },
    'parallel-tools-stream': { adapterType: 'openai', displayName: 'Parallel-Tools-Stream' },
    'stream-error': { adapterType: 'test', displayName: 'Stream-Error' },
    'tool-adapter': { adapterType: 'openai', displayName: 'Tools-Instance' },
    'tool-name-echo': { adapterType: 'test', displayName: 'Tool-Name-Echo' },
    'tools-echo': { adapterType: 'openai', displayName: 'Tools-Echo' },
    'usage-stream': { adapterType: 'test', displayName: 'Usage-Stream' },
  },
  llms: {
    'args-echo': {
      models: [
        { owner: 'Test', models: ['args-echo'] }
      ],
      guestModels: [],
      // Captures the last assistant tool_calls arguments seen in e.body.messages
      async handleChatRequest(e) {
        const msgs = e.body.messages
        const assistantMsg = msgs.toReversed().find(m => m.role === 'assistant' && Array.isArray(m.tool_calls))
        if (assistantMsg) {
          e.update({ type: 'content', content: assistantMsg.tool_calls[0].function.arguments })
        }
        e.complete()
      }
    },
    'gemini-1': {
      guestModels: [],
      async handleChatRequest(e) {
        e.update({ type: 'content', content: 'Gemini reply' })
        e.complete()
      },
      models: [
        { owner: 'Google', models: ['gemini-1.5-pro'] }
      ]
    },
    'gemini-stream-tools': {
      guestModels: [],
      async handleChatRequest(e) {
        // Emit toolCall twice with cumulative arguments (simulating Gemini stream repetition)
        e.update({
          type: 'toolCall',
          content: {
            id: 'call_123',
            name: 'my_tool',
            parameters: { user_prompt: 'hello' }
          }
        })
        e.update({
          type: 'toolCall',
          content: {
            id: 'call_123',
            name: 'my_tool',
            parameters: { user_prompt: 'hello' }
          }
        })
        e.complete()
      },
      models: [
        { owner: 'Google', models: ['gemini-stream-tools'] }
      ]
    },
    'openai-1': {
      guestModels: [],
      async handleChatRequest(e) {
        // Simulates typical text response
        e.update({ type: 'content', content: 'Hello ' })
        e.update({ type: 'content', content: 'world!' })
        e.complete()
      },
      models: [
        { owner: 'OpenAI', models: ['gpt-4o', 'gpt-3.5-turbo'] }
      ]
    },
    'parallel-tools-stream': {
      guestModels: [],
      async handleChatRequest(e) {
        e.update({
          type: 'toolCall',
          content: {
            id: 'call_aaa',
            name: 'toolA',
            parameters: '{"param":"A"}'
          }
        })
        e.update({
          type: 'toolCall',
          content: {
            id: 'call_bbb',
            name: 'toolB',
            parameters: '{"param":"B"}'
          }
        })
        e.complete()
      },
      models: [
        { owner: 'Test', models: ['parallel-tools-stream'] }
      ]
    },
    'tool-adapter': {
      guestModels: [],
      async handleChatRequest(e) {
        const toolCalls = [
          {
            id: 'call_abc123',
            function: {
              name: 'get_weather',
              arguments: '{"location":"Beijing"}'
            }
          }
        ]
        
        if (typeof e.body.settings.toolCallSettings !== 'undefined') {
          // Trigger _handleToolCalls on the receiver (which will be the ES6 Proxy)
          await this._handleToolCalls(toolCalls, e)
        }
        
        e.complete()
      },
      models: [
        { owner: 'OpenAI', models: ['gpt-4-tools'] }
      ]
    },
    'tools-echo': {
      guestModels: [],
      async handleChatRequest(e) {
        const tools = e.body.settings?.toolCallSettings?.tools || []
        const toolChoice = e.body.settings?.chatParams?.tool_choice
        e.update({
          type: 'content',
          content: JSON.stringify({
            toolsLength: tools.length,
            toolChoice,
            tools
          })
        })
        e.complete()
      },
      models: [
        { owner: 'Test', models: ['tools-echo'] }
      ]
    },
    'usage-stream': {
      guestModels: [],
      async handleChatRequest(e) {
        e.update({ type: 'content', content: 'Stream with usage' })
        e.lastUsage = {
          completion_tokens: 5,
          prompt_tokens: 10,
          total_tokens: 15,
        }
        e.complete()
      },
      models: [{ owner: 'Test', models: ['usage-stream-model'] }]
    },
    'stream-error': {
      guestModels: [],
      async handleChatRequest(e) {
        e.update({ type: 'content', content: 'Partial content before error' })
        throw new Error('Adapter crashed mid-stream')
      },
      models: [{ owner: 'Test', models: ['stream-error-model'] }]
    },
    'tool-name-echo': {
      guestModels: [],
      async handleChatRequest(e) {
        const msgs = e.body.messages
        const toolMsg = msgs.find(m => m.role === 'tool')
        e.update({
          content: JSON.stringify({ resolvedName: toolMsg?.name }),
          type: 'content',
        })
        e.complete()
      },
      models: [{ owner: 'Test', models: ['tool-name-echo-model'] }]
    }
  }
}

// Add fallback _handleToolCalls method to mock adapters
for (const [, adapter] of Object.entries(global.middleware.llm.llms)) {
  adapter._handleToolCalls = async (toolCalls, e) => {
    e.capturedToolCalls = toolCalls
  }
}

// Utility to create mock express request & response objects
function createMockReqRes(body = {}, headers = {}) {
  const req = {
    body,
    headers: {
      authorization: 'Bearer mock-admin-code-123',
      ...headers
    },
    on: (event, callback) => {
      if (event === 'close') {
        req.closeCallback = callback
      }
    },
    query: {}
  }

  const res = {
    body: null,
    end() {
      this.ended = true
      this.writableEnded = true
    },
    ended: false,
    writableEnded: false,
    flushHeaders() {
      this.headersSent = true
    },
    headers: {},
    headersSent: false,
    json(data) {
      this.body = data
      return this
    },
    setHeader(name, value) {
      this.headers[name] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    statusCode: 200,
    write(data) {
      this.writeBuffer.push(data)
    },
    writeBuffer: []
  }

  return { req, res }
}

test('OpenAI Proxy Route - Authentication', async (t) => {
  await t.test('should reject requests with invalid authorization token', async () => {
    const { req, res } = createMockReqRes({}, { authorization: 'Bearer invalid-token' })
    await oaiProxyController.listModels(req, res)

    assert.strictEqual(res.statusCode, 403)
    assert.ok(res.body.error)
    assert.strictEqual(res.body.error.code, 'invalid_api_key')
  })

  await t.test('should allow requests with valid bearer token', async () => {
    const { req, res } = createMockReqRes()
    await oaiProxyController.listModels(req, res)

    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.object, 'list')
  })
})

test('OpenAI Proxy Route - Models Aggregation', async (t) => {
  await t.test('should return standard models list containing prefixed models only', async () => {
    const { req, res } = createMockReqRes()
    await oaiProxyController.listModels(req, res)

    assert.strictEqual(res.statusCode, 200)
    const list = res.body.data
    assert.ok(Array.isArray(list))

    // Prefixed model (specific routing) should exist
    const prefixedModel = list.find(m => m.id === 'OpenAI-主要/gpt-4o')
    assert.ok(prefixedModel)
    assert.strictEqual(prefixedModel.owned_by, 'openai')

    const prefixedGeminiModel = list.find(m => m.id === 'Gemini-主要/gemini-1.5-pro')
    assert.ok(prefixedGeminiModel)
    assert.strictEqual(prefixedGeminiModel.owned_by, 'gemini')

    // Non-prefixed model should NOT exist
    const geminiModel = list.find(m => m.id === 'gemini-1.5-pro')
    assert.strictEqual(geminiModel, undefined)
  })
})

test('OpenAI Proxy Route - Chat Completions (Non-Stream)', async (t) => {
  await t.test('should resolve adapter and return complete OpenAI JSON response', async () => {
    const { req, res } = createMockReqRes({
      messages: [{ role: 'user', content: 'hello' }],
      model: 'gpt-4o',
      stream: false
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.object, 'chat.completion')
    assert.strictEqual(res.body.model, 'gpt-4o')
    assert.strictEqual(res.body.choices[0].message.content, 'Hello world!')
  })
})

test('OpenAI Proxy Route - Chat Completions (Stream)', async (t) => {
  await t.test('should output stream chunk by chunk and end with [DONE]', async () => {
    const { req, res } = createMockReqRes({
      messages: [{ role: 'user', content: 'hello' }],
      model: 'gpt-4o',
      stream: true
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.headers['Content-Type'], 'text/event-stream')
    assert.ok(res.writeBuffer.length > 0)

    // Check last and second-to-last chunks
    const lastChunk = res.writeBuffer[res.writeBuffer.length - 1]
    const doneChunk = res.writeBuffer[res.writeBuffer.length - 2]

    assert.strictEqual(lastChunk, 'data: [DONE]\n\n')
    assert.ok(doneChunk.includes('stop'))
  })
})

test('OpenAI Proxy Route - Specific Instance Routing', async (t) => {
  await t.test('should route specifically to prefixed instance', async () => {
    const { req, res } = createMockReqRes({
      messages: [{ role: 'user', content: 'hello' }],
      model: 'Gemini-主要/gemini-1.5-pro',
      stream: false
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.body.choices[0].message.content, 'Gemini reply')
  })
})

test('OpenAI Proxy Route - Tool Call Interception', async (t) => {
  await t.test('should return tool call to client and NOT run on server', async () => {
    const { req, res } = createMockReqRes({
      messages: [{ role: 'user', content: 'get weather' }],
      model: 'gpt-4-tools',
      stream: false,
      tools: [{ type: 'function', function: { name: 'get_weather' } }]
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.statusCode, 200)
    assert.ok(res.body.choices[0].message.tool_calls)
    assert.strictEqual(res.body.choices[0].message.tool_calls[0].function.name, 'get_weather')
    assert.strictEqual(res.body.choices[0].finish_reason, 'tool_calls')
  })
})

test('OpenAI Proxy Route - Chat Completions (Stream) De-duplication', async (t) => {
  await t.test('should only output the first instance of cumulative tool call arguments and ignore duplicates', async () => {
    const { req, res } = createMockReqRes({
      messages: [{ role: 'user', content: 'run tool' }],
      model: 'Gemini-Stream-Tools/gemini-stream-tools',
      stream: true
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.headers['Content-Type'], 'text/event-stream')
    assert.ok(res.writeBuffer.length > 0)

    // Filter writeBuffer to find toolCall chunks
    const toolCallChunks = res.writeBuffer
      .filter(chunk => chunk.startsWith('data: ') && !chunk.includes('[DONE]'))
      .map(chunk => JSON.parse(chunk.substring(6)))
      .filter(data => data.choices[0].delta.tool_calls)

    // Should only have exactly 1 tool_calls delta package sent (since the second one is a duplicate)
    assert.strictEqual(toolCallChunks.length, 1)
    const functionCall = toolCallChunks[0].choices[0].delta.tool_calls[0].function
    assert.strictEqual(functionCall.name, 'my_tool')
    assert.strictEqual(functionCall.arguments, JSON.stringify({ user_prompt: 'hello' }))
  })
})

test('OpenAI Proxy Route - Message Sanitization (duplicated tool_calls.arguments)', async (t) => {
  await t.test('should strip the duplicated JSON suffix from tool_calls arguments before passing to adapter', async () => {
    const validArgs = JSON.stringify({ code: 'import bpy\nprint(1)' })
    const duplicatedArgs = validArgs + validArgs  // Simulate stream-repetition bug

    const { req, res } = createMockReqRes({
      messages: [
        { role: 'user', content: 'run script' },
        {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_dup1',
            type: 'function',
            function: { name: 'run_blender', arguments: duplicatedArgs }
          }]
        },
        { role: 'tool', tool_call_id: 'call_dup1', content: 'done' }
      ],
      model: 'Args-Echo/args-echo',
      stream: false
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.statusCode, 200)
    // The adapter echoes back what it sees for arguments; it should be the clean version
    const echoed = res.body.choices[0].message.content
    assert.strictEqual(echoed, validArgs, `Expected clean args but got: ${echoed}`)
  })

  await t.test('should leave already-valid arguments unchanged', async () => {
    const validArgs = JSON.stringify({ code: 'print(1)', user_prompt: 'hello' })

    const { req, res } = createMockReqRes({
      messages: [
        { role: 'user', content: 'go' },
        {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_ok1',
            type: 'function',
            function: { name: 'run_blender', arguments: validArgs }
          }]
        },
        { role: 'tool', tool_call_id: 'call_ok1', content: 'ok' }
      ],
      model: 'Args-Echo/args-echo',
      stream: false
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.statusCode, 200)
    const echoed = res.body.choices[0].message.content
    assert.strictEqual(echoed, validArgs)
  })
})

test('OpenAI Proxy Route - Custom Tools and Tool Choice Passthrough', async (t) => {
  await t.test('should pass custom tools schemas and tool_choice directly to adapter settings', async () => {
    const customTools = [
      {
        function: {
          description: 'performs math operations',
          name: 'custom_math_tool',
          parameters: { type: 'object' }
        },
        type: 'function'
      }
    ]
    const { req, res } = createMockReqRes({
      messages: [{ role: 'user', content: 'hello' }],
      model: 'Tools-Echo/tools-echo',
      stream: false,
      tool_choice: { function: { name: 'custom_math_tool' }, type: 'function' },
      tools: customTools
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.statusCode, 200)
    const data = JSON.parse(res.body.choices[0].message.content)
    assert.strictEqual(data.toolsLength, 1)
    assert.deepStrictEqual(data.toolChoice, { function: { name: 'custom_math_tool' }, type: 'function' })
    assert.deepStrictEqual(data.tools, customTools)
  })

  await t.test('should assign unique indices to parallel tool calls in stream mode', async () => {
    const { req, res } = createMockReqRes({
      messages: [{ role: 'user', content: 'hello' }],
      model: 'Parallel-Tools-Stream/parallel-tools-stream',
      stream: true
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.headers['Content-Type'], 'text/event-stream')
    assert.ok(res.writeBuffer.length > 0)

    // Filter writeBuffer to find toolCall chunks
    const toolCallChunks = res.writeBuffer
      .filter(chunk => chunk.startsWith('data: ') && !chunk.includes('[DONE]'))
      .map(chunk => JSON.parse(chunk.substring(6)))
      .filter(data => data.choices[0].delta.tool_calls)

    // Should have exactly 2 tool calls chunks
    assert.strictEqual(toolCallChunks.length, 2)
    
    // First tool call: index 0
    const toolCall1 = toolCallChunks[0].choices[0].delta.tool_calls[0]
    assert.strictEqual(toolCall1.index, 0)
    assert.strictEqual(toolCall1.id, 'call_aaa')
    assert.strictEqual(toolCall1.function.name, 'toolA')
    
    // Second tool call: index 1
    const toolCall2 = toolCallChunks[1].choices[0].delta.tool_calls[0]
    assert.strictEqual(toolCall2.index, 1)
    assert.strictEqual(toolCall2.id, 'call_bbb')
    assert.strictEqual(toolCall2.function.name, 'toolB')
  })
})

test('OpenAI Proxy Route - Streaming finish_reason and Usage separation', async (t) => {
  await t.test('should send finish_reason chunk first and separate usage chunk with empty choices', async () => {
    const { req, res } = createMockReqRes({
      messages: [{ role: 'user', content: 'hello' }],
      model: 'Usage-Stream/usage-stream-model',
      stream: true
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.headers['Content-Type'], 'text/event-stream')
    assert.strictEqual(res.ended, true)

    const parsedChunks = res.writeBuffer
      .filter(chunk => chunk.startsWith('data: ') && !chunk.includes('[DONE]'))
      .map(chunk => JSON.parse(chunk.substring(6)))

    // Find the finish_reason chunk
    const finishChunk = parsedChunks.find(c => c.choices?.[0]?.finish_reason === 'stop')
    assert.ok(finishChunk, 'Should have emitted a chunk with finish_reason: "stop"')
    assert.deepStrictEqual(finishChunk.choices[0].delta, {})

    // Find the usage chunk
    const usageChunk = parsedChunks.find(c => c.usage && Array.isArray(c.choices) && c.choices.length === 0)
    assert.ok(usageChunk, 'Should have emitted a separate usage chunk with choices: []')
    assert.strictEqual(usageChunk.usage.total_tokens, 15)
    assert.strictEqual(usageChunk.usage.prompt_tokens, 10)
    assert.strictEqual(usageChunk.usage.completion_tokens, 5)

    // Verify ordering: finish chunk must come before usage chunk
    const finishIndex = parsedChunks.indexOf(finishChunk)
    const usageIndex = parsedChunks.indexOf(usageChunk)
    assert.ok(finishIndex < usageIndex, 'finish_reason chunk must precede usage chunk')

    // Verify last chunk in writeBuffer is [DONE]
    assert.strictEqual(res.writeBuffer[res.writeBuffer.length - 1], 'data: [DONE]\n\n')
  })
})

test('OpenAI Proxy Route - Streaming Error Handling (after headersSent)', async (t) => {
  await t.test('should output error SSE chunk and end response cleanly when adapter errors mid-stream', async () => {
    const { req, res } = createMockReqRes({
      messages: [{ role: 'user', content: 'trigger stream error' }],
      model: 'Stream-Error/stream-error-model',
      stream: true
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.ended, true)

    // The stream should have sent an error payload before terminating with [DONE]
    const parsedChunks = res.writeBuffer
      .filter(chunk => chunk.startsWith('data: ') && !chunk.includes('[DONE]'))
      .map(chunk => JSON.parse(chunk.substring(6)))

    const errorChunk = parsedChunks.find(c => c.error)
    assert.ok(errorChunk, 'Stream should output an error chunk when error occurs after headersSent')
    assert.strictEqual(errorChunk.error.code, 'adapter_error')
    assert.ok(errorChunk.error.message.includes('Adapter crashed mid-stream'))

    assert.strictEqual(res.writeBuffer[res.writeBuffer.length - 1], 'data: [DONE]\n\n')
  })

  await t.test('should forward 401 status and clean error message when upstream fails before stream starts', async () => {
    global.middleware.llm.instanceMetadata['upstream-401'] = { adapterType: 'test', displayName: 'Upstream-401' }
    global.middleware.llm.llms['upstream-401'] = {
      guestModels: [],
      models: [{ owner: 'Test', models: ['upstream-401-model'] }],
      async handleChatRequest() {
        const err = new Error('Incorrect API key provided')
        err.status = 401
        err.code = 'invalid_api_key'
        throw err
      }
    }

    const { req, res } = createMockReqRes({
      messages: [{ role: 'user', content: 'hello' }],
      model: 'Upstream-401/upstream-401-model',
      stream: false
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.statusCode, 401)
    assert.strictEqual(res.body.error.code, 'invalid_api_key')
    assert.strictEqual(res.body.error.message, 'Incorrect API key provided')
    assert.strictEqual(res.body.error.type, 'invalid_request_error')
  })
})

test('OpenAI Proxy Route - Multi-turn Tool Message Resolution', async (t) => {
  await t.test('should backfill missing tool name from preceding assistant tool_calls', async () => {
    const { req, res } = createMockReqRes({
      messages: [
        { role: 'user', content: 'What is the weather in Paris?' },
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_weather_1',
              type: 'function',
              function: { name: 'get_current_weather', arguments: '{"city":"Paris"}' }
            }
          ]
        },
        {
          role: 'tool',
          tool_call_id: 'call_weather_1',
          content: '{"temp": 22}'
        }
      ],
      model: 'Tool-Name-Echo/tool-name-echo-model',
      stream: false
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.statusCode, 200)
    const data = JSON.parse(res.body.choices[0].message.content)
    assert.strictEqual(data.resolvedName, 'get_current_weather')
  })
})

test('Gemini Adapter _preProcessMessage - Tool Response Name Resolution', async (t) => {
  await t.test('should resolve name in functionResponse when tool message lacks name field', async () => {
    const { Gemini } = await import('../../lib/chat/llm/adapters/lib/geminiHttpClient.js')
    const gemini = new Gemini({ api_key: 'mock-key', base_url: 'https://mock' })

    const messages = [
      { role: 'user', content: 'calculate 2+2' },
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_calc_99',
            type: 'function',
            function: { name: 'calculator', arguments: '{"expr":"2+2"}' }
          }
        ]
      },
      {
        role: 'tool',
        tool_call_id: 'call_calc_99',
        content: '{"result": 4}'
      }
    ]

    const { contents } = await gemini._preProcessMessage(messages)

    // Contents should have 3 elements: user message, model message, and user (tool response) message
    assert.strictEqual(contents.length, 3)
    const toolResponseContent = contents[2]
    assert.strictEqual(toolResponseContent.role, 'user')
    assert.strictEqual(toolResponseContent.parts.length, 1)

    const fnResponse = toolResponseContent.parts[0].functionResponse
    assert.ok(fnResponse, 'Should contain functionResponse part')
    assert.strictEqual(fnResponse.name, 'calculator')
    assert.strictEqual(fnResponse.response.name, 'calculator')
    assert.strictEqual(fnResponse.response.result, 4)
  })
})


