import assert from 'node:assert'
import { test, describe } from 'node:test'
import { SlashCommandHandler } from '../../channels/wechat/slash.js'

describe('Channel Session History & Slash Commands Test', () => {
  test('should assemble structured content containing tool_call with id, arguments and result', () => {
    const chunks = [
      { type: 'reason', data: { text: 'Let me check files' } },
      {
        type: 'toolCall',
        content: {
          action: 'finished',
          arguments: '{"command":"ls -la"}',
          id: 'call_bash_123',
          name: 'bash',
          result: 'file1.js\nfile2.js',
        },
      },
      { content: 'Here are your files.', type: 'content' },
    ]

    const toolCallChunk = chunks.find(c => c.type === 'toolCall')
    assert.strictEqual(toolCallChunk.content.id, 'call_bash_123')
    assert.strictEqual(toolCallChunk.content.name, 'bash')
    assert.strictEqual(toolCallChunk.content.arguments, '{"command":"ls -la"}')
    assert.strictEqual(toolCallChunk.content.result, 'file1.js\nfile2.js')
  })

  test('should handle /think slash command correctly', async () => {
    const store = new Map()
    const mockMemory = {
      getActiveSession: async () => 's_test',
      getAgentMeta: async (k, def) => store.get(k) ?? def,
      setAgentMeta: async (k, v) => store.set(k, v),
    }

    const handler = new SlashCommandHandler({ channel: {}, memory: mockMemory })

    const resGet = await handler.handle('/think')
    assert.match(resGet.text, /思考\/推理强度/)

    const resSetHigh = await handler.handle('/think high')
    assert.match(resSetHigh.text, /思考\/推理强度已设置为/)
    assert.strictEqual(store.get('reasoning_effort'), 3)

    const resSetMax = await handler.handle('/think max')
    assert.strictEqual(store.get('reasoning_effort'), 4)
  })

  test('should handle /tools slash command correctly', async () => {
    const store = new Map()
    const mockMemory = {
      getActiveSession: async () => 's_test',
      getAgentMeta: async (k, def) => store.get(k) ?? def,
      setAgentMeta: async (k, v) => store.set(k, v),
    }

    const handler = new SlashCommandHandler({ channel: {}, memory: mockMemory })

    const resLs = await handler.handle('/tools ls')
    assert.match(resLs.text, /工具状态管理/)

    const resOff = await handler.handle('/tools off bash')
    assert.match(resOff.text, /已禁用工具/)
    assert.strictEqual(store.get('tools').includes('bash'), false)

    const resOn = await handler.handle('/tools on bash')
    assert.match(resOn.text, /已开启工具/)
    assert.strictEqual(store.get('tools').includes('bash'), true)
  })
})
