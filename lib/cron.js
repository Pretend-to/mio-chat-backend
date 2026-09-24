import fs from 'fs'
import path from 'path'
import cron from 'node-cron'
import modelRegistryService from './chat/llm/services/ModelRegistryService.js'
import TaskService from './database/services/TaskService.js'
import TaskExecutionService from './database/services/TaskExecutionService.js'
import DatabaseMaintenanceService from './database/services/DatabaseMaintenanceService.js'
import sessions from './server/socket.io/services/sessions.js'
import { getChatEventDispatcher } from './chat/llm/events/ChatEventDispatcher.js'

/**
 * 任务调度中心 (TaskScheduler)
 * 管理所有定时任务和单次任务，支持持久化。
 */
export class TaskScheduler {
  constructor({
    taskService = TaskService,
    taskExecutionService = TaskExecutionService,
    dispatcher = null,
  } = {}) {
    this.jobs = new Map() // 运行中的 node-cron 任务 (key: taskId)
    this.timeouts = new Map() // 运行中的延时单次任务 (key: taskId)
    this.isInitialized = false
    this.channelRuntime = null // 由外部在 initialize() 时注入
    this.taskService = taskService
    this.taskExecutionService = taskExecutionService
    this.dispatcher = dispatcher
    this.removeWorkItemStatusListener = null
    this._subscribeToWorkItemStatus(this.dispatcher || getChatEventDispatcher())
  }

  /**
   * 初始化调度器：从数据库加载所有 active 状态的任务并启动
   */
  async initialize(llmService, channelRuntime = null) {
    if (this.isInitialized) {
      return
    }

    this._subscribeToWorkItemStatus(this.dispatcher || getChatEventDispatcher())
    this.channelRuntime = channelRuntime
    // Task wakeups are queued by ChatEventDispatcher. The LLM service is kept
    // in the bootstrap signature because the scheduler shares this public
    // initialization contract with other runtime services.
    void llmService

    try {
      await this._reconcileTaskExecutionStatuses(
        this.dispatcher || getChatEventDispatcher(),
      )
      const activeTasks = await this.taskService.findActive()
      logger.info(
        `[TaskScheduler] 正在从数据库初始化 ${activeTasks.length} 个任务...`,
      )

      for (const task of activeTasks) {
        this._scheduleTask(task)
      }

      this.isInitialized = true
      logger.info('[TaskScheduler] 初始化完成')
    } catch (error) {
      logger.error('[TaskScheduler] 初始化失败:', error)
    }

    this.initSystemTasks()
  }

  initSystemTasks() {
    cron.schedule('0 3 * * *', () => {
      this.bakPics()
    })
    // 每日凌晨 03:30 执行 SQLite 自动清退、WAL 截断与优化
    cron.schedule('30 3 * * *', async () => {
      try {
        await DatabaseMaintenanceService.runFullMaintenance({
          logRetentionDays: 30,
          taskRetentionDays: 7,
        })
      } catch (err) {
        logger.error('[TaskScheduler] 定时数据库维护失败:', err.message)
      }
    })
    cron.schedule('0 4 * * *', () => {
      modelRegistryService.syncRegistry().catch((err) => {
        logger.warn('[TaskScheduler] 定时同步模型规格数据库失败:', err.message)
      })
    })
    // 服务启动后异步拉取一次最新模型元数据
    setTimeout(() => {
      modelRegistryService.syncRegistry().catch((err) => {
        logger.warn(
          '[TaskScheduler] 初始化同步模型规格数据库失败:',
          err.message,
        )
      })
    }, 5000)
    // 服务启动 15 秒后异步执行一次轻量数据库过期清退
    setTimeout(() => {
      DatabaseMaintenanceService.runFullMaintenance({
        logRetentionDays: 30,
        taskRetentionDays: 7,
      }).catch((err) => {
        logger.warn('[TaskScheduler] 启动数据库维护检查失败:', err.message)
      })
    }, 15000)
    cron.schedule('*/30 * * * *', () => {
      this.cleanupTempFiles()
    })
  }

