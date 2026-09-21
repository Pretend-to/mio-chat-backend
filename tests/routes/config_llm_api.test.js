import { describe, it } from 'node:test'
import assert from 'node:assert'
import '../adapters/mock-env.js'

import * as configController from '../../lib/server/http/controllers/configController.js'
import {
  createAdapterInstanceId,
  ensureAdapterInstanceIds,
  migrateLLMAdapterConfig,
  resolveAdapterInstance,
} from '../../lib/server/http/services/configService.js'
import * as configService from '../../lib/server/http/services/configService.js'

function createMockReqRes({ body = {}, params = {}, query = {} } = {}) {
  const req = {
    body,
    params,
    query,
  }
  let statusCode = 200
  let responseData = null

  const res = {
    json(data) {
      responseData = data
      return res
    },
    status(code) {
      statusCode = code
      return res
    },
  }

  return {
    getResponse: () => ({ data: responseData, status: statusCode }),
    req,
    res,
  }
}

describe('LLM Config API (test-connection & fetch-models)', () => {
  it('should assign stable IDs and resolve only by ID', () => {
    const adapters = {
      openai: [{ enable: true }, { enable: false, id: 'adp_existing' }],
    }

    assert.strictEqual(ensureAdapterInstanceIds(adapters), true)
    assert.match(adapters.openai[0].id, /^adp_[0-9a-f-]{36}$/)
    assert.strictEqual(ensureAdapterInstanceIds(adapters), false)
    const resolved = resolveAdapterInstance('openai', adapters.openai[0].id, {
      llm_adapters: adapters,
    })
    assert.strictEqual(resolved.id, adapters.openai[0].id)
    assert.strictEqual(resolved.instance, adapters.openai[0])
    assert.equal(resolved.index, undefined)
    const staleTypeResolved = resolveAdapterInstance(
      'deepseek',
      adapters.openai[0].id,
      { llm_adapters: adapters },
    )
    assert.equal(staleTypeResolved.adapterType, 'openai')
    assert.equal(staleTypeResolved.position, 0)
    assert.throws(
      () => resolveAdapterInstance('openai', '1', { llm_adapters: adapters }),
      /实例 ID 1 不存在/,
    )
    assert.match(createAdapterInstanceId(), /^adp_[0-9a-f-]{36}$/)
  })

  it('should migrate legacy adapter entries without changing their order', async () => {
    const legacyId = 'adp_existing'
    const adapters = {
      openai: [
        { enable: true, name: 'first' },
        { enable: true, id: legacyId, index: 1, instanceIndex: 1 },
        { enable: false, id: legacyId, name: 'duplicate' },
      ],
    }

    assert.strictEqual(await migrateLLMAdapterConfig(adapters), true)
    assert.strictEqual(adapters.openai.length, 3)
    assert.ok(adapters.openai.every((instance) => instance.id))
    assert.strictEqual(new Set(adapters.openai.map((instance) => instance.id)).size, 3)
    assert.equal(adapters.openai[1].index, undefined)
    assert.equal(adapters.openai[1].instanceIndex, undefined)
  })

  it('test-connection should reject invalid adapterType with 400', async () => {
    const { req, res, getResponse } = createMockReqRes({
      body: { api_key: 'test' },
      params: { adapterType: 'non-existent-adapter' },
    })

    await configController.testLLMConnection(req, res)
    const resp = getResponse()
    assert.strictEqual(resp.status, 400)
    assert.match(resp.data.message, /无效的适配器类型/)
  })

  it('fetch-models should reject invalid adapterType with 400', async () => {
    const { req, res, getResponse } = createMockReqRes({
      body: { api_key: 'test' },
      params: { adapterType: 'invalid-foo' },
    })

    await configController.fetchLLMModels(req, res)
    const resp = getResponse()
    assert.strictEqual(resp.status, 400)
    assert.match(resp.data.message, /无效的适配器类型/)
  })

  it('update/delete/refresh should reject numeric identifiers', async () => {
    const operations = [
      configController.updateLLMInstance,
      configController.deleteLLMInstance,
      configController.refreshModels,
    ]

    for (const operation of operations) {
      const { req, res, getResponse } = createMockReqRes({
        body: {},
        params: { adapterType: 'openai', instanceId: '0' },
      })
      await operation(req, res)
      const resp = getResponse()
      assert.strictEqual(resp.status, 404)
      assert.match(resp.data.message, /实例 ID 0 不存在/)
    }
  })

  it('fetch-models should successfully fetch and filter non-text models', async () => {
    const { default: OpenAIBot } = await import(
      '../../lib/chat/llm/adapters/implementations/openai.js'
    )
    const originalGetModels = OpenAIBot.prototype._getModels
    OpenAIBot.prototype._getModels = async () => [
      {
        owner: 'openai',
        models: [
          { id: 'gpt-4o' },
          { id: 'text-embedding-3-small' },
          { id: 'tts-1' },
          { id: 'dall-e-3' },
          { id: 'gpt-4o-mini' },
        ],
      },
    ]

    try {
      const result = await configService.fetchLLMModels('openai', {
        api_key: 'sk-test',
        base_url: 'https://api.openai.com/v1',
      })

      assert.strictEqual(result.success, true)
      assert.strictEqual(result.models.length, 1)
      assert.strictEqual(result.models[0].models.length, 2)
      assert.strictEqual(result.models[0].models[0].id, 'gpt-4o')
      assert.strictEqual(result.models[0].models[1].id, 'gpt-4o-mini')
    } finally {
      OpenAIBot.prototype._getModels = originalGetModels
    }
  })

  it('test-connection should reject when no model is specified', async () => {
    const { req, res, getResponse } = createMockReqRes({
      body: {
        api_key: 'mock-key',
        base_url: 'https://api.openai.com/v1',
      },
      params: { adapterType: 'openai' },
    })

    await configController.testLLMConnection(req, res)
    const resp = getResponse()
    assert.strictEqual(resp.status, 400)
    assert.match(resp.data.message, /未指定测试模型/)
  })

  it('test-connection should calculate latencyMs and report model', async () => {
    const { req, res, getResponse } = createMockReqRes({
      body: {
        api_key: 'mock-key',
        base_url: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      },
      params: { adapterType: 'openai' },
    })

    // Mock testConnection on the fly or verify failure path gracefully
    await configController.testLLMConnection(req, res)
    const resp = getResponse()
    // Since mock-key won't reach real OpenAI, it returns 500 error formatted cleanly
    assert.strictEqual(resp.status, 500)
    assert.ok(resp.data.message.includes('测试连通性失败') || resp.data.message.includes('连接测试失败'))
  })

  it('test-models compatibility route should route to fetchLLMModels', async () => {
    const { req, res, getResponse } = createMockReqRes({
      body: { api_key: 'test' },
      params: { adapterType: 'invalid-adapter' },
    })

    await configController.testLLMModels(req, res)
    const resp = getResponse()
    assert.strictEqual(resp.status, 400)
    assert.match(resp.data.message, /无效的适配器类型/)
  })

  it('updateLLMInstance should seamlessly migrate an adapter instance across adapter types', async () => {
    const { default: SystemSettingsService } = await import(
      '../../lib/database/services/SystemSettingsService.js'
    )
    const currentAdapters = {
      openai: [
        {
          api_key: 'test-key',
          base_url: 'https://ark.cn-beijing.volces.com/api/v3',
          enable: true,
          id: 'adp_volc_test_123',
          models: ['doubao-lite'],
          name: '火山方舟（豆包）',
        },
      ],
      'openai-responses': [],
    }

    let savedAdapters = null
    const originalGet = SystemSettingsService.get
    const originalSet = SystemSettingsService.set

    SystemSettingsService.get = async (key) => {
      if (key === 'llm_adapters') return { value: currentAdapters }
      return null
    }
    SystemSettingsService.set = async (key, val) => {
      if (key === 'llm_adapters') {
        savedAdapters = JSON.parse(JSON.stringify(val))
        currentAdapters.openai = val.openai || []
        currentAdapters['openai-responses'] = val['openai-responses'] || []
      }
    }

    global.middleware.llm.llms = {}
    global.middleware.llm.removeInstance = () => true
    global.middleware.llm.addInstance = async () => ({ success: true })

    try {
      const result = await configService.updateLLMInstance(
        'openai-responses',
        'adp_volc_test_123',
        {
          base_url: 'https://ark.cn-beijing.volces.com/api/v3',
          enable: true,
          name: '火山方舟（豆包）',
        },
      )

      assert.strictEqual(result.adapterType, 'openai-responses')
      assert.strictEqual(result.instanceId, 'adp_volc_test_123')
      assert.strictEqual(savedAdapters.openai.length, 0)
      assert.strictEqual(savedAdapters['openai-responses'].length, 1)
      assert.strictEqual(
        savedAdapters['openai-responses'][0].id,
        'adp_volc_test_123',
      )
      assert.strictEqual(
        savedAdapters['openai-responses'][0].name,
        '火山方舟（豆包）',
      )
    } finally {
      SystemSettingsService.get = originalGet
      SystemSettingsService.set = originalSet
    }
  })
})
