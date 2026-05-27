import { test } from 'node:test';
import assert from 'node:assert';
import './mock-env.js';
import { runGenericAdapterTests } from './test-suite.js';
import ZhipuAdapter from '../../lib/chat/llm/adapters/implementations/zhipu.js';

test('Zhipu Adapter - Metadata & Core Initialization', async (t) => {
  const metadata = ZhipuAdapter.getAdapterMetadata();
  assert.strictEqual(metadata.type, 'zhipu');
  assert.strictEqual(metadata.avatarId, 'zhipu');
  assert.strictEqual(metadata.initialConfigSchema.base_url.default, 'https://open.bigmodel.cn/api/paas/v4/');
  assert.deepStrictEqual(metadata.supportedFeatures, ['chat', 'streaming', 'function_calling', 'vision', 'reasoning']);
});

test('Zhipu Adapter - Chat Body Preparation', async (t) => {
  const config = {
    api_key: 'sk-zhipu-mock',
    base_url: 'https://open.bigmodel.cn/api/paas/v4/'
  };

  const adapter = new ZhipuAdapter(config);

  // 测试 1: 当 reasoning_effort 开启时
  const bodyWithReasoning = {
    messages: [{ role: 'user', content: 'Hello' }],
    settings: {
      base: { model: 'glm-4.7', stream: true },
      chatParams: { reasoning_effort: 3, temperature: 0.7 },
      toolCallSettings: { tools: [], mode: 'NONE' }
    }
  };

  const resultWithReasoning = await adapter._prepareChatBody(bodyWithReasoning);
  assert.deepStrictEqual(resultWithReasoning.extra_body, {
    thinking: { type: 'enabled' }
  });
  assert.strictEqual(resultWithReasoning.reasoning_effort, undefined);

  // 测试 2: 当 reasoning_effort 关闭（为 0）时
  const bodyWithoutReasoning = {
    messages: [{ role: 'user', content: 'Hello' }],
    settings: {
      base: { model: 'glm-4.7', stream: true },
      chatParams: { reasoning_effort: 0, temperature: 0.7 },
      toolCallSettings: { tools: [], mode: 'NONE' }
    }
  };

  const resultWithoutReasoning = await adapter._prepareChatBody(bodyWithoutReasoning);
  assert.deepStrictEqual(resultWithoutReasoning.extra_body, {
    thinking: { type: 'disabled' }
  });
  assert.strictEqual(resultWithoutReasoning.reasoning_effort, undefined);

  // 测试 3: 当 reasoning_effort 未设置时
  const bodyNoReasoning = {
    messages: [{ role: 'user', content: 'Hello' }],
    settings: {
      base: { model: 'glm-4.7', stream: true },
      chatParams: { temperature: 0.7 },
      toolCallSettings: { tools: [], mode: 'NONE' }
    }
  };

  const resultNoReasoning = await adapter._prepareChatBody(bodyNoReasoning);
  assert.strictEqual(resultNoReasoning.extra_body, undefined);
  assert.strictEqual(resultNoReasoning.reasoning_effort, undefined);
});

test('Zhipu Adapter - Generic Suite Integration', async (t) => {
  const config = {
    api_key: 'sk-zhipu-mock',
    base_url: 'https://open.bigmodel.cn/api/paas/v4/'
  };

  const mocks = {
    models: async () => [{ owner: '智谱清言', models: ['glm-4.7'] }],
    createCore: (event) => {
      const createStream = async function* () {
        yield { choices: [{ delta: { reasoning_content: 'Thinking...' } }] };
        yield { choices: [{ delta: { content: 'Hello from GLM' } }] };
      };
      return {
        chat: { completions: { create: async () => ({ [Symbol.asyncIterator]: createStream }) } },
        models: { list: async () => ({ data: [] }) }
      };
    }
  };

  await runGenericAdapterTests(t, ZhipuAdapter, config, mocks);
});
