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
            { name: 'models/gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemma-2b', displayName: 'Gemma 2B', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/computer-model', displayName: 'Computer Model', supportedGenerationMethods: ['generateContent'] }
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
        settings: {},
        stream: true
      },
      update(up) {
        updates.push(up);
      },
      onAbort() {},
      client: {
        popEvent() {},
        popConnection() {},
        pushConnection() {}
      }
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      const fullLine1 = 'data: {"candidates":[{"content":{"parts":[{"text":"Thinking hard...", "thought": true}]}}]}\n';
      const fullLine2 = 'data: {"candidates":[{"content":{"parts":[{"text":"Final answer"}]}}]}\n';
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

  await t.test('_executeChatRequest handles parallel tool calls and thought signatures correctly without cross-contamination', async () => {
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
        settings: {},
        stream: true
      },
      update(up) {
        updates.push(up);
      },
      onAbort() {},
      client: {
        popEvent() {},
        popConnection() {},
        pushConnection() {}
      }
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      // 模拟包含并行工具调用及其各自签名的流式返回
      const chunk1 = 'data: {"candidates":[{"content":{"parts":[' +
        '{"functionCall":{"name":"toolA","args":{}}},' +
        '{"functionCall":{"name":"toolB","args":{}}}' +
        ']}}]}\n';
      const chunk2 = 'data: {"candidates":[{"content":{"parts":[' +
        '{"thoughtSignature":"sigA"},' +
        '{"thoughtSignature":"sigB"}' +
        ']}}]}\n';
      
      const encoder = new TextEncoder();
      const chunks = [encoder.encode(chunk1), encoder.encode(chunk2)];
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
      const result = await adapter._executeChatRequest(mockEvent.body, mockEvent);
      
      // 校验结果中的 tool calls 及其 signature ID 是否正确独立地绑定，没有发生 sigB 覆盖 sigA 的现象
      assert.ok(result);
      assert.ok(Array.isArray(result.toolCalls));
      assert.strictEqual(result.toolCalls.length, 2);
      
      assert.strictEqual(result.toolCalls[0].function.name, 'toolA');
      assert.strictEqual(result.toolCalls[0].id, 'gemini://sigA|'); // 应该保留 sigA，而不是被 sigB 覆盖
      
      assert.strictEqual(result.toolCalls[1].function.name, 'toolB');
      assert.strictEqual(result.toolCalls[1].id, 'gemini://sigB|');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('_preProcessMessage correctly translates tool calls and tool responses with thought signatures', async () => {
    const { Gemini } = await import('../../lib/chat/llm/adapters/lib/geminiHttpClient.js');
    const gemini = new Gemini({ base_url: 'https://mock', api_key: 'key' });

    // A real thought signature is a long base64 string (> 50 chars)
    const realSigA = Buffer.from('this is a very long string that will definitely exceed fifty characters when base64 encoded and decoded').toString('base64');
    const realSigB = Buffer.from('another extremely long string to serve as the second valid thought signature in our parallel calls').toString('base64');
    // A fake/random signature is short or not valid base64
    const fakeSig = 'shortFakeSignature';

    const messages = [
      {
        role: 'assistant',
        content: 'I will run some commands.',
        tool_calls: [
          {
            id: realSigA,
            function: { name: 'toolA', arguments: '{"cmd":"echo 1"}' }
          },
          {
            id: fakeSig,
            function: { name: 'toolB', arguments: '{"cmd":"echo 2"}' }
          }
        ]
      },
      {
        role: 'tool',
        name: 'toolA',
        content: 'resultA',
        tool_call_id: realSigA
      },
      {
        role: 'tool',
        name: 'toolB',
        content: 'resultB',
        tool_call_id: fakeSig
      }
    ];

    const { contents } = await gemini._preProcessMessage(messages);

    assert.strictEqual(contents.length, 2);

    // First content: assistant message containing text and tool calls
    const assistantContent = contents[0];
    assert.strictEqual(assistantContent.role, 'model');
    assert.strictEqual(assistantContent.parts.length, 3); // text part + toolA + toolB
    assert.deepStrictEqual(assistantContent.parts[0], { text: 'I will run some commands.' });
    
    // toolA has a valid thoughtSignature
    assert.deepStrictEqual(assistantContent.parts[1], {
      functionCall: { name: 'toolA', args: { cmd: 'echo 1' } },
      thoughtSignature: realSigA
    });

    // toolB has a fake thought signature (too short), so thoughtSignature is omitted
    assert.deepStrictEqual(assistantContent.parts[2], {
      functionCall: { name: 'toolB', args: { cmd: 'echo 2' } }
    });

    // Second content: tool responses
    const toolResponsesContent = contents[1];
    assert.strictEqual(toolResponsesContent.role, 'user');
    assert.strictEqual(toolResponsesContent.parts.length, 2);

    // toolA response has no id (since thoughtSignature is not sent as functionResponse.id)
    assert.deepStrictEqual(toolResponsesContent.parts[0], {
      functionResponse: {
        name: 'toolA',
        response: { name: 'toolA', content: 'resultA' }
      }
    });

    // toolB response has fake/short id, so id is omitted
    assert.deepStrictEqual(toolResponsesContent.parts[1], {
      functionResponse: {
        name: 'toolB',
        response: { name: 'toolB', content: 'resultB' }
      }
    });
  });

  await t.test('_preProcessMessage correctly translates tool calls and tool responses with new gemini:// ID format', async () => {
    const { Gemini } = await import('../../lib/chat/llm/adapters/lib/geminiHttpClient.js');
    const gemini = new Gemini({ base_url: 'https://mock', api_key: 'key' });

    const thoughtSig = 'someReasoningStateSig';
    const fcId = 'call_abc123';
    const combinedId = `gemini://${thoughtSig}|${fcId}`;

    const messages = [
      {
        role: 'assistant',
        content: 'Running tool',
        tool_calls: [
          {
            id: combinedId,
            function: { name: 'myTool', arguments: '{}' }
          }
        ]
      },
      {
        role: 'tool',
        name: 'myTool',
        content: 'ok',
        tool_call_id: combinedId
      }
    ];

    const { contents } = await gemini._preProcessMessage(messages);

    assert.strictEqual(contents.length, 2);

    // Assistant turn
    const assistantContent = contents[0];
    assert.deepStrictEqual(assistantContent.parts[1], {
      functionCall: { name: 'myTool', args: {}, id: fcId },
      thoughtSignature: thoughtSig
    });

    // Tool turn
    const toolResponsesContent = contents[1];
    assert.deepStrictEqual(toolResponsesContent.parts[0], {
      functionResponse: {
        name: 'myTool',
        response: { name: 'myTool', content: 'ok' },
        id: fcId
      }
    });
  });

  await runGenericAdapterTests(t, GeminiAdapter, config, mocks);
});
