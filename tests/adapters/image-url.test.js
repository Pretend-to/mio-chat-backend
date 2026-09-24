import { test } from 'node:test';
import assert from 'node:assert';
import './mock-env.js';
import GeminiAdapter from '../../lib/chat/llm/adapters/implementations/gemini.js';
import OpenAIAdapter from '../../lib/chat/llm/adapters/implementations/openai.js';

test('Image URL pre-processing and data wrapping', async (t) => {
  const base64Data = 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const messages = [
    {
      content: [
        { type: 'text', text: 'Analyze this image:' },
        { type: 'image_url', image_url: { url: base64Data } }
      ],
      role: 'user'
    }
  ];

  await t.test('GeminiAdapter: should correctly process base64 image messages without throwing and wrap data', async () => {
    const adapter = new GeminiAdapter({ api_key: 'test', base_url: 'http://localhost' });
    const processed = await adapter._processMessages(messages);
    
    // Check structure after _processMessages
    assert.strictEqual(processed.length, 1);
    const {content} = processed[0];
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
      messages,
      settings: {
        base: { model: 'gemini-2.5-flash', stream: true },
        chatParams: { temperature: 0.7 },
        extraSettings: {
          imageGeneration: { enabled: false }
        },
        toolCallSettings: { mode: 'NONE', tools: [] }
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
    const {content} = processed[0];
    assert.strictEqual(content[1].type, 'image_url');
    assert.strictEqual(content[1].image_url.url, base64Data);
  });

  await t.test('GeminiAdapter: should preserve raw base64 payload for inline data conversion', async () => {
    // 裸 base64 载荷（不含 data: 前缀）。必须是真实长度的合法 base64：
    // resolveImageAsBase64 的 isRawBase64Payload 要求 length > 50 且字符集严格匹配，
    // 过短的假载荷会被判为「无法解析的地址」而丢弃。
    const rawBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const rawMessages = [
      {
        content: [
          { type: 'image_url', image_url: rawBase64 }
        ],
        role: 'user'
      }
    ];
    const adapter = new GeminiAdapter({ api_key: 'test', base_url: 'http://localhost' });
    const processed = await adapter._processMessages(rawMessages);

    // _processMessages 的契约是把 image_url 规范化成 data URI（与 OpenAIAdapter 一致），
    // 而不是把裸载荷原样透传。
    assert.strictEqual(processed[0].content[0].type, 'image_url');
    assert.strictEqual(processed[0].content[0].image_url.url, `data:image/jpeg;base64,${rawBase64}`);

    // 载荷本身必须逐字节存活到 inline_data（不被丢弃、不被改写）
    const { contents } = await adapter.core._preProcessMessage(processed);
    assert.strictEqual(contents[0].parts[0].inline_data.data, rawBase64);
    // 这里**故意不断言** mime_type === 'image/jpeg'：resolveImageAsBase64 对裸 base64
    // 硬编码 image/jpeg（utils/imgTools.js），而本 fixture 实际是 PNG。断言它等于 jpeg
    // 等于把一个已知缺陷固化成契约。只要求它是一个可用的 image/* MIME，
    // 待 imgTools 的 MIME 推断修正后再收紧。
    assert.match(
      contents[0].parts[0].inline_data.mime_type,
      /^image\/[a-z0-9.+-]+$/,
    );
  });
});
