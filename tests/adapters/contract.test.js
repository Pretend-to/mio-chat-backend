import { test, describe } from 'node:test'
import assert from 'node:assert'
import './mock-env.js'
import {
  getAvailableAdapterTypes,
  getAdapterClass,
} from '../../lib/chat/llm/adapters/registry.js'
import OpenAIBot from '../../lib/chat/llm/adapters/implementations/openai.js'

describe('LLM Adapter Contract & Context Integrity Guardrails', async () => {
  const adapterTypes = await getAvailableAdapterTypes()

  // 1. 不变式 I1：所有适配器的 _prepareChatBody 必须严格透传 context 到 _getFormattedTools
  for (const type of adapterTypes) {
    test(`[Invariant I1] ${type} adapter must strictly propagate context in _prepareChatBody`, async () => {
      const AdapterClass = await getAdapterClass(type)
      assert.ok(AdapterClass, `Adapter class for ${type} must exist`)

      const config = {
        api_key: 'mock-key-for-test',
        base_url: 'https://api.mock.test/v1',
        project_id: 'mock-project',
      }

      const adapter = new AdapterClass(config)

      const body = {
        messages: [{ role: 'user', content: 'test contract' }],
        settings: {
          base: { model: 'mock-model' },
          chatParams: { temperature: 0.7 },
          toolCallSettings: {
            mode: 'AUTO',
            tools: ['test_tool_id'],
          },
        },
      }

      const mockContext = {
        principal: { role: 'admin', userId: 'usr-guard-01' },
        agentId: 'agent-contract-01',
        channelId: 'chan-01',
        sentinelId: Symbol('context-sentinel'),
      }

      let capturedContext = null
      const originalGetFormattedTools = adapter._getFormattedTools

      adapter._getFormattedTools = function (tools, passthrough, ctx) {
        capturedContext = ctx
        // 返回空数组以防深入到具体 schema 生成
        return []
      }

      try {
        await adapter._prepareChatBody(body, mockContext)
      } finally {
        adapter._getFormattedTools = originalGetFormattedTools
      }

      assert.strictEqual(
        capturedContext,
        mockContext,
        `Adapter ${type} dropped or replaced context! Received: ${JSON.stringify(capturedContext)}`,
      )
    })
  }

  // 2. 不变式 I2：除 4 大协议基类外，所有适配器子类禁止直接覆盖 _prepareChatBody（必须通过钩子或声明式配置扩展）
  const PROTOCOL_BASE_ADAPTER_TYPES = [
    'openai',
    'openai-responses',
    'anthropic',
    'gemini',
  ]

  for (const type of adapterTypes) {
    if (PROTOCOL_BASE_ADAPTER_TYPES.includes(type)) {
      continue
    }
    test(`[Invariant I2] ${type} adapter subclass must NOT define its own _prepareChatBody`, async () => {
      const AdapterClass = await getAdapterClass(type)
      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(
          AdapterClass.prototype,
          '_prepareChatBody',
        ),
        false,
        `Adapter ${type} violates Invariant I2 by overriding _prepareChatBody directly! Use postProcessChatBody or profile declarations instead.`,
      )
    })
  }

  // 2. 反向变异测试：证明若有适配器漏传 context，该守卫必然红灯报警
  test('[Mutation Test] Guardrail must catch regression if an adapter omits context', async () => {
    class MutatedBrokenAdapter extends OpenAIBot {
      // 故意模拟历史故障：不接收或不透传 context
      async _prepareChatBody(body) {
        return super._prepareChatBody(body)
      }
    }

    const badAdapter = new MutatedBrokenAdapter({
      api_key: 'mock',
      base_url: 'https://api.mock.test/v1',
    })

    const body = {
      messages: [{ role: 'user', content: 'hello' }],
      settings: {
        base: { model: 'mock-model' },
        toolCallSettings: {
          mode: 'AUTO',
          tools: ['test_tool'],
        },
      },
    }

    const mockContext = {
      sentinel: Symbol('must-fail'),
    }

    let capturedContext = null
    badAdapter._getFormattedTools = function (tools, passthrough, ctx) {
      capturedContext = ctx
      return []
    }

    await badAdapter._prepareChatBody(body, mockContext)

    // 在坏适配器下，capturedContext 会 fallback 到 body，而不是 mockContext
    assert.notStrictEqual(
      capturedContext,
      mockContext,
      'Mutated adapter should have lost mockContext',
    )
    assert.strictEqual(
      capturedContext,
      body,
      'Mutated adapter should fallback to bare body',
    )
  })
})
