import { test } from 'node:test'
import assert from 'node:assert'
import '../adapters/mock-env.js'

import ManageLLMAdapter from '../../lib/plugins/config-plugin/tools/llm_adapter_config.js'
import UpdateSystemConfig from '../../lib/plugins/config-plugin/tools/update_config.js'

test('Config Plugin - llm_adapter_config (add)', async (t) => {
  const tool = new ManageLLMAdapter()
  
  assert.ok(tool.name.startsWith('llm_adapter_config'))
  assert.strictEqual(tool.getDisplayName({ action: 'add', adapterType: 'openai' }), 'Adding LLM adapter: openai')

  await t.test('should reject execution if user rejects approval', async () => {
    tool.requestUserApproval = async () => ({ approved: false, reason: 'user cancelled' })
    const e = { params: { action: 'add', adapterType: 'openai', instanceConfig: { enable: true } } }
    const result = await tool.execute(e)
    assert.strictEqual(result.success, false)
    assert.ok(result.error.includes('用户拒绝授权'))
  })
})

test('Config Plugin - llm_adapter_config (update)', async (t) => {
  const tool = new ManageLLMAdapter()
  
  assert.strictEqual(tool.getDisplayName({ action: 'update', adapterType: 'gemini', index: 1 }), 'Updating LLM adapter: gemini#1')

  await t.test('should reject execution if user rejects approval', async () => {
    tool.requestUserApproval = async () => ({ approved: false, reason: 'denied' })
    const e = { params: { action: 'update', adapterType: 'gemini', index: 1, instanceConfig: { enable: false } } }
    const result = await tool.execute(e)
    assert.strictEqual(result.success, false)
    assert.ok(result.error.includes('用户拒绝授权'))
  })
})

test('Config Plugin - llm_adapter_config (delete)', async (t) => {
  const tool = new ManageLLMAdapter()
  
  assert.strictEqual(tool.getDisplayName({ action: 'delete', adapterType: 'vertex', index: 0 }), 'Deleting LLM adapter: vertex#0')

  await t.test('should reject execution if user rejects approval', async () => {
    tool.requestUserApproval = async () => ({ approved: false })
    const e = { params: { action: 'delete', adapterType: 'vertex', index: 0 } }
    const result = await tool.execute(e)
    assert.strictEqual(result.success, false)
    assert.ok(result.error.includes('用户拒绝授权'))
  })
})

test('Config Plugin - update_config', async (t) => {
  const tool = new UpdateSystemConfig()
  
  assert.ok(tool.name.startsWith('update_config'))
  assert.strictEqual(tool.getDisplayName({ updates: { web: {}, onebot: {} } }), 'Updating system config: web, onebot')

  await t.test('should reject execution if user rejects approval', async () => {
    tool.requestUserApproval = async () => ({ approved: false })
    const e = { params: { updates: { web: { title: 'MioChat' } } } }
    const result = await tool.execute(e)
    assert.strictEqual(result.success, false)
    assert.ok(result.error.includes('用户拒绝授权'))
  })
})
