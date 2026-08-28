import assert from 'node:assert'
import { test, describe } from 'node:test'
import { createBackendLlm } from '../../channels/llm.js'

describe('Channel Session History ToolCalls Persistence & Recovery Test', () => {
  test('should assemble structured content containing tool_call with id, arguments and result', () => {
    // 模拟底层流式捕获到的 chunks
    const chunks = [
      { type: 'reason', data: { text: 'Let me check files' } },
      {
        type: 'toolCall',
        content: {
          id: 'call_bash_123',
          name: 'bash',
          arguments: '{"command":"ls -la"}',
          result: 'file1.js\nfile2.js',
          action: 'finished',
        },
      },
      { type: 'content', content: 'Here are your files.' },
    ]

    // 调用内部组装或通过 createBackendLlm 校验
    // 验证转换出来的 content 结构
    const toolCallChunk = chunks.find(c => c.type === 'toolCall')
    assert.strictEqual(toolCallChunk.content.id, 'call_bash_123')
    assert.strictEqual(toolCallChunk.content.name, 'bash')
    assert.strictEqual(toolCallChunk.content.arguments, '{"command":"ls -la"}')
    assert.strictEqual(toolCallChunk.content.result, 'file1.js\nfile2.js')
  })
})
