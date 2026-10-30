import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EventEmitter } from 'node:events'
import './mock-env.js'
import BaseLLMAdapter from '../../lib/chat/llm/adapters/base.js'
import { chatCompletions } from '../../lib/server/http/controllers/oaiProxyController.js'

const tools = [{ type: 'function', function: {
  name: 'client_weather', description: 'Weather', strict: true,
  parameters: { type: 'object', properties: {}, additionalProperties: false },
} }]
const toolCalls = [{ id: 'call_weather', type: 'function', function: {
  name: 'client_weather', arguments: '{}',
} }]

for (const stream of [false, true]) {
  test(`proxy preserves client schemas and returns tools (stream=${stream})`, async () => {
    const adapter = new BaseLLMAdapter({ type: 'test' })
    adapter.models = [{ models: ['proxy-test'] }]
    adapter._prepareChatBody = async (body, event) => {
      const formatted = adapter._getFormattedTools(
        body.settings.toolCallSettings.tools, true, event,
      )
      assert.deepEqual(formatted, tools)
      assert.deepEqual(body.settings.chatParams.tool_choice, {
        type: 'function', function: { name: 'client_weather' },
      })
      return body
    }
    let executions = 0
    adapter._executeChatRequest = async (_body, event) => {
      executions++
      req.emit('close') // A fully received HTTP request is not a response disconnect.
      assert.equal(event.aborted, false)
      if (stream) {
        event.update({ type: 'toolCall', content: {
          id: 'call_weather', name: 'client_weather', parameters: '{',
        } })
      }
      return { toolCalls }
    }
    adapter._handleToolCalls = async () => assert.fail('must not execute client tools')
    global.middleware.llm.llms = { proxy: adapter }
    const req = Object.assign(new EventEmitter(), {
      body: { model: 'proxy-test', messages: [{ role: 'user', content: 'weather' }],
        tools, stream, tool_choice: { type: 'function', function: { name: 'client_weather' } } },
      headers: { authorization: `Bearer ${process.env.ADMIN_CODE}` },
    })
    const res = Object.assign(new EventEmitter(), {
      chunks: [], headers: {}, writableEnded: false,
      setHeader(key, value) { this.headers[key] = value },
      write(chunk) { this.chunks.push(chunk) },
      end() { this.writableEnded = true },
      status(code) { this.statusCode = code; return this },
      json(body) { this.body = body; this.writableEnded = true },
    })
    await chatCompletions(req, res)
    assert.equal(executions, 1)
    assert.equal(res.writableEnded, true)
    if (stream) {
      const chunks = res.chunks.filter(c => !c.includes('[DONE]')).map(c => JSON.parse(c.slice(6)))
      const calls = chunks.flatMap(c => c.choices[0]?.delta?.tool_calls || [])
      assert.equal(calls[0].function.name, 'client_weather')
      assert.equal(calls.map(call => call.function.arguments).join(''), '{}')
      assert.equal(chunks.at(-1).choices[0].finish_reason, 'tool_calls')
    } else {
      assert.deepEqual(res.body.choices[0].message.tool_calls, toolCalls)
      assert.equal(res.body.choices[0].finish_reason, 'tool_calls')
    }
  })
}

test('proxy converts provider schemas without applying server tool-name policy', () => {
  const adapter = new BaseLLMAdapter({ type: 'test' })
  const context = { source: 'proxy', conversationKind: 'none',
    settings: { toolCallSettings: { tools, passthrough: true } } }
  for (const type of ['claude', 'gemini', 'openai-responses']) {
    Object.defineProperty(adapter, 'toolJsonType', { value: type, configurable: true })
    const [schema] = adapter._getFormattedTools(tools, true, context)
    assert.equal(schema.name, 'client_weather')
    assert.deepEqual(schema.input_schema || schema.parameters, tools[0].function.parameters)
    if (type === 'openai-responses') assert.equal(schema.strict, true)
  }
})