  /**
   * 外部调用接口：添加或更新任务
   */
  async addAgentTask(taskConfig) {
    // 处理相对时间，要求必须以 "+" 开头，支持多层叠加与小数，例如 "+1h45m"、"+2h30m15s"、"+1.5h"
    if (
      typeof taskConfig.cron === 'string' &&
      taskConfig.cron.startsWith('+')
    ) {
      const relativeRegex = /(\d+(?:\.\d+)?)\s*([smhd])/g
      let pairMatch
      let totalMs = 0
      const msMap = { d: 86400000, h: 3600000, m: 60000, s: 1000 }

      while ((pairMatch = relativeRegex.exec(taskConfig.cron)) !== null) {
        totalMs += parseFloat(pairMatch[1]) * msMap[pairMatch[2]]
      }

      if (totalMs > 0) {
        taskConfig.runAt = new Date(Date.now() + totalMs)
        taskConfig.cron = 'once' // 转化为带时间的单次任务
      }
    }

    // 1. 持久化到数据库
    const task = await this.taskService.upsert(taskConfig)

    // 2. 如果状态是 active，启动/重启调度
    if (task.status === 'active') {
      this._scheduleTask(task)
    } else {
      this.removeTaskFromMemory(task.id)
    }

    return task
  }

  /**
   * 内部方法：根据任务配置决定调度方式
   */
  _scheduleTask(task) {
    const { id, cron: cronExpr } = task
    let { runAt } = task

    // 清理内存中的旧任务
    this.removeTaskFromMemory(id)

    // 1. 如果有指定的运行时间 (runAt)
    if (runAt) {
      const delay = new Date(runAt).getTime() - Date.now()
      if (delay > 0) {
        logger.info(
          `[TaskScheduler] 任务 "${id}" 已安排在 ${new Date(runAt).toLocaleString()} 执行`,
        )
        const timeout = setTimeout(() => {
          this._runOnce(task)
        }, delay)
        this.timeouts.set(id, timeout)
        return
      }

      // RunAt 已过期：如果任务是标准 cron（非 once），说明 runAt 是残留数据
      if (cronExpr && cronExpr !== 'once') {
        logger.warn(
          `[TaskScheduler] 任务 "${id}" runAt 已过期但配置了标准 cron 表达式 (${cronExpr})，清理残留 runAt`,
        )
        runAt = null
        // 异步清理 DB 中的残留 runAt
        this.taskService.upsert({ id, runAt: null }).catch(() => {})
      } else {
        // 真正的 once 任务过期补执行
        logger.warn(
          `[TaskScheduler] 任务 "${id}" 预定时间已过 (${new Date(runAt).toLocaleString()})，立即补执行一次`,
        )
        this._runOnce(task)
        return
      }
    }

    // 2. 立即执行的一次性任务
    if (cronExpr === 'once') {
      this._runOnce(task)
      return
    }

    // 3. 标准 Cron 周期任务
    try {
      const job = cron.schedule(cronExpr, async () => {
        await this._executeTask(task).catch(() => {})
      })
      this.jobs.set(id, job)
      logger.info(`[TaskScheduler] 任务 "${id}" 已加入周期调度 (${cronExpr})`)
    } catch (error) {
      logger.error(
        `[TaskScheduler] 任务 "${id}" Cron 语法错误: ${cronExpr}`,
        error,
      )
    }
  }

  async _runOnce(task) {
    try {
      logger.info(`[TaskScheduler] 开始执行单次任务: ${task.id}`)
      await this._executeTask(task, { wakeKind: 'cron_once' })
      // 执行完后标记为 finished，保留任务记录和执行历史
      await this.taskService.setStatus(task.id, 'finished')
      this.removeTaskFromMemory(task.id)
    } catch (error) {
      // 即使主流程失败，也标记 finished（避免 stuck in running）
      try {
        await this.taskService.setStatus(task.id, 'finished')
      } catch {
        /* Ignore */
      }
      logger.error(
        `[TaskScheduler] 单次任务 "${task.id}" 执行异常: ${error.message}`,
      )
    }
  }

