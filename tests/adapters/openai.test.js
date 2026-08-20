import { test } from 'node:test';
import assert from 'node:assert';
import './mock-env.js';
import { runGenericAdapterTests } from './test-suite.js';
import OpenAIBot from '../../lib/chat/llm/adapters/implementations/openai.js';

test('OpenAI Adapter', async (t) => {
  const config = {
    api_key: 'sk-mock-key',
    base_url: 'https://api.openai.com/v1'
  };

  const mocks = {
    createCore: (_event) => {
      const createStream = async function* () {
        yield { choices: [{ delta: { content: 'Hello from OpenAI' } }] };
        yield { usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
      };
      const mock = {
        chat: { completions: { create: async () => ({ [Symbol.asyncIterator]: createStream }) } },
        models: { list: async () => ({ data: [] }) }
      };
      return mock;
    },
    models: async () => [{ owner: 'OpenAI', models: ['gpt-4o', 'gpt-3.5-turbo'] }]
  };

  await runGenericAdapterTests(t, OpenAIBot, config, mocks);
});

test('OpenAI Adapter - Defensive Destructuring & Payload Assembly', async (_t) => {
  const config = {
    api_key: 'sk-mock-key',
    base_url: 'https://api.openai.com/v1'
  };
  const adapter = new OpenAIBot(config);

  // 1. 空 settings 和缺失 chatParams 时不报错
  const emptyBody = {
    messages: [{ content: 'Hello', role: 'user' }],
    settings: {}
  };
  const resultEmpty = await adapter._prepareChatBody(emptyBody);
  assert.strictEqual(resultEmpty.messages.length, 1);
  assert.strictEqual(resultEmpty.reasoning_effort, undefined);

  // 2. 完全没有 settings 属性
  const noSettingsBody = {
    messages: [{ content: 'Hello', role: 'user' }]
  };
  const resultNoSettings = await adapter._prepareChatBody(noSettingsBody);
  assert.strictEqual(resultNoSettings.messages.length, 1);

  // 3. 正常传递采样参数与 reasoning_effort
  const bodyWithParams = {
    messages: [{ content: 'Hello', role: 'user' }],
    settings: {
      base: { model: 'gpt-4o', stream: true },
      chatParams: {
        temperature: 0.7,
        top_p: 0.9,
        reasoning_effort: 3
      },
      toolCallSettings: { mode: 'NONE', tools: [] }
    }
  };
  const resultWithParams = await adapter._prepareChatBody(bodyWithParams);
  assert.strictEqual(resultWithParams.temperature, 0.7);
  assert.strictEqual(resultWithParams.top_p, 0.9);
  assert.strictEqual(resultWithParams.reasoning_effort, 'medium');

  // 4. reasoning_effort 为 -1 时不注入
  const bodyDefaultEffort = {
    messages: [{ content: 'Hello', role: 'user' }],
    settings: {
      base: { model: 'gpt-4o', stream: true },
      chatParams: {
        reasoning_effort: -1
      }
    }
  };
  const resultDefaultEffort = await adapter._prepareChatBody(bodyDefaultEffort);
  assert.strictEqual(resultDefaultEffort.reasoning_effort, undefined);
  assert.strictEqual('reasoning_effort' in resultDefaultEffort, false);
});

