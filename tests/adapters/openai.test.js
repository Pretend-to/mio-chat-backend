import { test } from 'node:test';
import './mock-env.js';
import { runGenericAdapterTests } from './test-suite.js';
import OpenAIBot from '../../lib/chat/llm/adapters/openai.js';

test('OpenAI Adapter', async (t) => {
  const config = {
    api_key: 'sk-mock-key',
    base_url: 'https://api.openai.com/v1'
  };

  const mocks = {
    models: async () => [{ owner: 'OpenAI', models: ['gpt-4o', 'gpt-3.5-turbo'] }],
    createCore: (event) => {
      const createStream = async function* () {
        yield { choices: [{ delta: { content: 'Hello from OpenAI' } }] };
        yield { usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
      };
      const mock = {
        chat: { completions: { create: async () => ({ [Symbol.asyncIterator]: createStream }) } },
        models: { list: async () => ({ data: [] }) }
      };
      return mock;
    }
  };

  await runGenericAdapterTests(t, OpenAIBot, config, mocks);
});
