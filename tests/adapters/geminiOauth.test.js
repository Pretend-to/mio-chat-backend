import { test } from 'node:test';
import assert from 'node:assert';
import { MockEvent } from './mock-env.js';
import GeminiOauthAdapter from '../../lib/chat/llm/adapters/implementations/geminiOauth.js';
import { ClientID } from '../../lib/chat/llm/adapters/lib/geminiOauthHelper.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

test('Antigravity OAuth Adapter Flow', async (t) => {
  const originalFetch = globalThis.fetch;
  
  t.beforeEach(() => {
    try {
      const cacheFile = path.join(process.cwd(), 'tmp', 'oauth_token_cache.json');
      if (fs.existsSync(cacheFile)) {
        fs.writeFileSync(cacheFile, '{}', 'utf8');
      }
      const sessionsFile = path.join(process.cwd(), 'tmp', 'oauth_sessions.json');
      if (fs.existsSync(sessionsFile)) {
        fs.writeFileSync(sessionsFile, '{}', 'utf8');
      }
    } catch (e) {}
  });
  
  t.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('metadata validation', () => {
    const meta = GeminiOauthAdapter.getAdapterMetadata();
    assert.strictEqual(meta.type, 'geminiOauth');
    assert.strictEqual(meta.name, 'Antigravity OAuth');
    assert.strictEqual(meta.isShielded, false);
    assert.strictEqual(meta.requiresSpecialAuth, true);
    
    const description = meta.description;
    assert.ok(description.includes('accounts.google.com/o/oauth2/v2/auth'));
    assert.ok(description.includes(ClientID));
    assert.ok(description.includes('http%3A%2F%2Flocalhost%3A8085%2Fcallback'));
  });

  await t.test('url extraction of code and state', () => {
    const adapter = new GeminiOauthAdapter({ api_key: 'ya29.mock' });
    const oauth = adapter.core;

    const res1 = oauth._extractCodeAndState('http://localhost:8085/callback?code=mock_code_123&state=mock_state_456');
    assert.strictEqual(res1.code, 'mock_code_123');
    assert.strictEqual(res1.state, 'mock_state_456');

    const res2 = oauth._extractCodeAndState('mock_raw_code');
    assert.strictEqual(res2.code, 'mock_raw_code');
    assert.strictEqual(res2.state, null);
  });

  await t.test('initialization with new raw code (PKCE exchange, onboard, privacy, config update)', async () => {
    const adapterConfig = {
      api_key: 'http://localhost:8085/callback?code=code123&state=state456',
      base_url: 'https://cloudcode-pa.googleapis.com'
    };
    
    const updates = [];
    const adapter = new GeminiOauthAdapter({
      ...adapterConfig,
      onConfigUpdate: (upd) => {
        updates.push(upd);
      }
    });

    const requests = [];

    globalThis.fetch = async (url, options) => {
      let parsedBody = null;
      if (options.body) {
        try {
          parsedBody = JSON.parse(options.body);
        } catch {
          parsedBody = options.body.toString();
        }
      }
      requests.push({ url, options: { ...options, body: parsedBody } });
      
      if (url.includes('/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'ya29.new_access_token',
            refresh_token: 'refresh_token_123',
            expires_in: 3600
          })
        };
      }
      if (url.includes('/v1internal:loadCodeAssist')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            cloudaicompanionProject: 'project-id-xyz',
            allowedTiers: [{ id: 'free-tier', isDefault: true }],
            currentTier: 'free-tier'
          })
        };
      }
      if (url.includes('/v1internal:setUserSettings')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            userSettings: {}
          })
        };
      }
      if (url.includes('/v1internal:fetchUserInfo')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            userSettings: {} // telemetryEnabled is absent, indicating privacy set
          })
        };
      }
      if (url.includes('/v1internal:fetchAvailableModels')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            models: {
              'gemini-3.1-pro-preview': { displayName: 'Gemini 3.1 Pro (Preview)' }
            }
          })
        };
      }
      return { ok: false, status: 404, text: async () => 'Not Found' };
    };

    // Ensure initialization runs
    await adapter.core._ensureInitialized();

    // Verify token exchange request was made
    const tokenReq = requests.find(r => r.url.includes('/token'));
    assert.ok(tokenReq);
    assert.ok(tokenReq.options.body.includes('code=code123'));
    
    // Verify project ID was loaded
    assert.strictEqual(adapter.core.project_id, 'project-id-xyz');
    assert.strictEqual(adapter.core.tier_id, 'Free');

    // Verify privacy was set and verified
    assert.strictEqual(adapter.core.privacy_mode, 'privacy_set');

    // Verify config updates are collected
    assert.ok(updates.some(u => u.api_key === 'ya29.new_access_token' && u.refresh_token === 'refresh_token_123'));
    assert.ok(updates.some(u => u.project_id === 'project-id-xyz' && u.tier_id === 'Free' && u.privacy_mode === 'privacy_set'));
  });

  await t.test('chat request and payload wrapping with stable session ID', async () => {
    const adapter = new GeminiOauthAdapter({
      api_key: 'ya29.initialized_token',
      project_id: 'project-xyz',
      base_url: 'https://cloudcode-pa.googleapis.com'
    });
    
    // pre-mark initialized to skip exchange
    adapter.core._initialized = true;

    const chatRequests = [];
    globalThis.fetch = async (url, options) => {
      let parsedBody = null;
      if (options.body) {
        try {
          parsedBody = JSON.parse(options.body);
        } catch {
          parsedBody = options.body.toString();
        }
      }
      chatRequests.push({ url, options: { ...options, body: parsedBody } });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          response: {
            candidates: [{ content: { role: 'model', parts: [{ text: 'Hello, I am Antigravity!' }] } }],
            usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 10 }
          }
        })
      };
    };

    const messages = [
      { role: 'user', content: 'hello' }
    ];

    const event = new MockEvent();
    const generator = adapter.core.chat({
      model: 'models/gemini-2.5-pro',
      messages,
      temperature: 0.2
    }, event);

    const results = [];
    for await (const chunk of generator) {
      results.push(chunk);
    }

    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].candidates[0].content.parts[0].text, 'Hello, I am Antigravity!');

    // Check payload details
    const chatReq = chatRequests[0];
    assert.ok(chatReq);
    assert.ok(chatReq.url.includes('/v1internal:generateContent'));
    
    const payload = chatReq.options.body;
    assert.strictEqual(payload.project, 'project-xyz');
    assert.strictEqual(payload.model, 'gemini-2.5-pro');
    assert.strictEqual(payload.userAgent, 'antigravity');
    assert.strictEqual(payload.requestType, 'agent');
    
    // Verify session ID maps to stable hash of 'hello'
    assert.strictEqual(payload.request.sessionId, '-3238736544897475342');
    assert.strictEqual(payload.request.generationConfig.temperature, 0.2);
  });

  await t.test('exchange code fatal error should block subsequent requests', async () => {
    const adapter = new GeminiOauthAdapter({
      api_key: 'http://localhost:8085/callback?code=badcode&state=badstate',
      base_url: 'https://cloudcode-pa.googleapis.com'
    });

    let fetchCount = 0;
    globalThis.fetch = async (url, options) => {
      fetchCount++;
      return {
        ok: false,
        status: 400,
        text: async () => JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Bad authorization code'
        })
      };
    };

    // 第一次尝试 initialization 应该失败
    await assert.rejects(
      async () => {
        await adapter.core._ensureInitialized();
      },
      /OAuth Code Exchange failed/
    );

    assert.strictEqual(fetchCount, 1);
    assert.strictEqual(adapter.core._authFailed, true);

    // 第二次尝试 initialization 应该直接抛出缓存的异常，而不再发起网络 fetch
    await assert.rejects(
      async () => {
        await adapter.core._ensureInitialized();
      },
      /OAuth Code Exchange failed/
    );

    // fetchCount 依然为 1，说明成功短路阻断
    assert.strictEqual(fetchCount, 1);
  });

  await t.test('token refresh fatal error should block subsequent requests', async () => {
    const adapter = new GeminiOauthAdapter({
      api_key: 'ya29.old_token',
      refresh_token: 'refresh_token_xyz',
      expires_at: Date.now() - 10000, // 已过期
      base_url: 'https://cloudcode-pa.googleapis.com'
    });

    let fetchCount = 0;
    globalThis.fetch = async (url, options) => {
      fetchCount++;
      return {
        ok: false,
        status: 400,
        text: async () => JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Token has been expired or revoked'
        })
      };
    };

    // 第一次调用 ensureInitialized 触发刷新，应该失败
    await assert.rejects(
      async () => {
        await adapter.core._ensureInitialized();
      },
      /OAuth Token Refresh failed/
    );

    assert.strictEqual(fetchCount, 1);
    assert.strictEqual(adapter.core._authFailed, true);

    // 第二次调用 ensureInitialized，应该短路阻断，不再发起 fetch
    await assert.rejects(
      async () => {
        await adapter.core._ensureInitialized();
      },
      /OAuth Token Refresh failed/
    );

    assert.strictEqual(fetchCount, 1);
  });

  await t.test('loadModels success and error', async () => {
    const adapter = new GeminiOauthAdapter({
      api_key: 'ya29.mock_token',
      project_id: 'project-123',
      base_url: 'https://cloudcode-pa.googleapis.com'
    });

    adapter.core._initialized = true;

    globalThis.fetch = async (url, options) => {
      if (url.includes('/v1internal:fetchAvailableModels')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            models: {
              'models/gemini-2.5-pro': { displayName: 'Gemini 2.5 Pro' }
            }
          })
        };
      }
      return { ok: false, status: 404 };
    };

    const res = await adapter.loadModels();
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.modelsCount, 12);
    assert.deepStrictEqual(adapter.models, [
      {
        owner: 'Custom',
        models: [
          'gemini-2.5-flash',
          'gemini-2.5-flash-image',
          'gemini-2.5-flash-lite',
          'gemini-2.5-flash-thinking',
          'gemini-2.5-pro',
          'gemini-3-flash',
          'gemini-3-pro-high',
          'gemini-3-pro-low',
          'gemini-3-pro-image',
          'gemini-3.1-pro-high',
          'gemini-3.1-pro-low',
          'gemini-3.1-flash-image'
        ]
      }
    ]);

    // 测试失败情况
    adapter.core.models = async () => {
      throw new Error('Fetch failed');
    };

    const resErr = await adapter.loadModels();
    assert.strictEqual(resErr.success, false);
    assert.strictEqual(resErr.error, 'Fetch failed');
    assert.strictEqual(resErr.modelsCount, 0);
  });

  await t.test('FileTokenCache hit and reuse across instances', async () => {
    const code = 'cache_code_123';
    const state = 'state_abc';
    const apiKey = `http://localhost:8085/callback?code=${code}&state=${state}`;

    let fetchCount = 0;
    globalThis.fetch = async (url, options) => {
      fetchCount++;
      if (url.includes('/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'ya29.cached_access_token',
            refresh_token: 'refresh_token_cached',
            expires_in: 3600
          })
        };
      }
      if (url.includes('/v1internal:loadCodeAssist')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            cloudaicompanionProject: 'project-cached',
            allowedTiers: [{ id: 'free-tier', isDefault: true }],
            currentTier: 'free-tier'
          })
        };
      }
      if (url.includes('/v1internal:setUserSettings')) {
        return { ok: true, status: 200, json: async () => ({ userSettings: {} }) };
      }
      if (url.includes('/v1internal:fetchUserInfo')) {
        return { ok: true, status: 200, json: async () => ({ userSettings: {} }) };
      }
      return { ok: false, status: 404 };
    };

    // 实例 1：首次初始化（模拟测试连接）
    const adapter1 = new GeminiOauthAdapter({
      api_key: apiKey,
      base_url: 'https://cloudcode-pa.googleapis.com'
    });

    await adapter1.core._ensureInitialized();
    assert.strictEqual(fetchCount, 4); // token, loadCodeAssist, setUserSettings, fetchUserInfo
    assert.strictEqual(adapter1.core.project_id, 'project-cached');
    assert.strictEqual(adapter1.core.privacy_mode, 'privacy_set');

    // 实例 2：使用相同的 code 初始化（模拟保存配置时创建正式实例）
    // 此时将 fetch mock 设为抛错，若去网络请求则报错
    globalThis.fetch = async () => {
      throw new Error('Should not make any fetch requests since token is cached!');
    };

    const updates = [];
    const adapter2 = new GeminiOauthAdapter({
      api_key: apiKey,
      base_url: 'https://cloudcode-pa.googleapis.com',
      onConfigUpdate: (upd) => {
        updates.push(upd);
      }
    });

    // 运行 ensureInitialized 应当直接从本地缓存读取成功
    await adapter2.core._ensureInitialized();
    assert.strictEqual(adapter2.core.project_id, 'project-cached');
    assert.strictEqual(adapter2.core.privacy_mode, 'privacy_set');
    assert.strictEqual(adapter2.core.api_key, 'ya29.cached_access_token');
    assert.strictEqual(adapter2.core.refresh_token, 'refresh_token_cached');

    // 验证 onConfigUpdate 被回写触发
    assert.ok(updates.some(u => u.api_key === 'ya29.cached_access_token' && u.refresh_token === 'refresh_token_cached'));
    assert.ok(updates.some(u => u.project_id === 'project-cached' && u.privacy_mode === 'privacy_set'));
  });
});

