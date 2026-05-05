import cron from 'node-cron'
import logger from '../utils/logger.js'
import TaskRunnerService from './chat/llm/services/TaskRunnerService.js'
import TaskService from './database/services/TaskService.js'

/**
 * 任务调度中心 (TaskScheduler)
 * 管理所有定时任务和单次任务，支持持久化。
 */
class TaskScheduler {
  constructor() {
    this.jobs = new Map() // 运行中的 node-cron 任务 (key: taskId)
    this.timeouts = new Map() // 运行中的延时单次任务 (key: taskId)
    this.isInitialized = false
  }

  /**
   * 初始化调度器：从数据库加载所有 active 状态的任务并启动
   */
  async initialize(llmService) {
    if (this.isInitialized) return
    
    TaskRunnerService.setLLMService(llmService)
    
    try {
      const activeTasks = await TaskService.findActive()
      logger.info(`[TaskScheduler] 正在从数据库初始化 ${activeTasks.length} 个任务...`)
      
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
  }

  /**
   * 外部调用接口：添加或更新任务
   */
  async addAgentTask(taskConfig) {
    // 处理相对时间，例如 "+10m"
    if (typeof taskConfig.cron === 'string' && taskConfig.cron.startsWith('+')) {
      const match = taskConfig.cron.match(/^\+(\d+)([smhd])$/)
      if (match) {
        const num = parseInt(match[1])
        const unit = match[2]
        const msMap = { s: 1000, m: 60000, h: 3600000, d: 86400000 }
        taskConfig.runAt = new Date(Date.now() + num * msMap[unit])
        taskConfig.cron = 'once' // 转化为带时间的单次任务
      }
    }

    // 1. 持久化到数据库
    const task = await TaskService.upsert(taskConfig)
    
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
    const { id, cron: cronExpr, runAt } = task

    // 清理内存中的旧任务
    this.removeTaskFromMemory(id)

    // 1. 如果有指定的运行时间 (runAt)
    if (runAt) {
      const delay = new Date(runAt).getTime() - Date.now()
      if (delay > 0) {
        logger.info(`[TaskScheduler] 任务 "${id}" 已安排在 ${new Date(runAt).toLocaleString()} 执行`)
        const timeout = setTimeout(() => {
          this._runOnce(task)
        }, delay)
        this.timeouts.set(id, timeout)
      } else {
        // 时间已过期但未执行，可能是停机期间错过的
        logger.warn(`[TaskScheduler] 任务 "${id}" 预定时间已过 (${new Date(runAt).toLocaleString()})，立即补执行一次`)
        this._runOnce(task)
      }
      return
    }

    // 2. 立即执行的一次性任务
    if (cronExpr === 'once') {
      this._runOnce(task)
      return
    }

    // 3. 标准 Cron 周期任务
    try {
      const job = cron.schedule(cronExpr, async () => {
        this._executeTask(task)
      })
      this.jobs.set(id, job)
      logger.info(`[TaskScheduler] 任务 "${id}" 已加入周期调度 (${cronExpr})`)
    } catch (error) {
      logger.error(`[TaskScheduler] 任务 "${id}" Cron 语法错误: ${cronExpr}`, error)
    }
  }

  async _runOnce(task) {
    try {
      logger.info(`[TaskScheduler] 开始执行单次任务: ${task.id}`)
      await this._executeTask(task)
      // 执行完后立即删除，不再保留一次性任务
      await TaskService.delete(task.id)
      this.removeTaskFromMemory(task.id)
    } catch (error) {
      logger.error(`[TaskScheduler] 单次任务 "${task.id}" 后处理异常: ${error.message}`)
    }
  }

  async _executeTask(task) {
    const { id, preset, prompt, userId, contactorId, systemPrompt, tools } = task
    try {
      await TaskRunnerService.runTask(preset, prompt, {
        taskId: id,
        userId: userId || null,
        contactorId: contactorId || preset,
        systemPrompt: systemPrompt || null,
        tools: tools ? (typeof tools === 'string' ? JSON.parse(tools) : tools) : null,
        provider: task.provider || null,
        model: task.model || null,
      })
      await TaskService.updateLastRun(id)
    } catch (error) {
      logger.error(`[TaskScheduler] 任务 "${id}" 执行异常: ${error.message}`)
    }
  }

  async removeTask(id) {
    this.removeTaskFromMemory(id)
    try {
      await TaskService.delete(id)
      return true
    } catch {
      return false
    }
  }

  async disableTask(id) {
    this.removeTaskFromMemory(id)
    await TaskService.setStatus(id, 'disabled')
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
  }

  listTasks() {
    return TaskService.findAll()
  }

  bakPics() {
    logger.info('[SystemCron] 执行图片备份...')
  }
}

export default new TaskScheduler()
