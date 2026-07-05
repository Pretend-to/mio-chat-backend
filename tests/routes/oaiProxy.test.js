import { test } from 'node:test'
import assert from 'node:assert'
import crypto from 'crypto'
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
  llms: {
    'openai-1': {
      models: [
        { owner: 'OpenAI', models: ['gpt-4o', 'gpt-3.5-turbo'] }
      ],
      guestModels: [],
      async handleChatRequest(e) {
        // Simulates typical text response
        e.update({ type: 'content', content: 'Hello ' })
        e.update({ type: 'content', content: 'world!' })
        e.complete()
      }
    },
    'gemini-1': {
      models: [
        { owner: 'Google', models: ['gemini-1.5-pro'] }
      ],
      guestModels: [],
      async handleChatRequest(e) {
        e.update({ type: 'content', content: 'Gemini reply' })
        e.complete()
      }
    },
    'tool-adapter': {
      models: [
        { owner: 'OpenAI', models: ['gpt-4-tools'] }
      ],
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
      }
    },
    'gemini-stream-tools': {
      models: [
        { owner: 'Google', models: ['gemini-stream-tools'] }
      ],
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
      }
    },
    'args-echo': {
      models: [
        { owner: 'Test', models: ['args-echo'] }
      ],
      guestModels: [],
      // Captures the last assistant tool_calls arguments seen in e.body.messages
      async handleChatRequest(e) {
        const msgs = e.body.messages
        const assistantMsg = [...msgs].reverse().find(m => m.role === 'assistant' && Array.isArray(m.tool_calls))
        if (assistantMsg) {
          e.update({ type: 'content', content: assistantMsg.tool_calls[0].function.arguments })
        }
        e.complete()
      }
    },
    'tools-echo': {
      models: [
        { owner: 'Test', models: ['tools-echo'] }
      ],
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
      }
    }
  },
  instanceMetadata: {
    'openai-1': { displayName: 'OpenAI-主要', adapterType: 'openai' },
    'gemini-1': { displayName: 'Gemini-主要', adapterType: 'gemini' },
    'tool-adapter': { displayName: 'Tools-Instance', adapterType: 'openai' },
    'gemini-stream-tools': { displayName: 'Gemini-Stream-Tools', adapterType: 'gemini' },
    'args-echo': { displayName: 'Args-Echo', adapterType: 'test' },
    'tools-echo': { displayName: 'Tools-Echo', adapterType: 'openai' }
  }
}

// Add fallback _handleToolCalls method to mock adapters
for (const [id, adapter] of Object.entries(global.middleware.llm.llms)) {
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
    query: {},
    on: (event, callback) => {
      if (event === 'close') {
        req.closeCallback = callback
      }
    }
  }

  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    headersSent: false,
    writeBuffer: [],
    ended: false,
    status(code) {
      this.statusCode = code
      return this
    },
    json(data) {
      this.body = data
      return this
    },
    setHeader(name, value) {
      this.headers[name] = value
    },
    write(data) {
      this.writeBuffer.push(data)
    },
    end() {
      this.ended = true
    },
    flushHeaders() {
      this.headersSent = true
    }
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
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
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
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
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
      model: 'Gemini-主要/gemini-1.5-pro',
      messages: [{ role: 'user', content: 'hello' }],
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
      model: 'gpt-4-tools',
      messages: [{ role: 'user', content: 'get weather' }],
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
      model: 'Gemini-Stream-Tools/gemini-stream-tools',
      messages: [{ role: 'user', content: 'run tool' }],
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
      model: 'Args-Echo/args-echo',
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
      stream: false
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.statusCode, 200)
    // The adapter echoes back what it sees for arguments; it should be the clean version
    const echoed = res.body.choices[0].message.content
    assert.strictEqual(echoed, validArgs, `Expected clean args but got: ${echoed}`)
  })

  await t.test('should leave already-valid arguments unchanged', async () => {
    const validArgs = JSON.stringify({ user_prompt: 'hello', code: 'print(1)' })

    const { req, res } = createMockReqRes({
      model: 'Args-Echo/args-echo',
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
        type: 'function',
        function: {
          name: 'custom_math_tool',
          description: 'performs math operations',
          parameters: { type: 'object' }
        }
      }
    ]
    const { req, res } = createMockReqRes({
      model: 'Tools-Echo/tools-echo',
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
      tools: customTools,
      tool_choice: { type: 'function', function: { name: 'custom_math_tool' } }
    })

    await oaiProxyController.chatCompletions(req, res)

    assert.strictEqual(res.statusCode, 200)
    const data = JSON.parse(res.body.choices[0].message.content)
    assert.strictEqual(data.toolsLength, 1)
    assert.deepStrictEqual(data.toolChoice, { type: 'function', function: { name: 'custom_math_tool' } })
    assert.deepStrictEqual(data.tools, customTools)
  })
})

