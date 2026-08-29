import { test } from 'node:test'
import assert from 'node:assert'
import '../adapters/mock-env.js'

import Memory from '../../lib/plugins/ai-plugin/tools/memory.js'

test('Memory Tool - global memory approval workflow', async (t) => {
  const tool = new Memory()

  await t.test('should prompt for approval on Web global add and proceed when approved', async () => {
    let capturedPrompt = ''
    let capturedMeta = null

    tool.requestUserApproval = async (e, prompt, meta) => {
      capturedPrompt = prompt
      capturedMeta = meta
      return { approved: true }
    }

    const mockEvent = {
      body: {},
      params: {
        action: 'add',
        category: 'user_profile',
        content: '用户喜欢使用 Rust 和 Vue3 进行开发',
        scope: 'global',
      },
    }

    const result = await tool.func(mockEvent)
    assert.strictEqual(result.success, true)
    assert.ok(capturedPrompt.includes('user_profile'))
    assert.strictEqual(capturedMeta.type, 'global_memory')
    assert.strictEqual(capturedMeta.action, 'add')
  })

  await t.test('should stop and return error with user reason when rejected', async () => {
    tool.requestUserApproval = async () => ({
      approved: false,
      reason: '暂时不需要全局记录该偏好',
    })

    const mockEvent = {
      body: {},
      params: {
        action: 'add',
        category: 'tech_stack',
        content: '偏好 Angular 框架',
        scope: 'global',
      },
    }

    const result = await tool.func(mockEvent)
    assert.strictEqual(result.success, false)
    assert.ok(result.error.includes('用户拒绝授权更新全局长期记忆'))
    assert.ok(result.error.includes('暂时不需要全局记录该偏好'))
  })

  await t.test('channel mode also prompts for approval via channel confirmation', async () => {
    let approvalCalled = false
    tool.requestUserApproval = async (e, prompt, meta) => {
      approvalCalled = true
      assert.strictEqual(meta.type, 'global_memory')
      return { approved: true }
    }

    const mockChannelEvent = {
      body: {},
      channel: { channelType: 'wechat' },
      params: {
        action: 'add',
        category: 'general',
        content: '微信对话沉淀的常识',
        scope: 'global',
      },
      protocol: 'channel',
    }

    const result = await tool.func(mockChannelEvent)
    assert.strictEqual(result.success, true)
    assert.strictEqual(approvalCalled, true)
  })
})
