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
    }
  },
  instanceMetadata: {
    'openai-1': { displayName: 'OpenAI-主要', adapterType: 'openai' },
    'gemini-1': { displayName: 'Gemini-主要', adapterType: 'gemini' },
    'tool-adapter': { displayName: 'Tools-Instance', adapterType: 'openai' }
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
