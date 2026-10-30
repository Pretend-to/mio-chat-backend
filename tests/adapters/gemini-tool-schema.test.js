import assert from 'node:assert/strict'
import test from 'node:test'
import './mock-env.js'
import { normalizeGeminiSchema } from '../../lib/chat/llm/utils/geminiSchema.js'
import { MioFunction } from '../../lib/function.js'

function nullableTool() {
  return new MioFunction({
    name: 'nullable_tool',
    description: 'Nullable schema regression',
    parameters: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string' },
        defaultDeliveryChannelId: {
          description: 'Nullable channel',
          type: ['string', 'null'],
        },
      },
    },
  })
}
import GeminiAdapter from '../../lib/chat/llm/adapters/implementations/gemini.js'
import AgentPlatformAdapter from '../../lib/chat/llm/adapters/implementations/agentPlatform.js'

const context = {
  user: { isAdmin: true },
  source: 'channel',
  agentId: 'a',
  sessionId: 's',
}

test('nullable tool parameter parameter projects correctly without changing its registration', () => {
  const tool = nullableTool()
  const original = structuredClone(tool.parameters)
  const name = tool.name
  for (const provider of [
    'gemini',
    'vertex',
    'vertexExpress',
    'agentPlatform',
  ]) {
    const schema = tool.json(provider, context)
    assert.deepEqual(schema.parameters.properties.defaultDeliveryChannelId, {
      description: original.properties.defaultDeliveryChannelId.description,
      type: 'string',
      nullable: true,
    })
    assert.deepEqual(schema.parameters.required, ['action'])
    assert.equal(schema.name, name)
  }
  assert.deepEqual(tool.parameters, original)
  assert.deepEqual(tool.json('openai', context).function.parameters, original)
  assert.deepEqual(tool.json('claude', context).input_schema, original)
  assert.equal(tool.name, name)
})

test('nullable schemas normalize recursively while literal defaults and examples remain intact', () => {
  const literal = { type: ['string', 'null'] }
  const schema = {
    type: 'object',
    properties: {
      items: {
        type: ['null', 'array'],
        items: {
          type: 'object',
          properties: {
            name: { type: ['null', 'string'] },
          },
        },
      },
      choice: { anyOf: [{ type: ['integer', 'null'] }, { type: 'boolean' }] },
      payload: { type: 'object', default: literal, example: literal },
    },
  }
  const result = normalizeGeminiSchema(schema)
  assert.equal(result.properties.items.type, 'array')
  assert.equal(result.properties.items.nullable, true)
  assert.deepEqual(result.properties.items.items.properties.name, {
    type: 'string',
    nullable: true,
  })
  assert.deepEqual(result.properties.choice.anyOf[0], {
    type: 'integer',
    nullable: true,
  })
  assert.deepEqual(result.properties.payload.default, literal)
  assert.deepEqual(result.properties.payload.example, literal)
  assert.deepEqual(schema.properties.items.type, ['null', 'array'])
})

test('mixed type unions keep object and array constraints inside their own alternatives', () => {
  const result = normalizeGeminiSchema({
    type: ['object', 'array', 'null'],
    properties: { x: { type: ['string', 'null'] } },
    required: ['x'],
    items: { type: ['integer', 'null'] },
  })
  assert.equal(result.type, undefined)
  assert.equal(result.required, undefined)
  assert.equal(result.nullable, true)
  assert.deepEqual(result.anyOf[0].required, ['x'])
  assert.equal(result.anyOf[0].items, undefined)
  assert.equal(result.anyOf[1].properties, undefined)
  assert.deepEqual(result.anyOf[1].items, { type: 'integer', nullable: true })
})

for (const Adapter of [GeminiAdapter, AgentPlatformAdapter]) {
  test(`${Adapter.name} prepares passthrough tool schemas with scalar nullable types`, async () => {
    const tool = nullableTool()
    const adapter = new Adapter({
      api_key: 'test-key',
      base_url: 'https://example.test',
      project_id: 'schema-test',
      location: 'us-central1',
    })
    const prepared = await adapter._prepareChatBody(
      {
        messages: [{ role: 'user', content: 'hello' }],
        settings: {
          base: { model: 'gemini-test', stream: false },
          toolCallSettings: {
            mode: 'AUTO',
            passthrough: true,
            tools: [
              {
                type: 'function',
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters,
                },
              },
            ],
          },
        },
      },
      context,
    )
    const parameter =
      prepared.tools[0].functionDeclarations[0].parameters.properties
        .defaultDeliveryChannelId
    assert.equal(parameter.type, 'string')
    assert.equal(parameter.nullable, true)
    assert.deepEqual(tool.parameters.properties.defaultDeliveryChannelId.type, [
      'string',
      'null',
    ])
  })
}
