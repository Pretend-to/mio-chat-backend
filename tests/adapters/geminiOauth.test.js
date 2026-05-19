import { test } from 'node:test';
import assert from 'node:assert';
import { MockEvent } from './mock-env.js';
import GeminiOauthAdapter from '../../lib/chat/llm/adapters/geminiOauth.js';

test('Gemini OAuth Adapter (Shielded)', async (t) => {
  const config = {
    api_key: 'mock-oauth-code',
    base_url: 'https://cloudcode-pa.googleapis.com/v1internal'
  };

  const adapter = new GeminiOauthAdapter(config);

  await t.test('should be shielded by default', () => {
    assert.strictEqual(adapter.shieldConfig.enabled, true);
    assert.ok(adapter.shieldConfig.message.includes('停用'));
  });

  await t.test('should block chat request with shield message', async () => {
    const event = new MockEvent();
    await adapter.handleChatRequest(event);
    
    assert.ok(event.updates.some(u => u.type === 'content' && u.content.includes('暂时停用')));
    assert.ok(event.isCompleted);
  });

  await t.test('should return empty models when shielded', async () => {
    const result = await adapter.loadModels();
    assert.strictEqual(result.isShielded, true);
    assert.strictEqual(result.modelsCount, 0);
  });
});
