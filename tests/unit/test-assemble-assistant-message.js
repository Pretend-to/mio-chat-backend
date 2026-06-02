/**
 * 测试 _assembleAssistantMessage — 将 streamCache 原始 chunks 转为前端格式
 *
 * 运行方式: node tests/unit/test-assemble-assistant-message.js
 */

import logger from '../../utils/logger.js'

// 从 TaskRunnerService 中提取 _assembleAssistantMessage 的逻辑
// 因为它是原型方法，与其 import 整个有 side-effect 的 service，不如直接引用
import TaskRunnerService from '../../lib/chat/llm/services/TaskRunnerService.js'

let passed = 0
let failed = 0

function assert(condition, desc) {
  if (condition) {
    logger.info(`  ✅ ${desc}`)
    passed++
  } else {
    logger.error(`  ❌ ${desc}`)
    failed++
  }
}

async function main() {
  logger.info('🧪 测试 _assembleAssistantMessage')
  logger.info('================================')

  // ---------- Case 1: 空数组 -> Success 兜底 ----------
  logger.info('\n[Case 1] 空 chunks')
  const result1 = TaskRunnerService._assembleAssistantMessage([], 'msg-1')
  assert(result1.content.length === 1, 'content 应有 1 个元素')
  assert(result1.content[0].type === 'text', '类型应为 text')
  assert(result1.content[0].data.text === 'Success', '内容为 Success')
  assert(result1.role === 'assistant', 'role 为 assistant')
  assert(result1.status === 'completed', 'status 为 completed')

  // ---------- Case 2: content 类型 ----------
  logger.info('\n[Case 2] content chunks')
  const result2 = TaskRunnerService._assembleAssistantMessage([
    { type: 'content', content: '你好，' },
    { type: 'content', content: '世界！' },
  ], 'msg-2')
  assert(result2.content.length === 2, 'content 应有 2 个元素')
  assert(result2.content[0].type === 'text', '第 1 个类型为 text')
  assert(result2.content[0].data.text === '你好，', '文本正确')
  assert(result2.content[1].data.text === '世界！', '文本正确')

  // ---------- Case 3: reason 类型 ----------
  logger.info('\n[Case 3] reason chunks')
  const result3 = TaskRunnerService._assembleAssistantMessage([
    { type: 'reason', data: { text: '让我思考一下...', startTime: 1000, duration: 0 } },
    { type: 'reason', data: { text: '继续推理...', startTime: 1000, duration: 500 } },
  ], 'msg-3')
  assert(result3.content.length === 2, 'content 应有 2 个元素')
  assert(result3.content[0].type === 'reason', '第 1 个类型为 reason')
  assert(result3.content[0].data.text === '让我思考一下...', '推理文本正确')
  assert(result3.content[0].data.startTime === 1000, 'startTime 正确')
  assert(result3.content[0].data.duration === 0, 'duration 正确')
  assert(result3.content[1].data.duration === 500, 'duration 正确')

  // ---------- Case 4: toolCall 类型 ----------
  logger.info('\n[Case 4] toolCall chunks')
  const result4 = TaskRunnerService._assembleAssistantMessage([
    {
      type: 'toolCall',
      content: {
        id: 'call_abc123',
        name: 'web_search',
        index: 0,
        action: 'running',
        arguments: '{"query":"test"}',
      },
    },
    {
      type: 'toolCall',
      content: {
        id: 'call_def456',
        name: 'read_file',
        index: 1,
        action: 'pending',
        arguments: '{"path":"/tmp/x"}',
        result: 'file content',
      },
    },
  ], 'msg-4')
  assert(result4.content.length === 2, 'content 应有 2 个元素')
  assert(result4.content[0].type === 'tool_call', '第 1 个类型为 tool_call')
  assert(result4.content[0].data.name === 'web_search', '工具名正确')
  assert(result4.content[0].data.status === 'running', 'action=running -> status=running')
  assert(result4.content[0].data.arguments === '{"query":"test"}', 'arguments 正确')
  assert(result4.content[1].data.status === 'done', '有 result -> status=done')
  assert(result4.content[1].data.name === 'read_file', '工具名正确')

  // ---------- Case 5: toolCall 使用 parameters 而非 arguments ----------
  logger.info('\n[Case 5] toolCall 使用 parameters')
  const result5 = TaskRunnerService._assembleAssistantMessage([
    {
      type: 'toolCall',
      content: {
        id: 'call_xyz',
        name: 'calculator',
        index: 0,
        action: 'pending',
        parameters: '{"a":1,"b":2}',
      },
    },
  ], 'msg-5')
  assert(result5.content[0].data.arguments === '{"a":1,"b":2}', 'arguments 回退到 parameters')

  // ---------- Case 6: crystallize 类型 ----------
  logger.info('\n[Case 6] crystallize chunks')
  const result6 = TaskRunnerService._assembleAssistantMessage([
    {
      type: 'crystallize',
      content: { status: 'running', summary: '开始压缩记忆...' },
    },
    {
      type: 'crystallize',
      content: { status: 'finished', summary: '已完成记忆压缩' },
    },
  ], 'msg-6')
  assert(result6.content.length === 2, 'content 应有 2 个元素')
  assert(result6.content[0].type === 'crystallize_event', '类型为 crystallize_event')
  assert(result6.content[0].data.status === 'running', 'status 正确')
  assert(result6.content[0].data.summary === '开始压缩记忆...', 'summary 正确')
  assert(result6.content[1].data.status === 'finished', 'status 正确')

  // ---------- Case 7: 混合所有类型 ----------
  logger.info('\n[Case 7] 混合所有类型')
  const result7 = TaskRunnerService._assembleAssistantMessage([
    { type: 'reason', data: { text: '推理中...', startTime: 100, duration: 0 } },
    { type: 'content', content: '答案是 42。' },
    { type: 'toolCall', content: { id: 'call_1', name: 'search', index: 0, arguments: '{}' } },
    { type: 'crystallize', content: { status: 'finished', summary: 'done' } },
  ], 'msg-7')
  assert(result7.content.length === 4, '4 个元素全保留')
  assert(result7.content[0].type === 'reason', 'reason 保留')
  assert(result7.content[1].type === 'text', 'text 保留')
  assert(result7.content[2].type === 'tool_call', 'tool_call 保留')
  assert(result7.content[3].type === 'crystallize_event', 'crystallize_event 保留')

  // ---------- Case 8: undefined/null chunks ----------
  logger.info('\n[Case 8] null/undefined chunks')
  const result8a = TaskRunnerService._assembleAssistantMessage(null, 'msg-8a')
  assert(result8a.content.length === 1 && result8a.content[0].data.text === 'Success',
    'null 返回 Success')
  const result8b = TaskRunnerService._assembleAssistantMessage(undefined, 'msg-8b')
  assert(result8b.content.length === 1 && result8b.content[0].data.text === 'Success',
    'undefined 返回 Success')

  // ---------- Case 9: 未知 chunk 类型静默忽略 ----------
  logger.info('\n[Case 9] 未知 chunk 类型')
  const result9 = TaskRunnerService._assembleAssistantMessage([
    { type: 'unknown_type', content: 'ignored' },
  ], 'msg-9')
  assert(result9.content.length === 1 && result9.content[0].data.text === 'Success',
    '未知类型被忽略，兜底 Success')

  // ---------- 结果汇总 ----------
  logger.info('\n================================')
  const total = passed + failed
  logger.info(`📊 测试完成: ${total} 个用例，${passed} 通过，${failed} 失败`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  logger.error('测试执行异常:', err)
  process.exit(1)
})
