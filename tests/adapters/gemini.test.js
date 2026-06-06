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

  await t.test('_processStreamResponse handles SSE line split across chunks', async () => {
    const { Gemini } = await import('../../lib/chat/llm/adapters/lib/geminiHttpClient.js');
    const gemini = new Gemini({ base_url: 'https://mock', api_key: 'key' });

    // 完整的 SSE 行
    const fullLine1 = 'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n';
    // 第二行被切成两个 chunk
    const fullLine2 = 'data: {"candidates":[{"content":{"parts":[{"text":"World"}]}}]}\n';
    
    const chunk1 = fullLine1 + fullLine2.substring(0, 30);
    const chunk2 = fullLine2.substring(30);

    const encoder = new TextEncoder();

    let readIndex = 0;
    const chunks = [encoder.encode(chunk1), encoder.encode(chunk2)];
    
    const mockResponse = {
      body: {
        getReader() {
          return {
            async read() {
              if (readIndex < chunks.length) {
                return { done: false, value: chunks[readIndex++] };
              }
              return { done: true, value: undefined };
            },
            releaseLock() {}
          };
        }
      }
    };

    const results = [];
    for await (const chunk of gemini._processStreamResponse(mockResponse)) {
      results.push(chunk);
    }

    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].candidates[0].content.parts[0].text, 'Hello');
    assert.strictEqual(results[1].candidates[0].content.parts[0].text, 'World');
  });

  await t.test('_executeChatRequest handles thought blocks and avoids appending to cachedMessage.content', async () => {
    const adapter = new GeminiAdapter({
      api_key: 'mock-key',
      base_url: 'https://generativelanguage.googleapis.com'
    });

    const updates = [];
    const mockEvent = {
      requestId: 'test-req',
      body: {
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'test' }],
        settings: {}
      },
      update(up) {
        updates.push(up);
      },
      client: {
        popEvent() {},
        popConnection() {}
      }
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      const fullLine1 = 'data: {"candidates":[{"content":{"parts":[{"text":"Thinking hard...", "thought": true}]}}]}\\n';
      const fullLine2 = 'data: {"candidates":[{"content":{"parts":[{"text":"Final answer"}]}}]}\\n';
      const encoder = new TextEncoder();
      const chunks = [encoder.encode(fullLine1), encoder.encode(fullLine2)];
      let index = 0;

      return {
        ok: true,
        body: {
          getReader() {
            return {
              async read() {
                if (index < chunks.length) {
                  return { done: false, value: chunks[index++] };
                }
                return { done: true, value: undefined };
              },
              releaseLock() {}
            };
          }
        }
      };
    };

    try {
      await adapter._executeChatRequest(mockEvent.body, mockEvent);
      
      // Verify updates received both reasoningContent and content
      assert.deepStrictEqual(updates, [
        { type: 'reasoningContent', content: 'Thinking hard...' },
        { type: 'content', content: 'Final answer' }
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await runGenericAdapterTests(t, GeminiAdapter, config, mocks);
});
