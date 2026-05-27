import { test } from 'node:test';
import assert from 'node:assert';
import './mock-env.js';
import { runGenericAdapterTests } from './test-suite.js';
import AnthropicAdapter from '../../lib/chat/llm/adapters/implementations/anthropic.js';
import { MockEvent } from './mock-env.js';

test('Anthropic Adapter - Basic Integration & Metadata', async (t) => {
  const metadata = AnthropicAdapter.getAdapterMetadata();
  assert.strictEqual(metadata.type, 'anthropic');
  assert.ok(metadata.supportedFeatures.includes('chat'));
  assert.ok(metadata.supportedFeatures.includes('streaming'));
  assert.ok(metadata.supportedFeatures.includes('function_calling'));
  assert.ok(metadata.supportedFeatures.includes('vision'));
  assert.ok(metadata.extraSettingsSchema?.anthropic?.web_search, 'web_search should be in extraSettingsSchema');

  const adapter = new AnthropicAdapter({
    api_key: 'sk-mock-key',
    base_url: 'https://api.anthropic.com'
  });
  assert.strictEqual(adapter.provider, 'anthropic');
});

test('Anthropic Adapter - Message Conversions & Caching', async (t) => {
  const adapter = new AnthropicAdapter({
    api_key: 'sk-mock-key',
    base_url: 'https://api.anthropic.com'
  });

  // Test 1: Simple message preparation
  const body = {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ],
    settings: {
      base: { model: 'claude-3-5-sonnet-latest', stream: true },
      chatParams: { temperature: 0.7 },
      toolCallSettings: { mode: 'NONE', tools: [] },
      extraSettings: {}
    }
  };

  const prepared = await adapter._prepareChatBody(body);
  assert.strictEqual(prepared.model, 'claude-3-5-sonnet-latest');
  assert.strictEqual(prepared.system[0].text, 'You are a helpful assistant.');
  // System caching check by default
  assert.ok(prepared.system[0].cache_control);
  assert.strictEqual(prepared.messages.length, 1);
  assert.strictEqual(prepared.messages[0].role, 'user');
  assert.strictEqual(prepared.messages[0].content[0].text, 'Hello!');

  // Test 2: Message collapsing for consecutive user/tool roles and tool use conversions
  const advancedBody = {
    messages: [
      { role: 'user', content: 'Calculate weather' },
      {
        role: 'assistant',
        content: 'Sure, calling tool.',
        tool_calls: [{
          id: 'call_123',
          type: 'function',
          function: { name: 'get_weather', arguments: '{"location":"Beijing"}' }
        }]
      },
      { role: 'tool', tool_call_id: 'call_123', name: 'get_weather', content: '{"temp":25}' }
    ],
    settings: {
      base: { model: 'claude-4.7-opus', stream: true },
      chatParams: { temperature: 0.7, reasoning_effort: 2 },
      toolCallSettings: { mode: 'AUTO', tools: ['get_weather'] },
      extraSettings: {}
    }
  };

  const preparedAdvanced = await adapter._prepareChatBody(advancedBody);
  // Alternative role count should be 3: user -> assistant -> user (collapsing consecutive tool responses)
  assert.strictEqual(preparedAdvanced.messages.length, 3);
  assert.strictEqual(preparedAdvanced.messages[0].role, 'user');
  assert.strictEqual(preparedAdvanced.messages[1].role, 'assistant');
  // Confirm tool_use translation
  const assistantBlocks = preparedAdvanced.messages[1].content;
  assert.strictEqual(assistantBlocks[0].type, 'text');
  assert.strictEqual(assistantBlocks[1].type, 'tool_use');
  assert.strictEqual(assistantBlocks[1].id, 'call_123');
  assert.strictEqual(assistantBlocks[1].name, 'get_weather');

  // Confirm tool_result translation in third message
  assert.strictEqual(preparedAdvanced.messages[2].role, 'user');
  const toolResultBlock = preparedAdvanced.messages[2].content[0];
  assert.strictEqual(toolResultBlock.type, 'tool_result');
  assert.strictEqual(toolResultBlock.tool_use_id, 'call_123');
  assert.strictEqual(toolResultBlock.content, '{"temp":25}');

  // Test 3: Thinking modes
  // Path A: Claude 4.7 Adaptive Thinking
  assert.strictEqual(preparedAdvanced.thinking.type, 'adaptive');
  assert.strictEqual(preparedAdvanced.output_config.effort, 'medium');
  assert.strictEqual(preparedAdvanced.temperature, undefined); // Cleans up temperature

  // Path B: Claude 3.7 Legacy budget-based thinking
  const legacyBody = {
    messages: [{ role: 'user', content: 'Hi' }],
    settings: {
      base: { model: 'claude-3-7-sonnet', stream: true },
      chatParams: { temperature: 0.7, reasoning_effort: 3 },
      toolCallSettings: { mode: 'NONE', tools: [] },
      extraSettings: {}
    }
  };
  const preparedLegacy = await adapter._prepareChatBody(legacyBody);
  assert.strictEqual(preparedLegacy.thinking.type, 'enabled');
  assert.strictEqual(preparedLegacy.thinking.budget_tokens, 4096);
  assert.strictEqual(preparedLegacy.temperature, 1.0); // Required parameter override
});

test('Anthropic Adapter - Generic Suite Validation', async (t) => {
  const config = {
    api_key: 'sk-mock-key',
    base_url: 'https://api.anthropic.com'
  };

  const mocks = {
    models: async () => [{ owner: 'Anthropic', models: ['claude-3-5-sonnet-latest'] }],
    createCore: (event) => {
      // Mock global fetch to return SSE streaming outputs
      const mockStreamData = [
        'event: message_start\ndata: {"type": "message_start", "message": {"usage": {"input_tokens": 10}}}\n\n',
        'event: content_block_start\ndata: {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}}\n\n',
        'event: content_block_delta\ndata: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Hello "}}\n\n',
        'event: content_block_delta\ndata: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "world!"}}\n\n',
        'event: content_block_stop\ndata: {"type": "content_block_stop", "index": 0}\n\n',
        'event: message_delta\ndata: {"type": "message_delta", "delta": {}, "usage": {"output_tokens": 5}}\n\n',
        'event: message_stop\ndata: {"type": "message_stop"}\n\n'
      ].join('');

      const textEncoder = new TextEncoder();
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(textEncoder.encode(mockStreamData));
          controller.close();
        }
      });

      // Override global fetch specifically for tests
      const originalFetch = global.fetch;
      global.fetch = async (url, options) => {
        if (url.includes('/messages')) {
          return {
            ok: true,
            body: readableStream,
            headers: new Headers()
          };
        } else if (url.includes('/models')) {
          return {
            ok: true,
            json: async () => ({ data: [{ id: 'claude-3-5-sonnet-latest' }] })
          };
        }
        return originalFetch(url, options);
      };

      // Return a dummy object for injectMock to attach to
      return {};
    }
  };

  await runGenericAdapterTests(t, AnthropicAdapter, config, mocks);
});

test('Anthropic Adapter - Compatibility Mode', async (t) => {
  const adapter = new AnthropicAdapter({
    api_key: 'sk-mock-key',
    base_url: 'https://api.deepseek.com/anthropic',
    compat_mode: true
  });

  const originalFetch = global.fetch;
  let requestedUrl = '';
  global.fetch = async (url, options) => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => ({ data: [] })
    };
  };

  try {
    await adapter._getModels();
    assert.strictEqual(requestedUrl, 'https://api.deepseek.com/v1/models');
  } finally {
    global.fetch = originalFetch;
  }
});
