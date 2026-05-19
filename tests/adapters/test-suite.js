import assert from 'node:assert';
import { MockEvent, MockFactories } from './mock-env.js';

/**
 * Generic test suite for LLM adapters
 */
export async function runGenericAdapterTests(t, AdapterClass, config, mocks) {
  const adapter = new AdapterClass(config);
  const metadata = AdapterClass.getAdapterMetadata();

  await t.test(`${metadata.name}: should initialize correctly`, () => {
    assert.strictEqual(adapter.provider, metadata.type);
    assert.ok(adapter.config);
  });

  await t.test(`${metadata.name}: should fetch models`, async () => {
    if (mocks.models) {
      const originalGetModels = adapter._getModels;
      adapter._getModels = mocks.models;
      const result = await adapter.loadModels();
      assert.ok(result.success);
      adapter._getModels = originalGetModels;
    }
  });

  const injectMock = (adapter, mockCore) => {
    let coreProperty = null;
    if ('openai' in adapter) coreProperty = 'openai';
    else if ('core' in adapter) coreProperty = 'core';
    else if ('oauthCore' in adapter) coreProperty = 'oauthCore';
    
    if (coreProperty) {
      Object.defineProperty(adapter, coreProperty, {
        get: () => mockCore,
        configurable: true
      });
    }
    return coreProperty;
  };

  const createUnifiedMockCore = (createStream) => {
    // For Gemini: this.core.chat() is a function
    const mockCore = {
      chat: createStream,
      completions: { create: async () => ({ [Symbol.asyncIterator]: createStream }) },
      responses: { create: async () => ({ [Symbol.asyncIterator]: createStream }) },
      models: { list: async () => ({ data: [] }) }
    };
    // For OpenAI: this.openai.chat.completions.create()
    mockCore.chat.completions = mockCore.completions;
    return mockCore;
  };

  await t.test(`${metadata.name}: should handle chat request (streaming)`, async () => {
    const event = new MockEvent();
    const mockCore = mocks.createCore(event);
    injectMock(adapter, mockCore);

    await adapter.handleChatRequest(event);
    
    if (event.errorOccurred) {
      console.error(`[${metadata.name}] Error:`, event.errorOccurred);
    }
    assert.ok(event.isCompleted, `Request should complete. Error: ${event.errorOccurred?.message}`);
    assert.ok(event.updates.length > 0, 'Should have received updates');
  });

  await t.test(`${metadata.name}: should handle request interruption (abort)`, async () => {
    const event = new MockEvent();
    
    const createStream = async function* () {
      yield { choices: [{ delta: { content: 'Thinking...' } }], type: 'response.output_text.delta', delta: 'Thinking...' };
      await new Promise(r => setTimeout(r, 100));
      if (event.aborted) return;
      yield { choices: [{ delta: { content: 'Done.' } }], type: 'response.output_text.delta', delta: 'Done.' };
    };

    const mockCore = createUnifiedMockCore(createStream);
    injectMock(adapter, mockCore);

    const requestPromise = adapter.handleChatRequest(event);
    // Wait a bit to ensure it started
    await new Promise(r => setTimeout(r, 10));
    event.abort();
    await requestPromise;

    assert.ok(event.aborted, 'Event should be aborted');
  });

  await t.test(`${metadata.name}: should handle toolcall loops`, async () => {
    const event = new MockEvent({
      settings: {
        base: { model: 'gpt-4o', stream: true },
        chatParams: { temperature: 0.7 },
        toolCallSettings: { mode: 'AUTO', tools: ['get_weather'] },
        extraSettings: {}
      }
    });

    let callCount = 0;
    const createStream = async function* () {
      callCount++;
      if (callCount === 1) {
        // Return tool call in multiple formats to satisfy all adapters
        yield {
          choices: [{
            delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'get_weather', arguments: '{"location":"London"}' } }] }
          }],
          candidates: [{ content: { parts: [{ functionCall: { name: 'get_weather', args: { location: 'London' } } }] } }],
          type: 'response.output_item.added',
          item: { id: 'call_1', type: 'function_call', name: 'get_weather' }
        };
        // For Responses API, we need a "done" chunk
        yield { type: 'response.function_call_arguments.done', item_id: 'call_1', arguments: '{"location":"London"}' };
      } else {
        yield {
          choices: [{ delta: { content: 'Sunny' } }],
          candidates: [{ content: { parts: [{ text: 'Sunny' }] } }],
          type: 'response.output_text.delta',
          delta: 'Sunny'
        };
      }
    };

    const mockCore = createUnifiedMockCore(createStream);
    injectMock(adapter, mockCore);

    await adapter.handleChatRequest(event);

    assert.strictEqual(callCount, 2, 'Should call core twice');
    assert.ok(event.updates.some(u => u.type === 'toolCall'), 'Should have toolCall update');
  });
}
