import { MioFunction } from '../../../function.js'
import TaskScheduler from '../../../cron.js'
import TaskService from '../../../database/services/TaskService.js'

/**
 * 定时任务管理工具 (Task Manager)
 *
 * 核心逻辑：
 * - AI 仅需提供：任务指令 (taskPrompt)、执行时间 (cron) 和 ID (taskId)。
 * - 自动从当前上下文中提取：userId, contactorId (即 PresetName) 和 tools。
 * - 支持显式传入 systemPrompt 固化领域知识到系统层，第一轮写入后常驻 history。
 * - 支持 inheritPersona 继承当前对话的人格与工具集（被显式 systemPrompt 覆盖时除外）。
 */
export default class ManageScheduledTasks extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description:
        '管理定时与周期自动化任务。支持标准 Cron 表达式（如 "0 8 * * *"）、相对延时（如 "+1h30m"）或 "once" 单次任务。\n' +
        '任务与当前渠道会话深度绑定，自动沿用当前会话的所有配置、模型、记忆与自治工具。',
      name: 'cron',
      parameters: {
        properties: {
          action: {
            description:
              '操作类型。list=列出所有任务; add=新建任务; update=新建或覆写已有任务; remove=彻底删除; disable=暂停; enable=重新启用; run=立即测试执行指定任务',
            enum: [
              'list',
              'add',
              'update',
              'remove',
              'disable',
              'enable',
              'run',
            ],
            type: 'string',
          },
          cron: {
            description:
              '执行时间规则。支持：1) 标准Cron表达式 (如 "0 8 * * *" 每天8点); 2) 相对时间 (如 "+1h", "+30m", "+2h15m"); 3) "once" (立即执行一次)。',
            type: 'string',
          },
          taskId: {
            description:
              '任务唯一标识符（必填，仅含小写字母、数字和短横线，如 "morning-water"）。add/update/remove/run 均依赖此 ID。',
            type: 'string',
          },
          taskName: {
            description:
              '任务友好显示名称（可选，如 "早晨喝水提醒"），不传默认使用 taskId。',
            type: 'string',
          },
          triggerPrompt: {
            description:
              '任务触发时下发给 Agent 的具体执行指令（如 "早上好，提醒用户喝温水，并播报今日天气"）。',
            type: 'string',
          },
        },
        required: ['action'],
        type: 'object',
      },
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const { action, taskId, taskName, cron, triggerPrompt } = e.params

    switch (action) {
      case 'list': {
        const tasks = await TaskService.findAll()
        const summary = tasks.map((t) => ({
          createdAt: t.createdAt,
          cron: t.cron,
          id: t.id,
          lastRunAt: t.lastRunAt,
          name: t.name,
          preset: t.preset,
          status: t.status,
        }))
        return {
          message: `系统中共有 ${tasks.length} 个任务记录`,
          success: true,
          tasks: summary,
        }
      }

      case 'add':
      case 'update': {
        if (!taskId) {
          throw new Error('操作需要 taskId')
        }

        // 自动绑定当前渠道 agentId / contactorId，无条件继承当前宿主会话
        const userId = e.user?.id || 'admin'
        const contactorId = String(
          e.channel?.agentId ||
            e.channel?.id ||
            e.metaData?.contactorId ||
            e.body?.contactorId ||
            'wechat-master',
        )
        const presetName = contactorId

        if (action === 'add' && !cron) {
          throw new Error('创建任务需要 taskId 和 cron')
        }

        // Update 时如果没传 cron，保留原有值
        let finalCron = cron
        if (action === 'update' && !finalCron) {
          const existing = await TaskService.findById(taskId)
          if (existing) {
            finalCron = existing.cron
          }
        }

        const task = await TaskScheduler.addAgentTask({
          contactorId,
          cron: finalCron,
          id: taskId,
          model: null,
          name: taskName || taskId,
          preset: presetName,
          provider: null,
          status: action === 'add' ? 'active' : undefined,
          systemPrompt: null,
          tools: null,
          triggerPrompt: triggerPrompt,
          userId,
        })

        // 过滤掉运行历史，避免占用大量上下文
        delete task.history

        let extraNotice = ''
        if (
          finalCron === 'once' ||
          (typeof cron === 'string' && cron.startsWith('+'))
        ) {
          extraNotice =
            ' ⚠️【重要】：该任务已经在后台独立调度与运行中，请直接向用户反馈任务已成功安排，绝对无需在当前对话中重复执行任务内容！'
        }

        const cronNoticeText = `⏰ [定时任务已设定] ${taskName || taskId}\n⏱️ 执行规则: ${finalCron}${triggerPrompt ? `\n📝 任务指令: ${triggerPrompt}` : ''}`

        return {
          extraRender: [
            {
              content: cronNoticeText,
              placement: 'outer',
              text: cronNoticeText,
              type: 'text',
            },
          ],
          message: `任务 "${taskId}" 已成功处理。执行身份：${presetName}，执行规则：${finalCron}。${extraNotice}`,
          success: true,
          task,
        }
      }

      case 'run': {
        if (!taskId) {
          throw new Error('需要 taskId')
        }
        const result = await TaskScheduler.runTaskById(taskId)
        const runNotice = `🚀 [定时任务已触发执行] ${taskId}`
        return {
          ...result,
          extraRender: [
            {
              content: runNotice,
              placement: 'outer',
              text: runNotice,
              type: 'text',
            },
          ],
        }
      }

      case 'disable': {
        if (!taskId) {
          throw new Error('需要 taskId')
        }
        await TaskScheduler.disableTask(taskId)
        const disableNotice = `⏸️ [定时任务已暂停] ${taskId}`
        return {
          extraRender: [
            {
              content: disableNotice,
              placement: 'outer',
              text: disableNotice,
              type: 'text',
            },
          ],
          message: `任务 "${taskId}" 已禁用`,
          success: true,
        }
      }

      case 'enable': {
        const task = await TaskService.findById(taskId)
        if (!task) {
          throw new Error('任务不存在')
        }
        await TaskScheduler.addAgentTask({ ...task, status: 'active' })
        const enableNotice = `▶️ [定时任务已重新启用] ${taskId}`
        return {
          extraRender: [
            {
              content: enableNotice,
              placement: 'outer',
              text: enableNotice,
              type: 'text',
            },
          ],
          message: `任务 "${taskId}" 已重新启用`,
          success: true,
        }
      }

      case 'remove': {
        if (!taskId) {
          throw new Error('需要 taskId')
        }
        try {
          await TaskScheduler.removeTask(taskId)
          const removeNotice = `🗑️ [定时任务已删除] ${taskId}`
          return {
            extraRender: [
              {
                content: removeNotice,
                placement: 'outer',
                text: removeNotice,
                type: 'text',
              },
            ],
            message: `任务 "${taskId}" 及其相关执行记录已成功删除`,
            success: true,
          }
        } catch (error) {
          return {
            message: `删除任务失败: ${error.message}`,
            success: false,
          }
        }
      }

      default: {
        throw new Error(`不支持的操作: ${action}`)
      }
    }
  }
}
