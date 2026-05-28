import { test } from 'node:test';
import assert from 'node:assert';
import './mock-env.js';
import { runGenericAdapterTests } from './test-suite.js';
import XiaomiMiMoAdapter from '../../lib/chat/llm/adapters/implementations/xiaomimimo.js';

test('Xiaomi MiMo Adapter', async (t) => {
  const config = {
    api_key: 'sk-mimo-mock-key',
    base_url: 'https://api.xiaomimimo.com/v1'
  };

  const mocks = {
    models: async () => [{ owner: 'Xiaomi', models: ['mimo-v2.5-pro'] }],
    createCore: (_event) => {
      const createStream = async function* () {
        yield { choices: [{ delta: { reasoning_content: 'Thinking on MiMo...' } }] };
        yield { choices: [{ delta: { content: 'Hello from Xiaomi MiMo' } }] };
        yield { usage: { prompt_tokens: 12, completion_tokens: 6, total_tokens: 18 } };
      };
      const mock = {
        chat: { completions: { create: async () => ({ [Symbol.asyncIterator]: createStream }) } },
        models: { list: async () => ({ data: [] }) }
      };
      return mock;
    }
  };

  // Run the generic adapter test suite
  await runGenericAdapterTests(t, XiaomiMiMoAdapter, config, mocks);

  // Test custom _prepareChatBody logic for reasoning_effort mapping
  await t.test('MiMo: should prepare chat body with thinking disabled when reasoning_effort is 0', async () => {
    const adapter = new XiaomiMiMoAdapter(config);
    const body = {
      model: 'mimo-v2.5-pro',
      messages: [{ role: 'user', content: 'test' }],
      settings: {
        base: {
          model: 'mimo-v2.5-pro',
          stream: true
        },
        chatParams: {
          reasoning_effort: 0
        },
        toolCallSettings: {
          mode: 'NONE',
          tools: []
        }
      }
    };
    
    const prepared = await adapter._prepareChatBody(body);
    assert.deepStrictEqual(prepared.extra_body, {
      thinking: {
        type: 'disabled'
      }
    });
    assert.strictEqual(prepared.reasoning_effort, undefined);
  });

  await t.test('MiMo: should prepare chat body with thinking enabled when reasoning_effort is not 0', async () => {
    const adapter = new XiaomiMiMoAdapter(config);
    const body = {
      model: 'mimo-v2.5-pro',
      messages: [{ role: 'user', content: 'test' }],
      settings: {
        base: {
          model: 'mimo-v2.5-pro',
          stream: true
        },
        chatParams: {
          reasoning_effort: 'high'
        },
        toolCallSettings: {
          mode: 'NONE',
          tools: []
        }
      }
    };
    
    const prepared = await adapter._prepareChatBody(body);
    assert.deepStrictEqual(prepared.extra_body, {
      thinking: {
        type: 'enabled'
      }
    });
    assert.strictEqual(prepared.reasoning_effort, undefined);
  });
});