  async _executeTask(
    task,
    { wakeKind = 'cron_natural', principal = null } = {},
  ) {
    const { id, agentId, sessionId, deliveryBindingId, triggerPrompt } = task
    let execution = null
    try {
      // 构建默认 triggerword：时间 + 执行次数 + 自治指令（强制注入到自定义 triggerword 前面）
      const round = await this.taskExecutionService.getNextRound(id)
      const now = new Date().toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
      })
      const defaultTrigger = `[Current Time: ${now}]
[Execution Round: #${round}]

[AUTONOMOUS TASK MODE]
You are currently running as a background scheduled task. The user is NOT available for real-time interaction or confirmation.
STRICT RULE: Do NOT ask for permission or wait for user input. Your goal is to use your available tools to complete the requested task fully and independently in this single session. Once finished, output your final result or report immediately.`

      const finalPrompt = triggerPrompt
        ? `${defaultTrigger}\n\n${triggerPrompt}`
        : defaultTrigger

      execution = await this.taskExecutionService.create({
        agentId,
        deliveryBindingId,
        inputMessages: [{ role: 'user', content: finalPrompt }],
        round,
        sessionId,
        status: 'queued',
        taskId: id,
        triggerPrompt,
      })

      const dispatcher = this.dispatcher || getChatEventDispatcher()
      this._subscribeToWorkItemStatus(dispatcher)
      const resolvedPrincipal = principal || {
        externalUserId: 'scheduled-task-runtime',
        id: `system:scheduled_task:${id}`,
        isAdmin: true,
        role: 'system_admin',
      }
      const receipt = await dispatcher.submitWake({
        agentId,
        sessionId,
        kind: 'scheduler',
        wakeKind,
        originRef: `task_execution:${execution.id}`,
        idempotencyKey: `cron:task_execution:${execution.id}`,
        instruction: `[定时任务触发]\n${finalPrompt}`,
        deliveryMode:
          task.deliveryMode || (deliveryBindingId ? 'channel' : 'default'),
        deliveryBindingId,
        principal: resolvedPrincipal,
      })
      await this.taskExecutionService
        .linkWorkItem?.(execution.id, receipt.workItemId)
        .catch((error) => {
          logger.warn(
            `[TaskScheduler] 关联执行记录 ${execution.id} 与工作项失败:`,
            error.message,
          )
        })
      await this.taskService.updateLastRun(id).catch((error) => {
        logger.warn(
          `[TaskScheduler] 更新任务 "${id}" 最后运行时间失败:`,
          error.message,
        )
      })
      return {
        eventId: receipt.eventId,
        executionId: execution.id,
        status: receipt.status,
        success: true,
        workItemId: receipt.workItemId,
      }
    } catch (error) {
      if (execution)
        await this.taskExecutionService
          .fail(execution.id, {
            errorMessage: error.message,
          })
          .catch(() => {})
      logger.error(`[TaskScheduler] 任务 "${id}" 执行异常: ${error.message}`)
      throw error
    }
  }

  /**
   * 立即执行指定任务（不修改其调度计划）
   * 用于手动触发 / 测试场景
   */
  async runTaskById(id, { agentId, principal = null } = {}) {
    if (!agentId) throw new Error('手动触发任务需要当前 Agent 身份')
    const task = await this.taskService.findById(id)
    if (!task) {
      throw new Error(`任务 "${id}" 不存在`)
    }
    if (task.agentId !== String(agentId)) {
      throw new Error(`任务 "${id}" 不属于当前 Agent`)
    }
    logger.info(`[TaskScheduler] 手动触发任务: ${task.id} (${task.name})`)
    const receipt = await this._executeTask(task, {
      principal,
      wakeKind: 'cron_manual',
    })
    return {
      ...receipt,
      message: `任务 "${task.name || id}" 已排队`,
    }
  }

  _subscribeToWorkItemStatus(dispatcher) {
    if (this.removeWorkItemStatusListener || !dispatcher?.onWorkItemStatus) {
      return
    }
    this.removeWorkItemStatusListener = dispatcher.onWorkItemStatus((event) =>
      this._handleWorkItemStatus(event),
    )
  }

  async _handleWorkItemStatus({ status, workItem } = {}) {
    const match = /^task_execution:(\d+)$/.exec(workItem?.originRef || '')
    if (!match) return
    const executionId = Number(match[1])
    try {
      if (status === 'running' || status === 'absorbed') {
        await this.taskExecutionService.markRunning(executionId)
      } else if (status === 'completed') {
        await this.taskExecutionService.complete(executionId)
      } else if (status === 'failed') {
        await this.taskExecutionService.fail(executionId, {
          errorMessage: workItem.lastError || 'Scheduled work failed',
        })
      } else if (
        status === 'accepted' ||
        status === 'queued' ||
        status === 'deferred'
      ) {
        await this.taskExecutionService.updateStatus(executionId, 'queued')
      } else if (status === 'needs_attention') {
        await this.taskExecutionService.updateStatus(
          executionId,
          'needs_attention',
        )
      }
    } catch (error) {
      logger.error(
        `[TaskScheduler] 更新执行记录 ${executionId} 状态失败:`,
        error.message,
      )
    }
  }

  async _reconcileTaskExecutionStatuses(dispatcher) {
    if (
      !this.taskExecutionService.findPendingWorkItems ||
      !dispatcher?.getWorkItem
    ) {
      return 0
    }
    const executions = await this.taskExecutionService.findPendingWorkItems()
    let reconciled = 0
    for (const execution of executions) {
      try {
        const workItem = await dispatcher.getWorkItem(
          execution.sessionWorkItemId,
        )
        if (!workItem) continue
        await this._handleWorkItemStatus({
          status: workItem.status,
          workItem,
        })
        reconciled += 1
      } catch (error) {
        logger.warn(
          `[TaskScheduler] 对账执行记录 ${execution.id} 失败:`,
          error.message,
        )
      }
    }
    return reconciled
  }

  async removeTask(id) {
    this.removeTaskFromMemory(id)
    try {
      await this.taskService.delete(id)
      return true
    } catch {
      return false
    }
  }

  async disableTask(id) {
    this.removeTaskFromMemory(id)
    await this.taskService.setStatus(id, 'disabled')
  }

  async stopTasksByAgent(agentId) {
    const tasks = await this.taskService.findAll({ agentId })
    for (const task of tasks) this.removeTaskFromMemory(task.id)
  }

  removeTaskFromMemory(id) {
    // 停止 Cron 任务
    if (this.jobs.has(id)) {
      this.jobs.get(id).stop()
      this.jobs.delete(id)
    }
    // 停止延时任务
    if (this.timeouts.has(id)) {
      clearTimeout(this.timeouts.get(id))
      this.timeouts.delete(id)
    }

    // 同样触发 abort：如果该任务当前正在后台执行，立刻终止其大模型请求并保存当前已生成的内容入库
    try {
      const allClients = sessions.getAllClients()
      if (allClients) {
        const taskClients = allClients.filter((c) => c && c._taskId === id)
        for (const client of taskClients) {
          if (client.activeEvents) {
            for (const reqId of client.activeEvents.keys()) {
              logger.info(
                `[TaskScheduler] 任务 "${id}" 被停止，触发 VirtualClient 中断信号: ${reqId}`,
              )
              client.abortConnection(reqId)
            }
          }
        }
      }
    } catch (error) {
      logger.error(
        `[TaskScheduler] 终止运行中的任务 "${id}" 失败:`,
        error.message,
      )
    }
  }

  listTasks() {
    return this.taskService.findAll()
  }

  bakPics() {
    logger.info('[SystemCron] 执行图片备份...')
  }

  /**
   * 清理 /tmp 下过期的工具结果文件 (mio-tool-*.txt)
   * TTL: 1 小时
   */
  cleanupTempFiles() {
    const TMP_DIR = '/tmp'
    const TTL = 3_600_000 // 1 hour
    const now = Date.now()

    try {
      const files = fs.readdirSync(TMP_DIR)
      let cleaned = 0
      for (const file of files) {
        if (!file.startsWith('mio-tool-') || !file.endsWith('.txt')) {
          continue
        }
        const filePath = path.join(TMP_DIR, file)
        try {
          const stat = fs.statSync(filePath)
          if (now - stat.mtimeMs > TTL) {
            fs.unlinkSync(filePath)
            cleaned++
          }
        } catch {
          // 单个文件操作失败不影响整体
        }
      }
      if (cleaned > 0) {
        logger.info(`[SystemCron] 清理 ${cleaned} 个过期工具结果文件`)
      }
    } catch (error) {
      logger.error('[SystemCron] 清理临时文件失败:', error.message)
    }
  }
}

export default new TaskScheduler()
