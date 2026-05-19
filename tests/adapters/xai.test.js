import { test } from 'node:test';
import './mock-env.js';
import { runGenericAdapterTests } from './test-suite.js';
import XAIAdapter from '../../lib/chat/llm/adapters/xai.js';

test('xAI Adapter', async (t) => {
  const config = {
    api_key: 'xai-mock-key',
    base_url: 'https://api.x.ai/v1'
  };

  const mocks = {
    models: async () => [{ owner: 'xAI', models: ['grok-beta'] }],
    createCore: (event) => {
      const createStream = async function* () {
        yield { type: 'response.output_text.delta', delta: 'Hello from xAI' };
      };
      return {
        responses: { create: async () => ({ [Symbol.asyncIterator]: createStream }) },
        models: { list: async () => ({ data: [] }) }
      };
    }
  };

  await runGenericAdapterTests(t, XAIAdapter, config, mocks);
});
