import { test } from 'node:test';
import assert from 'node:assert';
import './mock-env.js';
import { runGenericAdapterTests } from './test-suite.js';
import GeminiAdapter from '../../lib/chat/llm/adapters/implementations/gemini.js';

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

  await t.test('core models() should strip prefix and _getRequestUrl() should prepend if missing', async () => {
    const adapter = new GeminiAdapter(config);
    const originalFetch = globalThis.fetch;
    
    globalThis.fetch = async (url) => {
      assert.ok(url.includes('/v1beta/models'));
      return {
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
            { name: 'models/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
            { name: 'models/gemma-2b', displayName: 'Gemma 2B' },
            { name: 'models/computer-model', displayName: 'Computer Model' }
          ]
        })
      };
    };

    try {
      const modelsList = await adapter.core.models();
      assert.deepStrictEqual(modelsList, [
        { id: 'gemini-1.5-flash' },
        { id: 'gemini-1.5-pro' },
        { id: 'gemma-2b' }
      ]);

      // Test _getRequestUrl
      const url1 = adapter.core._getRequestUrl('gemini-1.5-flash', true);
      assert.ok(url1.includes('/v1beta/models/gemini-1.5-flash:streamGenerateContent'));

      const url2 = adapter.core._getRequestUrl('models/gemini-1.5-pro', false);
      assert.ok(url2.includes('/v1beta/models/gemini-1.5-pro:generateContent'));

      const url3 = adapter.core._getRequestUrl('tunedModels/my-custom-model', false);
      assert.ok(url3.includes('/v1beta/tunedModels/my-custom-model:generateContent'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await runGenericAdapterTests(t, GeminiAdapter, config, mocks);
});
