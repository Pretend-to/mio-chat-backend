import { test } from 'node:test';
import assert from 'node:assert';
import './mock-env.js';
import VolcengineAdapter from '../../lib/chat/llm/adapters/implementations/volcengine.js';
import OpenAIResponsesBot from '../../lib/chat/llm/adapters/implementations/openai-responses.js';

test('Volcengine Adapter Registration & Metadata', async (t) => {
  const metadata = VolcengineAdapter.getAdapterMetadata();

  assert.strictEqual(metadata.type, 'volcengine');
  assert.strictEqual(metadata.name, 'Volcengine (火山引擎)');
  assert.deepStrictEqual(metadata.supportedFeatures, [
    'chat',
    'streaming',
    'function_calling',
    'vision',
    'reasoning',
  ]);
  assert.strictEqual(
    metadata.initialConfigSchema.base_url.default,
    'https://ark.cn-beijing.volces.com/api/v3'
  );
  assert.ok(metadata.extraSettingsSchema.volcengine.web_search);
});

test('Volcengine Adapter Inheritance and Dynamic Extra Settings', async (t) => {
  const adapter = new VolcengineAdapter({
    api_key: 'mock-key',
    base_url: 'https://ark.cn-beijing.volces.com/api/v3',
  });

  assert.ok(adapter instanceof OpenAIResponsesBot);
  assert.strictEqual(adapter.provider, 'volcengine');

  // Test _prepareChatBody retrieves volcengine specific extra settings
  const body = {
    messages: [{ role: 'user', content: 'hello' }],
    settings: {
      base: { model: 'doubao-1.5-pro', stream: true },
      chatParams: { temperature: 0.7 },
      toolCallSettings: { mode: 'AUTO', tools: [] },
      extraSettings: {
        volcengine: {
          web_search: {
            enable: true,
            search_context_size: 'high',
          },
        },
      },
    },
  };

  const prepared = await adapter._prepareChatBody(body);
  assert.ok(prepared.tools);
  const webSearchTool = prepared.tools.find((tool) => tool.type === 'web_search');
  assert.ok(webSearchTool);
  assert.strictEqual(webSearchTool.search_context_size, 'high');
});
