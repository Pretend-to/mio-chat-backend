import { test, describe } from 'node:test'
import assert from 'node:assert'
import { VertexAuthStrategy } from '../../lib/chat/llm/adapters/strategies/auth/VertexAuthStrategy.js'
import { VertexTransportStrategy } from '../../lib/chat/llm/adapters/strategies/transport/VertexTransportStrategy.js'

describe('LLM Strategies: Vertex Auth & Transport', () => {
  test('VertexAuthStrategy: Express mode returns empty auth headers', async () => {
    const strategy = new VertexAuthStrategy({ blockExpress: false })
    const headers = await strategy.getAuthHeaders()
    assert.deepStrictEqual(headers, {})
  })

  test('VertexAuthStrategy: ADC mode successfully extracts token', async () => {
    const strategy = new VertexAuthStrategy({ blockExpress: true })
    strategy._googleAuth = {
      async getClient() {
        return {
          async getAccessToken() {
            return { token: 'mock-adc-access-token' }
          },
        }
      },
    }

    const headers = await strategy.getAuthHeaders()
    assert.deepStrictEqual(headers, {
      Authorization: 'Bearer mock-adc-access-token',
    })
  })

  test('VertexAuthStrategy: ADC mode failure wraps actionable error', async () => {
    const strategy = new VertexAuthStrategy({ blockExpress: true })
    strategy._googleAuth = {
      async getClient() {
        throw new Error('Could not load credentials')
      },
    }

    await assert.rejects(
      async () => strategy.getAuthHeaders(),
      /Vertex AI ADC 认证失败/,
    )
  })

  test('VertexTransportStrategy: URL generation in Express vs ADC mode', () => {
    const expressTransport = new VertexTransportStrategy({
      apiKey: 'my-key-123',
      baseUrl: 'https://aiplatform.googleapis.com',
      blockExpress: false,
      projectId: 'my-proj',
    })

    const expressUrl = expressTransport.getRequestUrl('gemini-2.0-flash', true)
    assert.ok(expressUrl.includes('key=my-key-123'))
    assert.ok(expressUrl.includes('streamGenerateContent?alt=sse&key=my-key-123'))

    const expressModelsUrl = expressTransport.getPublisherModelsUrl('us-central1')
    assert.ok(expressModelsUrl.includes('key=my-key-123'))

    const adcTransport = new VertexTransportStrategy({
      apiKey: '',
      baseUrl: 'https://aiplatform.googleapis.com',
      blockExpress: true,
      projectId: 'my-proj',
    })

    const adcUrl = adcTransport.getRequestUrl('gemini-2.0-flash', true)
    assert.ok(!adcUrl.includes('key='))
    assert.ok(adcUrl.includes('v1/projects/my-proj/locations/global/publishers/google/models/gemini-2.0-flash:streamGenerateContent?alt=sse'))

    const adcModelsUrl = adcTransport.getPublisherModelsUrl('asia-east1')
    assert.ok(!adcModelsUrl.includes('key='))
    assert.ok(adcModelsUrl.includes('asia-east1-aiplatform.googleapis.com'))
  })
})
