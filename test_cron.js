import TaskScheduler from './lib/cron.js'
import TaskService from './lib/database/services/TaskService.js'

async function main() {
  const taskId = 'test-multi-tool'

  // 清理之前的测试
  try { await TaskService.delete(taskId) } catch(e) {}

  // === 完整模拟 cron tool 的调用路径 ===
  const cronParam = '+1m30s'
  
  const result = await TaskScheduler.addAgentTask({
    id: taskId,
    name: '工具路径测试',
    cron: cronParam,
    preset: 'test',
    prompt: '请回复：定时任务测试成功！',
    userId: 'test',
    contactorId: 'test',
    status: 'active',
  })

  console.log('========================================')
  console.log('STEP1: addAgentTask 返回值:')
  console.log('  runAt:', result.runAt)
  console.log('  runAt type:', typeof result.runAt, result.runAt === null ? '❌ NULL' : '✅ ' + new Date(result.runAt).toISOString())
  console.log('  cron:', result.cron)

  // 从 DB 重新读取
  const fromDb = await TaskService.findById(taskId)
  console.log('\nSTEP2: 从数据库读取:')
  console.log('  runAt:', fromDb.runAt)
  console.log('  runAt type:', typeof fromDb.runAt, fromDb.runAt === null ? '❌ NULL' : '✅ ' + new Date(fromDb.runAt).toISOString())
  console.log('  cron:', fromDb.cron)

  // 模拟 _scheduleTask 中的判断
  console.log('\nSTEP3: 调度判断模拟:')
  if (fromDb.runAt) {
    const delay = new Date(fromDb.runAt).getTime() - Date.now()
    console.log('  ✅ runAt 存在, 延迟:', Math.round(delay/1000), '秒')
  } else {
    console.log('  ❌ runAt 为 null! 会走到 cron=once 分支直接执行!')
  }

  // 清理
  await TaskService.delete(taskId)
  console.log('\n✅ 清理完成')
}

main().catch(console.error)
