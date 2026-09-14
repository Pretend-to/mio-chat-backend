import { test } from 'node:test'
import assert from 'node:assert'
import '../adapters/mock-env.js'

import ProfileTool from '../../lib/plugins/ai-plugin/tools/profile.js'

test('ProfileTool - read, update, clear and client system message emission', async (t) => {
  const tool = new ProfileTool()

  await t.test('should read profile settings', async () => {
    const e = {
      body: {
        settings: {
          presetSettings: {
            opening: '原有设定内容'
          }
        }
      },
      contactorId: 'group_123',
      conversationKind: 'group',
      member: {
        id: 'member_456',
        name: '问候'
      },
      params: { action: 'read' },
    }

    const result = await tool.execute(e)
    assert.strictEqual(result.success, true)
    assert.strictEqual(result.prompt, '原有设定内容')
    assert.strictEqual(result.memberId, 'member_456')
    assert.strictEqual(result.memberName, '问候')
  })

  await t.test('should update profile and emit agent_profile_updated to client', async () => {
    const systemMessages = []
    const e = {
      body: {
        settings: {
          presetSettings: {
            opening: '旧设定'
          }
        }
      },
      client: {
        sendSystemMessage: (type, data) => {
          systemMessages.push({ type, data })
        }
      },
      contactorId: 'group_123',
      conversationKind: 'group',
      member: {
        id: 'member_456',
        name: '问候'
      },
      params: {
        action: 'update',
        duty: '负责综合咨询与创意支持',
        name: '小顾',
        prompt: '你是群里的综合顾问「小顾」',
        title: '综合顾问·小顾',
      },
    }

    const result = await tool.execute(e)
    assert.strictEqual(result.success, true)
    assert.strictEqual(result.name, '小顾')
    assert.strictEqual(result.title, '综合顾问·小顾')
    assert.strictEqual(result.intro, '负责综合咨询与创意支持')
    assert.strictEqual(result.prompt, '你是群里的综合顾问「小顾」')

    // 验证 client.sendSystemMessage 触发
    assert.strictEqual(systemMessages.length, 1)
    assert.strictEqual(systemMessages[0].type, 'agent_profile_updated')
    assert.deepStrictEqual(systemMessages[0].data, {
      action: 'update',
      contactorId: 'group_123',
      intro: '负责综合咨询与创意支持',
      memberId: 'member_456',
      memberName: '问候',
      name: '小顾',
      opening: '你是群里的综合顾问「小顾」',
      prompt: '你是群里的综合顾问「小顾」',
      title: '综合顾问·小顾',
    })
  })

  await t.test('should clear profile and emit agent_profile_updated to client', async () => {
    const systemMessages = []
    const e = {
      body: {
        settings: {
          presetSettings: {
            opening: '要被清空的设定'
          }
        }
      },
      client: {
        sendSystemMessage: (type, data) => {
          systemMessages.push({ type, data })
        }
      },
      contactorId: 'group_123',
      conversationKind: 'group',
      member: {
        id: 'member_456',
        name: '小顾'
      },
      params: { action: 'clear' },
    }

    const result = await tool.execute(e)
    assert.strictEqual(result.success, true)
    assert.strictEqual(systemMessages.length, 1)
    assert.strictEqual(systemMessages[0].type, 'agent_profile_updated')
    assert.strictEqual(systemMessages[0].data.action, 'clear')
    assert.strictEqual(systemMessages[0].data.opening, '')
  })

  await t.test('should be marked as groupOnly tool', () => {
    assert.strictEqual(tool.groupOnly, true)
  })
})
