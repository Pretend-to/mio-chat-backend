import { test } from 'node:test';
import './mock-env.js';
import { runGenericAdapterTests } from './test-suite.js';
import DeepSeekAdapter from '../../lib/chat/llm/adapters/implementations/deepseek.js';

test('DeepSeek Adapter', async (t) => {
  const config = {
    api_key: 'sk-deepseek-mock',
    base_url: 'https://api.deepseek.com/v1'
  };

  const mocks = {
    models: async () => [{ owner: 'DeepSeek', models: ['deepseek-chat'] }],
    createCore: (event) => {
      const createStream = async function* () {
        yield { choices: [{ delta: { reasoning_content: 'Thinking about DeepSeek...' } }] };
        yield { choices: [{ delta: { content: 'Hello from DeepSeek' } }] };
      };
      return {
        chat: { completions: { create: async () => ({ [Symbol.asyncIterator]: createStream }) } }
      };
    }
  };

  await runGenericAdapterTests(t, DeepSeekAdapter, config, mocks);
});
