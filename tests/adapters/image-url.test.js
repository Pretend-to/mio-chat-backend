import { test } from 'node:test';
import assert from 'node:assert';
import './mock-env.js';
import GeminiAdapter from '../../lib/chat/llm/adapters/implementations/gemini.js';
import OpenAIAdapter from '../../lib/chat/llm/adapters/implementations/openai.js';

test('Image URL pre-processing and data wrapping', async (t) => {
  const base64Data = 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze this image:' },
        { type: 'image_url', image_url: { url: base64Data } }
      ]
    }
  ];

  await t.test('GeminiAdapter: should correctly process base64 image messages without throwing and wrap data', async () => {
    const adapter = new GeminiAdapter({ api_key: 'test', base_url: 'http://localhost' });
    const processed = await adapter._processMessages(messages);
    
    // Check structure after _processMessages
    assert.strictEqual(processed.length, 1);
    const content = processed[0].content;
    assert.strictEqual(content[1].type, 'image_url');
    assert.strictEqual(content[1].image_url.url, base64Data);

    // Check pre-processing for API payload (done by the core Gemini client)
    const { contents } = await adapter.core._preProcessMessage(processed);
    assert.strictEqual(contents.length, 1);
    assert.strictEqual(contents[0].parts[1].inline_data.data, base64Data.split(',')[1]);
    assert.strictEqual(contents[0].parts[1].inline_data.mime_type, 'image/jpeg');
  });

  await t.test('GeminiAdapter: should handle imageGeneration object/boolean correctly and not set responseModalities when disabled', async () => {
    const adapter = new GeminiAdapter({ api_key: 'test', base_url: 'http://localhost' });
    const body = {
      messages: messages,
      settings: {
        base: { model: 'gemini-2.5-flash', stream: true },
        chatParams: { temperature: 0.7 },
        toolCallSettings: { mode: 'NONE', tools: [] },
        extraSettings: {
          gemini: {
            imageGeneration: { enabled: false }
          }
        }
      }
    };
    const prepared = await adapter._prepareChatBody(body);
    assert.strictEqual(prepared.responseModalities, undefined);
  });

  await t.test('OpenAIAdapter: should correctly process base64 image messages and wrap data', async () => {
    const adapter = new OpenAIAdapter({ api_key: 'test', base_url: 'http://localhost' });
    const processed = await adapter._processMessages(messages);

    // Check structure after _processMessages
    assert.strictEqual(processed.length, 1);
    const content = processed[0].content;
    assert.strictEqual(content[1].type, 'image_url');
    assert.strictEqual(content[1].image_url.url, base64Data);
  });
});
