import { test } from 'node:test'
import assert from 'node:assert'
import './mock-env.js'
import { getAdapterClass } from '../../lib/chat/llm/adapters/registry.js'
import OpenAIResponsesBot from '../../lib/chat/llm/adapters/implementations/openai-responses.js'

test('Volcengine Adapter Registration & Metadata (Declarative)', async (_t) => {
  const VolcengineAdapter = await getAdapterClass('volcengine')
  assert.ok(VolcengineAdapter)
  const metadata = VolcengineAdapter.getAdapterMetadata()

  assert.strictEqual(metadata.type, 'volcengine')
  assert.strictEqual(metadata.name, 'Volcengine (火山引擎)')
  assert.deepStrictEqual(metadata.supportedFeatures, [
    'chat',
    'streaming',
    'function_calling',
    'vision',
    'reasoning',
  ])
  assert.strictEqual(
    metadata.initialConfigSchema.base_url.default,
    'https://ark.cn-beijing.volces.com/api/v3',
  )
  // 顶层扁平化 extraSettingsSchema
  assert.ok(metadata.extraSettingsSchema.web_search)
})

test('Volcengine Adapter Inheritance and Dynamic Extra Settings (Flat)', async (_t) => {
  const VolcengineAdapter = await getAdapterClass('volcengine')
  const adapter = new VolcengineAdapter({
    api_key: 'mock-key',
    base_url: 'https://ark.cn-beijing.volces.com/api/v3',
  })

  assert.ok(adapter instanceof OpenAIResponsesBot)
  assert.strictEqual(adapter.provider, 'volcengine')

  // 测试扁平化顶层 extraSettings
  const flatBody = {
    messages: [{ content: 'hello', role: 'user' }],
    settings: {
      base: { model: 'doubao-1.5-pro', stream: true },
      chatParams: { temperature: 0.7 },
      extraSettings: {
        web_search: {
          enable: true,
          search_context_size: 'high',
        },
      },
      toolCallSettings: { mode: 'AUTO', tools: [] },
    },
  }

  const preparedFlat = await adapter._prepareChatBody(flatBody)
  assert.ok(preparedFlat.tools)
  const flatTool = preparedFlat.tools.find((tool) => tool.type === 'web_search')
  assert.ok(flatTool)
  assert.strictEqual(flatTool.search_context_size, 'high')
})

test('OpenAIResponses / Volcengine enforces minimum max_output_tokens >= 16', async (_t) => {
  const VolcengineAdapter = await getAdapterClass('volcengine')
  const adapter = new VolcengineAdapter({
    api_key: 'mock-key',
    base_url: 'https://ark.cn-beijing.volces.com/api/v3',
  })

  // 当传入 max_tokens: 1 时，自动纠偏为 16 以符合规范下限
  const probeBody = {
    messages: [{ content: 'hi', role: 'user' }],
    settings: {
      base: { model: 'doubao-1.5-pro' },
      chatParams: { max_tokens: 1 },
    },
  }
  const prepared = await adapter._prepareChatBody(probeBody)
  assert.strictEqual(prepared.max_output_tokens, 16)

  // 正常较大值正常保留
  const regularBody = {
    messages: [{ content: 'hi', role: 'user' }],
    settings: {
      base: { model: 'doubao-1.5-pro' },
      chatParams: { max_tokens: 1024 },
    },
  }
  const preparedRegular = await adapter._prepareChatBody(regularBody)
  assert.strictEqual(preparedRegular.max_output_tokens, 1024)
})
