import { test } from 'node:test';
import assert from 'node:assert';
import './mock-env.js';
import { runGenericAdapterTests } from './test-suite.js';
import DeepSeekAdapter from '../../lib/chat/llm/adapters/implementations/deepseek.js';

test('DeepSeek Adapter - Chat Body Preparation', async (_t) => {
  const config = {
    api_key: 'sk-deepseek-mock',
    base_url: 'https://api.deepseek.com/v1'
  };

  const adapter = new DeepSeekAdapter(config);

  // 测试 1: 当 reasoning_effort 开启为 2 (Low，兼容映射为 high) 时
  const bodyWithReasoning = {
    messages: [{ content: 'Hello', role: 'user' }],
    settings: {
      base: { model: 'deepseek-reasoner', stream: true },
      chatParams: { reasoning_effort: 2, temperature: 0.7 },
      toolCallSettings: { mode: 'NONE', tools: [] }
    }
  };

  const resultWithReasoning = await adapter._prepareChatBody(bodyWithReasoning);
  assert.deepStrictEqual(resultWithReasoning.extra_body, {
    thinking: { type: 'enabled' }
  });
  assert.strictEqual(resultWithReasoning.reasoning_effort, 'high');

  // 测试 2: 当 reasoning_effort 关闭（为 0）时
  const bodyWithoutReasoning = {
    messages: [{ content: 'Hello', role: 'user' }],
    settings: {
      base: { model: 'deepseek-reasoner', stream: true },
      chatParams: { reasoning_effort: 0, temperature: 0.7 },
      toolCallSettings: { mode: 'NONE', tools: [] }
    }
  };

  const resultWithoutReasoning = await adapter._prepareChatBody(bodyWithoutReasoning);
  assert.deepStrictEqual(resultWithoutReasoning.extra_body, {
    thinking: { type: 'disabled' }
  });
  assert.strictEqual(resultWithoutReasoning.reasoning_effort, undefined);

  // 测试 3: 当 reasoning_effort 未设置时 (默认 high)
  const bodyNoReasoning = {
    messages: [{ content: 'Hello', role: 'user' }],
    settings: {
      base: { model: 'deepseek-reasoner', stream: true },
      chatParams: { temperature: 0.7 },
      toolCallSettings: { mode: 'NONE', tools: [] }
    }
  };

  const resultNoReasoning = await adapter._prepareChatBody(bodyNoReasoning);
  assert.deepStrictEqual(resultNoReasoning.extra_body, {
    thinking: { type: 'enabled' }
  });
  assert.strictEqual(resultNoReasoning.reasoning_effort, 'high');
});

test('DeepSeek Adapter - Generic Suite Integration', async (t) => {
  const config = {
    api_key: 'sk-deepseek-mock',
    base_url: 'https://api.deepseek.com/v1'
  };

  const mocks = {
    createCore: (_event) => {
      const createStream = async function* () {
        yield { choices: [{ delta: { reasoning_content: 'Thinking about DeepSeek...' } }] };
        yield { choices: [{ delta: { content: 'Hello from DeepSeek' } }] };
      };
      return {
        chat: { completions: { create: async () => ({ [Symbol.asyncIterator]: createStream }) } }
      };
    },
    models: async () => [{ owner: 'DeepSeek', models: ['deepseek-chat'] }]
  };

  await runGenericAdapterTests(t, DeepSeekAdapter, config, mocks);
});
