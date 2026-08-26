import { test } from 'node:test';
import assert from 'node:assert';
import './mock-env.js';
import { runGenericAdapterTests } from './test-suite.js';
import XAIAdapter from '../../lib/chat/llm/adapters/implementations/xai.js';

test('xAI Adapter', async (t) => {
  const config = {
    api_key: 'xai-mock-key',
    base_url: 'https://api.x.ai/v1'
  };

  const mocks = {
    createCore: (_event) => {
      const createStream = async function* () {
        yield { type: 'response.output_text.delta', delta: 'Hello from xAI' };
      };
      return {
        responses: { create: async () => ({ [Symbol.asyncIterator]: createStream }) },
        models: { list: async () => ({ data: [] }) }
      };
    },
    models: async () => [{ owner: 'xAI', models: ['grok-beta'] }]
  };

  await t.test('_prepareChatBody correctly configures xAI web_search and x_search tools', async () => {
    const adapter = new XAIAdapter({
      api_key: 'xai-mock-key',
      base_url: 'https://api.x.ai/v1'
    });

    // Test 1: web_search enabled via extraSettings.xai.web_search
    const body1 = {
      messages: [{ content: 'latest news', role: 'user' }],
      settings: {
        base: { model: 'grok-beta', stream: true },
        chatParams: { reasoning_effort: 2 },
        extraSettings: {
          xai: {
            web_search: {
              allowed_domains: ['x.ai'],
              enable: true,
              enable_image_understanding: true,
              excluded_domains: ['bad.com']
            }
          }
        },
        toolCallSettings: { mode: 'AUTO', tools: [] }
      }
    };
    const prepared1 = await adapter._prepareChatBody(body1);
    assert.strictEqual(prepared1.reasoning, undefined); // Should strip reasoning param
    assert.ok(Array.isArray(prepared1.tools));
    assert.strictEqual(prepared1.tools.length, 1);
    assert.deepStrictEqual(prepared1.tools[0], {
      type: 'web_search',
      web_search: {
        allowed_domains: ['x.ai'],
        enable_image_understanding: true,
        excluded_domains: ['bad.com']
      }
    });

    // Test 2: x_search enabled via extraSettings.x_search
    const body2 = {
      messages: [{ content: 'trending posts', role: 'user' }],
      settings: {
        base: { model: 'grok-beta', stream: true },
        chatParams: {},
        extraSettings: {
          x_search: {
            allowed_x_handles: ['elonmusk'],
            enable: true
          }
        },
        toolCallSettings: { mode: 'AUTO', tools: [] }
      }
    };
    const prepared2 = await adapter._prepareChatBody(body2);
    assert.ok(Array.isArray(prepared2.tools));
    assert.strictEqual(prepared2.tools.length, 1);
    assert.deepStrictEqual(prepared2.tools[0], {
      type: 'x_search',
      x_search: {
        allowed_x_handles: ['elonmusk'],
        enable_image_understanding: undefined,
        enable_video_understanding: undefined,
        excluded_x_handles: undefined
      }
    });

    // Test 3: Both web_search and x_search enabled simultaneously
    const body3 = {
      messages: [{ content: 'search all', role: 'user' }],
      settings: {
        base: { model: 'grok-beta', stream: true },
        chatParams: {},
        extraSettings: {
          xai: {
            web_search: { enable: true },
            x_search: { enable: true }
          }
        },
        toolCallSettings: { mode: 'AUTO', tools: [] }
      }
    };
    const prepared3 = await adapter._prepareChatBody(body3);
    assert.ok(Array.isArray(prepared3.tools));
    assert.strictEqual(prepared3.tools.length, 2);
    assert.strictEqual(prepared3.tools[0].type, 'web_search');
    assert.strictEqual(prepared3.tools[1].type, 'x_search');
  });

  await runGenericAdapterTests(t, XAIAdapter, config, mocks);
});
