/**
 * TaskExecution Service 集成测试
 *
 * 测试 TaskExecutionService 的完整 CRUD + getNextRound
 * 以及 TaskRunnerService 执行记录写入流程
 *
 * 运行方式: node tests/integration/test-task-execution.js
 */

import prismaManager from '../../lib/database/prisma.js'
import TaskService from '../../lib/database/services/TaskService.js'
import TaskExecutionService from '../../lib/database/services/TaskExecutionService.js'
import logger from '../../utils/logger.js'

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

async function cleanup() {
  const p = prismaManager.getClient()
  await p.taskExecution.deleteMany({ where: { taskId: { startsWith: 'test-' } } })
  await p.task.deleteMany({ where: { id: { startsWith: 'test-' } } })
}

async function main() {
  logger.info('🧪 测试 TaskExecution Service')
  logger.info('================================')

  // 初始化
  await prismaManager.initialize()
  await TaskService.initialize()
  await TaskExecutionService.initialize()

  // 清理旧测试数据
  await cleanup()

  // ====================================
  // Part 1: 前置 — 创建一个测试 Task
  // ====================================
  logger.info('\n[Part 1] 创建测试 Task')
  await TaskService.upsert({
    id: 'test-task-1',
    name: '测试任务',
    cron: '0 0 * * *',
    preset: 'test-preset',
    userId: 'test-user',
    contactorId: 'test-contactor',
    provider: 'test-provider',
    model: 'test-model',
    status: 'active',
    history: JSON.stringify([]),
    triggerPrompt: '执行测试任务',
  })
  assert(true, '测试 Task 已创建')

  // ====================================
  // Part 2: getNextRound — 首次 0 -> 1
  // ====================================
  logger.info('\n[Part 2] getNextRound')
  const round1 = await TaskExecutionService.getNextRound('test-task-1')
  assert(round1 === 1, `首次 round 应为 1，实际: ${round1}`)

  const roundNonExist = await TaskExecutionService.getNextRound('non-exist-task')
  assert(roundNonExist === 1, `不存在的 task round 应为 1，实际: ${roundNonExist}`)

  // ====================================
  // Part 3: create — 创建执行记录
  // ====================================
  logger.info('\n[Part 3] create 执行记录')
  const exec1 = await TaskExecutionService.create({
    taskId: 'test-task-1',
    round: 1,
    userId: 'test-user',
    contactorId: 'test-contactor',
    provider: 'test-provider',
    model: 'test-model',
    triggerPrompt: '执行测试任务',
    inputMessages: [
      { role: 'system', content: '你是测试助手' },
      { role: 'user', content: '你好' },
    ],
  })
  assert(exec1.id > 0, `执行记录 ID: ${exec1.id}`)
  assert(exec1.taskId === 'test-task-1', 'taskId 匹配')
  assert(exec1.round === 1, 'round 为 1')
  assert(exec1.status === 'running', '初始状态为 running')
  assert(exec1.startedAt !== null, 'startedAt 有值')
  assert(exec1.finishedAt === null, 'finishedAt 为 null')
  assert(exec1.errorMessage === null, 'errorMessage 为 null')

  // ====================================
  // Part 4: getNextRound — 有记录后 -> 2
  // ====================================
  logger.info('\n[Part 4] getNextRound 自增')
  const round2 = await TaskExecutionService.getNextRound('test-task-1')
  assert(round2 === 2, `第二次 round 应为 2，实际: ${round2}`)

  // 再创建第 2 条
  const exec2 = await TaskExecutionService.create({
    taskId: 'test-task-1',
    round: 2,
    userId: 'test-user',
    contactorId: 'test-contactor',
    provider: 'test-provider',
    model: 'test-model',
    triggerPrompt: '第二次执行',
    inputMessages: [],
  })
  assert(exec2.id > exec1.id, 'ID 递增')
  assert(exec2.round === 2, 'round 为 2')

  // ====================================
  // Part 5: complete — 标记完成
  // ====================================
  logger.info('\n[Part 5] complete 标记完成')

  const sampleChunks = [
    { type: 'reason', data: { text: '推理过程', startTime: 100, duration: 50 } },
    { type: 'content', content: '这是结果。' },
    { type: 'toolCall', content: { id: 'call_1', name: 'search', index: 0, arguments: '{}', result: 'found' } },
    { type: 'crystallize', content: { status: 'finished', summary: '记忆压缩完毕' } },
  ]

  const sampleAssistantMsg = {
    id: 'ast-123456',
    role: 'assistant',
    time: Date.now(),
    status: 'completed',
    content: [
      { type: 'reason', data: { text: '推理过程', startTime: 100, duration: 50 } },
      { type: 'text', data: { text: '这是结果。' } },
      { type: 'tool_call', data: { id: 'call_1', name: 'search', arguments: '{}', status: 'done' } },
      { type: 'crystallize_event', data: { status: 'finished', summary: '记忆压缩完毕' } },
    ],
  }

  await TaskExecutionService.complete(exec1.id, {
    outputChunks: sampleChunks,
    finalAssistantMsg: sampleAssistantMsg,
  })

  const p = prismaManager.getClient()
  const updatedExec1 = await p.taskExecution.findUnique({ where: { id: exec1.id } })
  assert(updatedExec1.status === 'completed', '状态为 completed')
  assert(updatedExec1.finishedAt !== null, 'finishedAt 已设置')

  // 验证 chunks 的 JSON 完整性
  const outputChunks = JSON.parse(updatedExec1.outputChunks)
  assert(Array.isArray(outputChunks), 'outputChunks 是数组')
  assert(outputChunks.length === 4, 'outputChunks 有 4 个元素')
  assert(outputChunks[0].type === 'reason', 'chunk type 保留')
  assert(outputChunks[1].content === '这是结果。', 'chunk content 保留')

  // 验证 finalAssistantMsg
  const finalMsg = JSON.parse(updatedExec1.finalAssistantMsg)
  assert(finalMsg.role === 'assistant', 'finalAssistantMsg role 保留')
  assert(finalMsg.content.length === 4, 'finalAssistantMsg content 完整')

  // ====================================
  // Part 6: fail — 标记失败
  // ====================================
  logger.info('\n[Part 6] fail 标记失败')
  await TaskExecutionService.fail(exec2.id, {
    errorMessage: 'LLM 返回超时',
    outputChunks: [{ type: 'content', content: '部分结果' }],
  })

  const failedExec = await p.taskExecution.findUnique({ where: { id: exec2.id } })
  assert(failedExec.status === 'failed', '状态为 failed')
  assert(failedExec.errorMessage === 'LLM 返回超时', 'errorMessage 正确')
  assert(failedExec.finishedAt !== null, 'finishedAt 已设置')
  const failedChunks = JSON.parse(failedExec.outputChunks)
  assert(failedChunks.length === 1, '失败时也有 outputChunks')

  // ====================================
  // Part 7: findByTaskId — 查询任务的执行记录
  // ====================================
  logger.info('\n[Part 7] findByTaskId')
  const executions = await TaskExecutionService.findByTaskId('test-task-1')
  assert(executions.length === 2, '应有 2 条记录')
  // 按 startedAt desc 排序
  assert(executions[0].id === exec2.id, '最新记录排第一')
  assert(executions[1].id === exec1.id, '旧记录排第二')

  // ====================================
  // Part 8: 不存在的 task
  // ====================================
  logger.info('\n[Part 8] 边界条件')
  const noExec = await TaskExecutionService.findByTaskId('non-exist')
  assert(Array.isArray(noExec) && noExec.length === 0, '不存在的 task 返回空数组')

  const nextRound = await TaskExecutionService.getNextRound('non-exist')
  assert(nextRound === 1, '不存在的 task round = 1')

  // ====================================
  // 清理
  // ====================================
  await cleanup()

  // ====================================
  // 结果汇总
  // ====================================
  logger.info('\n================================')
  const total = passed + failed
  logger.info(`📊 测试完成: ${total} 个用例，${passed} 通过，${failed} 失败`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  logger.error('测试执行异常:', err)
  process.exit(1)
})
