import { test } from 'node:test'
import assert from 'node:assert'
import './mock-env.js'
import { runGenericAdapterTests } from './test-suite.js'
import AgentPlatformAdapter from '../../lib/chat/llm/adapters/implementations/agentPlatform.js'

test('Agent Platform Adapter - standard tests', async (t) => {
  const config = {
    api_key: 'vertex-mock-key',
    project_id: 'mock-project',
    base_url: 'https://aiplatform.googleapis.com',
  }

  const mocks = {
    models: async () => [{ owner: 'Vertex', models: ['gemini-2.5-flash'] }],
    createCore: (_event) => ({
      chat: async function* () {
        yield { candidates: [{ content: { parts: [{ text: 'Hello from Vertex AI' }] } }] }
      },
    }),
  }

  await runGenericAdapterTests(t, AgentPlatformAdapter, config, mocks)
})

test('Agent Platform - block_express behavior', async (t) => {
  await t.test('with block_express: false (default)', async () => {
    const adapter = new AgentPlatformAdapter({
      api_key: 'test-api-key',
      project_id: 'test-project',
      base_url: 'https://us-central1-aiplatform.googleapis.com',
      block_express: false,
    })

    const core = adapter.core
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
      project_id: 'test-project',
      base_url: 'https://us-central1-aiplatform.googleapis.com',
      block_express: true,
    })

    const core = adapter.core
    assert.strictEqual(core.block_express, true)

    // URL 中不应有 key=
    const url = core._getRequestUrl('gemini-1.5-pro', true)
    assert.ok(!url.includes('key='), 'Should NOT append api_key to URL in non-express mode')

    // _getAuthHeaders 应抛出 ADC 未配置的错误
    await assert.rejects(
      () => core._getAuthHeaders(),
      { message: /Vertex AI ADC 认证失败/ },
      'Should throw ADC error when no credentials configured'
    )
  })

  await t.test('models() should try Vertex AI publisher models list and parse correctly', async () => {
    const adapter = new AgentPlatformAdapter({
      project_id: 'test-project',
      base_url: 'https://us-central1-aiplatform.googleapis.com',
      block_express: true,
    })

    const core = adapter.core

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
        ok: true,
        json: async () => ({
          publisherModels: [
            { name: 'publishers/google/models/gemini-1.5-pro', supportedActions: ['predict'] },
            { name: 'publishers/google/models/gemini-1.5-flash', supportedActions: ['predict'] },
            { name: 'publishers/google/models/unrelated-model', supportedActions: ['predict'] },
          ],
        }),
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
      project_id: 'test-project',
      base_url: 'https://us-central1-aiplatform.googleapis.com',
      block_express: false,
    })

    const core = adapter.core

    const originalFetch = global.fetch
    let fetchedUrls = []

    global.fetch = async (url, _options) => {
      fetchedUrls.push(url)
      if (url.includes('aiplatform.googleapis.com')) {
        return { ok: false, status: 403, text: async () => 'Forbidden' }
      }
      return {
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
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
})
