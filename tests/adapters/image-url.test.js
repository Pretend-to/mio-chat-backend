import { test } from 'node:test';
import assert from 'node:assert';
import './mock-env.js';
import GeminiAdapter from '../../lib/chat/llm/adapters/implementations/gemini.js';
import OpenAIAdapter from '../../lib/chat/llm/adapters/implementations/openai.js';
import { resolveImageAsBase64 } from '../../utils/imgTools.js';

// 真实图片载荷（PIL 生成的 4x4 PNG / baseline JPEG / lossless WebP）的裸 base64。
// 用真文件而不是手搓几个字节：MIME 只能从载荷本身推断，假载荷证不了这件事。
const RAW_PAYLOADS = {
  png: 'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAE0lEQVR4nGPkUbJggAEmOAsvBwAUxABu6v+piAAAAABJRU5ErkJggg==',
  jpeg: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAEAAQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDmKKKK2Mj/2Q==',
  webp: 'UklGRh4AAABXRUJQVlA4TBEAAAAvA8AAAAdQkTIUp/+BiOh/AAA=',
};

// 合法 base64 字符集、长度 > 50，因此必然落到 resolveImageAsBase64 的「裸 base64」分支；
// 但解出来的字节不是任何已知图片格式。
const RAW_NON_IMAGE_PAYLOAD = Buffer.from(
  '这不是图片，只是一段足够长的普通文本载荷，用于验证未知类型不会被硬编码成 jpeg。',
).toString('base64');

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
    // 该 fixture 的签名是 89504e47（PNG），所以 data URI 必须声明 image/png。
    assert.strictEqual(processed[0].content[0].image_url.url, `data:image/png;base64,${rawBase64}`);

    // 载荷本身必须逐字节存活到 inline_data（不被丢弃、不被改写）
    const { contents } = await adapter.core._preProcessMessage(processed);
    assert.strictEqual(contents[0].parts[0].inline_data.data, rawBase64);
    // S-1 修正后收紧：MIME 必须等于载荷的真实类型，而不是旧实现硬编码的 image/jpeg。
    assert.strictEqual(contents[0].parts[0].inline_data.mime_type, 'image/png');
  });
});

test('resolveImageAsBase64: 裸 base64 的 MIME 从载荷字节推断（S-1）', async (t) => {
  await t.test('PNG 载荷 → image/png', async () => {
    assert.strictEqual(
      await resolveImageAsBase64(RAW_PAYLOADS.png),
      `data:image/png;base64,${RAW_PAYLOADS.png}`,
    );
  });

  await t.test('JPEG 载荷 → image/jpeg', async () => {
    assert.strictEqual(
      await resolveImageAsBase64(RAW_PAYLOADS.jpeg),
      `data:image/jpeg;base64,${RAW_PAYLOADS.jpeg}`,
    );
  });

  await t.test('WebP 载荷 → image/webp', async () => {
    assert.strictEqual(
      await resolveImageAsBase64(RAW_PAYLOADS.webp),
      `data:image/webp;base64,${RAW_PAYLOADS.webp}`,
    );
  });

  await t.test('识别不出的载荷 → 不猜、不贴假 MIME，丢弃（null）', async () => {
    // 前提校验：它满足「裸 base64」分支的入口条件（长度 > 50 且字符集合法），
    // 所以这个 null 只可能来自 MIME 推断失败，而不是「无法解析的地址」那条分支。
    assert.ok(RAW_NON_IMAGE_PAYLOAD.length > 50);
    assert.match(RAW_NON_IMAGE_PAYLOAD, /^[A-Za-z0-9+/]+={0,2}$/);

    assert.strictEqual(await resolveImageAsBase64(RAW_NON_IMAGE_PAYLOAD), null);
  });

  await t.test('其他分支不受影响：data URI 原样透传、blob 仍是 null', async () => {
    const dataUri = `data:image/png;base64,${RAW_PAYLOADS.png}`;
    assert.strictEqual(await resolveImageAsBase64(dataUri), dataUri);
    assert.strictEqual(
      await resolveImageAsBase64(`blob:https://example.com/${'a'.repeat(60)}`),
      null,
    );
  });

  await t.test('GeminiAdapter: inline_data.mime_type 跟随载荷真实类型', async () => {
    const adapter = new GeminiAdapter({ api_key: 'test', base_url: 'http://localhost' });

    for (const [key, expectedMime] of [
      ['png', 'image/png'],
      ['jpeg', 'image/jpeg'],
      ['webp', 'image/webp'],
    ]) {
      const messages = [
        { content: [{ type: 'image_url', image_url: RAW_PAYLOADS[key] }], role: 'user' },
      ];
      const processed = await adapter._processMessages(messages);
      const { contents } = await adapter.core._preProcessMessage(processed);

      assert.strictEqual(contents[0].parts[0].inline_data.data, RAW_PAYLOADS[key]);
      assert.strictEqual(contents[0].parts[0].inline_data.mime_type, expectedMime);
    }
  });

  await t.test('GeminiAdapter: 识别不出的载荷不产生任何 image part（不会被贴成 jpeg）', async () => {
    const adapter = new GeminiAdapter({ api_key: 'test', base_url: 'http://localhost' });
    const processed = await adapter._processMessages([
      { content: [{ type: 'image_url', image_url: RAW_NON_IMAGE_PAYLOAD }], role: 'user' },
    ]);

    assert.deepStrictEqual(processed[0].content, []);
  });
});
