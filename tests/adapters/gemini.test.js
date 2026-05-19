import { test } from 'node:test';
import './mock-env.js';
import { runGenericAdapterTests } from './test-suite.js';
import GeminiAdapter from '../../lib/chat/llm/adapters/gemini.js';

test('Gemini Adapter', async (t) => {
  const config = {
    api_key: 'AIza-mock-key',
    base_url: 'https://generativelanguage.googleapis.com'
  };

  const mocks = {
    models: async () => [{ owner: 'Gemini', models: ['gemini-1.5-pro'] }],
    createCore: (event) => ({
      chat: async function* () {
        yield { candidates: [{ content: { parts: [{ text: 'Hello from Gemini' }] } }] };
      }
    })
  };

  await runGenericAdapterTests(t, GeminiAdapter, config, mocks);
});
