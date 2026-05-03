import { MioFunction } from '../../../function.js'
import TaskScheduler from '../../../cron.js'
import TaskService from '../../../database/services/TaskService.js'

/**
 * 定时任务管理工具 (Task Manager)
 *
 * 核心逻辑：
 * - AI 仅需提供：任务指令 (taskPrompt)、执行时间 (cron)、任务名称 (taskName) 和 ID (taskId)。
 * - 自动从当前上下文中提取：userId, contactorId (即 PresetName), systemPrompt 和 tools。
 */
export default class ManageScheduledTasks extends MioFunction {
  constructor() {
    super({
      name: 'manage_scheduled_tasks',
      description:
        '管理 Agent 自动化任务。支持 Cron 周期任务或 "once" 一次性任务。系统会自动锁定当前 Agent 的身份和权限。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'add', 'update', 'remove', 'disable', 'enable'],
            description: '操作类型',
          },
          taskId: {
            type: 'string',
            description: '任务唯一标识符（ID），如 "daily-report"',
          },
          taskName: {
            type: 'string',
            description: '任务友好名称，如 "每日工作总结"',
          },
          cron: {
            type: 'string',
            description:
              '执行频率或时间。支持：Cron (0 9 * * *)、相对时间 (+10m, +1h) 或 "once" (立即执行)',
          },
          taskPrompt: {
            type: 'string',
            description: '要求 Agent 在任务触发时执行的具体指令',
          },
        },
        required: ['action'],
      },
      adminOnly: true,
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const { action, taskId, taskName, cron, taskPrompt } = e.params

    switch (action) {
      case 'list': {
        const tasks = await TaskService.findAll()
        return {
          success: true,
          tasks,
          message: `系统中共有 ${tasks.length} 个任务记录`,
        }
      }

      case 'add':
      case 'update': {
        if (!taskId) throw new Error('操作需要 taskId')

        // --- 核心修复：自动提取环境信息，支持多种协议格式 ---
        const userId = e.user.id
        // 兼容处理：有些协议把 ID 放 metaData，有些放 body 顶层
        const contactorId = String(e.metaData?.contactorId || e.body?.contactorId)
        const presetName = contactorId 
        
        if (!presetName) {
          logger.warn(`[TaskTool] 无法从上下文提取 ContactorId. metaData: ${JSON.stringify(e.metaData)}, bodyKeys: ${Object.keys(e.body || {})}`)
          throw new Error('无法确定当前 Agent 预设，请确保在 Agent 对话窗内使用此工具')
        }

        let systemPrompt = null
        let tools = null
        let provider = null
        let model = null

        if (e.body) {
          // 1. 提取脱敏后的 SystemPrompt
          const sysMsg = e.body.messages.find((m) => m.role === 'system')
          if (sysMsg) {
            systemPrompt = sysMsg.content
              .replace(/<skill_registry>[\s\S]*?<\/skill_registry>/g, '')
              .trim()
          }

          // 2. 提取当前环境快照
          const settings = e.body.settings || {}
          tools = settings.toolCallSettings?.tools || []
          provider = settings.provider
          model = settings.base?.model
        }

        if (action === 'add' && (!cron || !taskPrompt)) {
          throw new Error('创建任务需要 taskId, cron 和 taskPrompt')
        }

        const task = await TaskScheduler.addAgentTask({
          id: taskId,
          name: taskName || taskId,
          cron,
          preset: presetName,
          prompt: taskPrompt,
          systemPrompt,
          tools,
          provider,
          model,
          userId,
          contactorId,
          status: action === 'add' ? 'active' : undefined,
        })

        return {
          success: true,
          message: `任务 "${taskId}" 已成功处理。执行身份：${presetName}，执行频率：${cron}。`,
          task,
        }
      }

      case 'disable': {
        if (!taskId) throw new Error('需要 taskId')
        await TaskScheduler.disableTask(taskId)
        return { success: true, message: `任务 "${taskId}" 已禁用` }
      }

      case 'enable': {
        const task = await TaskService.findById(taskId)
        if (!task) throw new Error('任务不存在')
        await TaskScheduler.addAgentTask({ ...task, status: 'active' })
        return { success: true, message: `任务 "${taskId}" 已重新启用` }
      }

      case 'remove': {
        if (!taskId) throw new Error('需要 taskId')
        const removed = await TaskScheduler.removeTask(taskId)
        return {
          success: removed,
          message: removed
            ? `任务 "${taskId}" 已删除`
            : `找不到任务 "${taskId}"`,
        }
      }

      default:
        throw new Error(`不支持的操作: ${action}`)
    }
  }
}
