import assert from 'node:assert'
import { test, describe } from 'node:test'
import { SlashCommandHandler } from '../../channels/common/SlashHandler.js'

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

    const toolCallChunk = chunks.find((c) => c.type === 'toolCall')
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

    await handler.handle('/think max')
    assert.strictEqual(store.get('reasoning_effort'), 4)
  })

  test('should handle /tools slash command correctly', async () => {
    const handler = new SlashCommandHandler({ channel: {}, memory: {} })
    const res = await handler.handle('/tools')
    assert.match(res.text, /Channel 工具策略/)
    assert.match(
      res.text,
      /Channel 固定启用完整 ai-plugin、terminal-pty 与 file-editor-plugin/,
    )
  })

  test('should compact and fully archive the active session', async () => {
    const calls = []
    const memory = {
      clearPendingMemories: async (id) => calls.push(['clear', id]),
      getActiveSession: async () => 's_compact',
      getCrystal: async () => '<memory_crystal>old</memory_crystal>',
      getPendingMemories: async () => [{ action: 'add', content: 'fact' }],
      getSession: async () => ({
        chat: [
          { role: 'user', text: 'old question' },
          { role: 'assistant', text: 'old answer' },
        ],
        id: 's_compact',
      }),
      rotateChat: async (id, keepTurns) => {
        calls.push(['rotate', id, keepTurns])
        return { removedCount: 2, rotated: true }
      },
      setCrystal: async (id, value) => calls.push(['crystal', id, value]),
    }
    const channel = {
      activeJobs: new Map(),
      llm: {
        compact: async (options) => {
          calls.push(['compact', options])
          return {
            compacted: true,
            summary: '<memory_crystal>new</memory_crystal>',
          }
        },
      },
      model: 'test-model',
      provider: 'test-provider',
    }

    const handler = new SlashCommandHandler({ channel, memory })
    const result = await handler.handle('/compact')

    assert.match(result.text, /上下文压缩完成/)
    assert.equal(calls[0][0], 'compact')
    assert.equal(calls[0][1].keepTurns, 0)
    assert.deepEqual(calls.slice(1), [
      ['crystal', 's_compact', '<memory_crystal>new</memory_crystal>'],
      ['rotate', 's_compact', 0],
      ['clear', 's_compact'],
    ])
  })

  test('should toggle session-scoped yolo and report status', async () => {
    const store = new Map()
    const mockMemory = {
      getActiveSession: async () => 's_test',
      getAgentMeta: async (k, def) => store.get(k) ?? def,
      setAgentMeta: async (k, v) => store.set(k, v),
      getSession: async () => ({ id: 's_test', title: '开发', chat: [] }),
    }
    const channel = {
      activeJobs: new Map([['job-1', {}]]),
      model: 'test-model',
      pendingConfirmations: new Map(),
      provider: 'test-provider',
    }
    const handler = new SlashCommandHandler({ channel, memory: mockMemory })

    const before = await handler.handle('/yolo')
    assert.match(before.text, /YOLO 模式：已关闭/)

    const enabled = await handler.handle('/yolo on')
    assert.match(enabled.text, /已开启/)
    assert.deepStrictEqual(store.get('session_yolo'), { s_test: true })

    const status = await handler.handle('/status')
    assert.match(status.text, /会话: s_test/)
    assert.match(status.text, /YOLO: 开启/)
    assert.match(status.text, /运行中任务: 1 个/)

    await handler.handle('/yolo off')
    assert.deepStrictEqual(store.get('session_yolo'), {})
  })
})
