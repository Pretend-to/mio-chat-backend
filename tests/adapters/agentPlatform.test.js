import { test } from 'node:test'
import assert from 'node:assert'
import './mock-env.js'
import { runGenericAdapterTests } from './test-suite.js'
import AgentPlatformAdapter from '../../lib/chat/llm/adapters/implementations/agentPlatform.js'

test('Agent Platform Adapter - standard tests', async (t) => {
  const config = {
    api_key: 'vertex-mock-key',
    base_url: 'https://aiplatform.googleapis.com',
    project_id: 'mock-project',
  }

  const mocks = {
    createCore: (_event) => ({
      chat: async function* () {
        yield { candidates: [{ content: { parts: [{ text: 'Hello from Vertex AI' }] } }] }
      },
    }),
    models: async () => [{ owner: 'Vertex', models: ['gemini-2.5-flash'] }],
  }

  await runGenericAdapterTests(t, AgentPlatformAdapter, config, mocks)
})

test('Agent Platform - block_express behavior', async (t) => {
  await t.test('with block_express: false (default)', async () => {
    const adapter = new AgentPlatformAdapter({
      api_key: 'test-api-key',
      base_url: 'https://us-central1-aiplatform.googleapis.com',
      block_express: false,
      project_id: 'test-project',
    })

    const {core} = adapter
    assert.strictEqual(core.block_express, false)

    // Check URL generation
    const url = core._getRequestUrl('gemini-1.5-pro', true)
    assert.ok(url.includes('key=test-api-key'), 'Should append api_key to URL')

    // Check headers（_getAuthHeaders 现在为 async，需 await）
    const headers = await core._getAuthHeaders()
    assert.deepStrictEqual(headers, {}, 'Should have empty headers in express mode')
  })

  await t.test('with block_express: true — GoogleAuth 失败时应该抛出错误', async () => {
    const adapter = new AgentPlatformAdapter({
      base_url: 'https://us-central1-aiplatform.googleapis.com',
      block_express: true,
      project_id: 'test-project',
    })

    const {core} = adapter
    assert.strictEqual(core.block_express, true)

    // Do not depend on whether the developer/CI host happens to have ADC configured.
    core._googleAuth = {
      async getClient() {
        throw new Error('mock ADC unavailable')
      },
    }

    // URL 中不应有 key=
    const url = core._getRequestUrl('gemini-1.5-pro', true)
    assert.ok(!url.includes('key='), 'Should NOT append api_key to URL in non-express mode')

    // _getAuthHeaders 应将底层认证失败包装为可操作的 ADC 错误
    await assert.rejects(
      () => core._getAuthHeaders(),
      { message: /Vertex AI ADC 认证失败/ },
      'Should throw ADC error when no credentials configured'
    )
  })

  await t.test('models() should try Vertex AI publisher models list and parse correctly', async () => {
    const adapter = new AgentPlatformAdapter({
      base_url: 'https://us-central1-aiplatform.googleapis.com',
      block_express: true,
      project_id: 'test-project',
    })

    const {core} = adapter

    // Mock _getAuthHeaders 以绕过 GoogleAuth
    core._getAuthHeaders = async () => ({ 'Authorization': 'Bearer test-token' })

    // Mock global fetch to return Vertex publisher models response
    const originalFetch = global.fetch
    let fetchedUrl = null
    let fetchedHeaders = null

    global.fetch = async (url, options) => {
      fetchedUrl = url
      fetchedHeaders = options?.headers
      return {
        json: async () => ({
          publisherModels: [
            { name: 'publishers/google/models/gemini-1.5-pro', supportedActions: ['predict'] },
            { name: 'publishers/google/models/gemini-1.5-flash', supportedActions: ['predict'] },
            { name: 'publishers/google/models/unrelated-model', supportedActions: ['predict'] },
          ],
        }),
        ok: true,
      }
    }

    try {
      const models = await core.models()
      assert.strictEqual(
        fetchedUrl,
        'https://us-central1-aiplatform.googleapis.com/v1beta1/projects/test-project/locations/us-central1/publishers/google/models',
      )
      assert.strictEqual(fetchedHeaders['Authorization'], 'Bearer test-token')

      // Filtered models should only have gemini-1.5-pro and gemini-1.5-flash
      assert.strictEqual(models.length, 2)
      assert.ok(models.some((m) => m.id === 'gemini-1.5-pro'))
      assert.ok(models.some((m) => m.id === 'gemini-1.5-flash'))
      assert.ok(!models.some((m) => m.id === 'unrelated-model'))
    } finally {
      global.fetch = originalFetch
    }
  })

  await t.test('models() should fallback to generative language API if Vertex fails', async () => {
    const adapter = new AgentPlatformAdapter({
      api_key: 'test-api-key',
      base_url: 'https://us-central1-aiplatform.googleapis.com',
      block_express: false,
      project_id: 'test-project',
    })

    const {core} = adapter

    const originalFetch = global.fetch
    const fetchedUrls = []

    global.fetch = async (url, _options) => {
      fetchedUrls.push(url)
      if (url.includes('aiplatform.googleapis.com')) {
        return { ok: false, status: 403, text: async () => 'Forbidden' }
      }
      return {
        json: async () => ({
          models: [
            { name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
        ok: true,
      }
    }

    try {
      const models = await core.models()
      assert.strictEqual(fetchedUrls.length, 2)
      assert.ok(fetchedUrls[0].includes('aiplatform.googleapis.com'))
      assert.ok(fetchedUrls[1].includes('generativelanguage.googleapis.com'))

      assert.strictEqual(models.length, 1)
      assert.strictEqual(models[0].id, 'gemini-2.0-flash')
    } finally {
      global.fetch = originalFetch
    }
  })

  await t.test('_prepareChatBody enables internal tools from flat extraSettings.internalTools', async () => {
    const adapter = new AgentPlatformAdapter({
      api_key: 'test-api-key',
      base_url: 'https://us-central1-aiplatform.googleapis.com',
      project_id: 'test-project',
    })

    const body = {
      messages: [{ content: 'BTC price', role: 'user' }],
      settings: {
        base: { model: 'gemini-2.5-flash', stream: true },
        chatParams: {},
        extraSettings: {
          internalTools: { google_search: true }
        },
        toolCallSettings: { mode: 'AUTO', tools: [] }
      }
    }

    const prepared = await adapter._prepareChatBody(body)
    assert.ok(Array.isArray(prepared.tools), 'Should output tools array')
    assert.deepStrictEqual(prepared.tools, [{ googleSearch: {} }], 'Should enable googleSearch tool from flat extraSettings.internalTools')
  })

  await t.test('supports custom proxy baseUrl and normalizes trailing slashes', async () => {
    const adapter = new AgentPlatformAdapter({
      api_key: 'test-proxy-key',
      base_url: 'https://my-custom-vertex-proxy.example.com/api///',
      block_express: false,
      project_id: 'proxy-project',
    })

    const { core } = adapter
    assert.strictEqual(core.transportStrategy.baseUrl, 'https://my-custom-vertex-proxy.example.com/api')
    const url = core._getRequestUrl('gemini-2.5-pro', true)
    assert.ok(
      url.startsWith('https://my-custom-vertex-proxy.example.com/api/v1/projects/proxy-project/'),
      `URL should use custom proxy baseUrl without duplicate slashes, got: ${url}`
    )
  })

  await t.test('uses models_api_key and models_base_url when configured', async () => {
    const adapter = new AgentPlatformAdapter({
      api_key: 'vertex-key',
      base_url: 'https://aiplatform.googleapis.com',
      block_express: true,
      models_api_key: 'custom-studio-key',
      models_base_url: 'https://studio-proxy.example.com:8443',
      project_id: 'test-project',
    })

    const originalFetch = global.fetch
    let fetchedUrl = null
    global.fetch = async (url) => {
      fetchedUrl = url
      return {
        ok: true,
        json: async () => ({
          models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }],
        }),
      }
    }

    try {
      const models = await adapter._getModels()
      assert.ok(fetchedUrl.startsWith('https://studio-proxy.example.com:8443'), `Should fetch from models_base_url, got: ${fetchedUrl}`)
      assert.ok(fetchedUrl.includes('key=custom-studio-key'), `Should use models_api_key, got: ${fetchedUrl}`)
      assert.ok(models.some((g) => g.models.includes('gemini-2.5-flash')), 'Grouped models should contain gemini-2.5-flash')
    } finally {
      global.fetch = originalFetch
    }
  })
})
