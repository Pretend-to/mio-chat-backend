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
      name: 'cron',
      description:
        '管理 Agent 自动化任务。支持 Cron 周期任务或 "once" 一次性任务。系统会自动锁定当前 Agent 的身份、工具和权限。\n支持设置自定义 systemPrompt，将领域知识固化到系统层（而不是每轮重复塞进 user 消息）。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'add', 'update', 'remove', 'disable', 'enable', 'run'],
            description:
              '操作类型。list=列出所有任务; add=新建任务; update=新建或覆写已有任务（幂等）; remove=彻底删除; disable=暂停但不删除; enable=重新启用已禁用的任务; run=立即执行指定任务（不改调度计划，适合测试）',
          },
          taskId: {
            type: 'string',
            description:
              '任务唯一标识符，用于增删改查。命名规则：仅含小写字母、数字和短横线，如 "daily-report"。add/update/remove/disable/enable 均依赖此 ID。',
          },
          taskName: {
            type: 'string',
            description:
              '任务友好名称，如 "每日工作总结"。可选，不传则自动回退为 taskId 的值。',
          },
          cron: {
            type: 'string',
            description:
              '执行频率或时间。支持三种写法：1) 标准Cron表达式 (如 0 9 * * * 表示每天早上9点); 2) 相对时间 (如 +1h45m / +10m / +1.5h，必须以 + 开头，可多层叠加); 3) "once" (立即执行一次)。',
          },
          taskPrompt: {
            type: 'string',
            description:
              '任务触发时注入给 Agent 的执行指令（即 user 消息的完整内容）。\n⚠️ 重要：Agent 会在后台自主执行，无法与你实时对话或征求你的同意——不要在 prompt 里写「问我是否需要」「让我确认」之类需要交互的指令。你需要一次性把目标、步骤、边界条件说清楚。\n如果任务需要调用 shell 命令，请确保同时在 shWhitelist 中添加允许的命令名。\n💡 最佳实践：如果你设置了 systemPrompt（将领域知识固化到系统层），这里只需要写「已到执行时间，开始运行」这样简洁的触发指令即可，让 Agent 从 history 和 system 中获取上下文。',
          },
          systemPrompt: {
            type: 'string',
            description:
              '自定义系统提示词。设置后将作为任务的 system prompt，取代默认的 "You are a professional AI assistant"。\n💡 使用场景：把任务需要的领域知识（API 文档、规则、技术参考）直接固化到系统层。这样第一轮执行时 system 消息就包含完整知识，后续轮次 history 中已有的 system 消息不会被覆盖。配合精简的 taskPrompt 使用效果最佳。\n注意：与 inheritPersona 的关系——如果同时设置了 systemPrompt 和 inheritPersona=true，则 systemPrompt 优先级更高，覆盖继承的人格。',
          },
          inheritPersona: {
            type: 'boolean',
            description:
              '是否继承当前对话的完整人格设定。默认 false。\ntrue = 携带当前 system prompt + 当前所有可用工具执行任务（适合需要延续人格特征的场景）\nfalse = 使用默认 system prompt（"You are a professional AI assistant"），仅能使用 allowedTools 中指定的工具',
          },
          allowedTools: {
            type: 'array',
            items: { type: 'string' },
            description:
              '允许任务使用的工具函数名列表（如 ["sh_mid_0e2cda", "parse_mid_8c8c4a"]）。仅在 inheritPersona 为 false 时生效。\n注意：这里填的是工具的函数 ID（可在工具描述中查看），不是 Skill 名称。如果 inheritPersona 为 true，此参数无效，agent 将拥有当前对话的所有工具。',
          },
          shWhitelist: {
            type: 'string',
            description:
              '后台 shell 命令白名单。多个命令用逗号分隔，如 "curl,cat,node"。\n⚠️ 重要：任务若需执行 shell 命令（sh_mid_0e2cda / pty_sh_mid_533fa3），必须在此白名单中列出命令名（不含路径和参数）。未在白名单中的命令会在后台被安全拦截并拒绝执行。\n注意：仅当 inheritPersona 为 true 且当前对话拥有 sh/pty_sh 工具时，或在 allowedTools 中显式添加了终端工具时，此白名单才有效。',
          },
        },
        required: ['action'],
      },
      adminOnly: true,
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const { action, taskId, taskName, cron, taskPrompt, systemPrompt, shWhitelist } = e.params

    switch (action) {
      case 'list': {
        const tasks = await TaskService.findAll()
        const summary = tasks.map(t => ({
          id: t.id,
          name: t.name,
          status: t.status,
          cron: t.cron,
          preset: t.preset,
          lastRunAt: t.lastRunAt,
          createdAt: t.createdAt,
        }))
        return {
          success: true,
          tasks: summary,
          message: `系统中共有 ${tasks.length} 个任务记录`,
        }
      }

      case 'add':
      case 'update': {
        if (!taskId) throw new Error('操作需要 taskId')
        const { inheritPersona = false } = e.params

        // --- 核心修复：自动提取环境信息，支持多种协议格式 ---
        const userId = e.user.id
        // 兼容处理：有些协议把 ID 放 metaData，有些放 body 顶层
        const contactorId = String(e.metaData?.contactorId || e.body?.contactorId)
        const presetName = contactorId 
        
        if (!presetName) {
          logger.warn(`[TaskTool] 无法从上下文提取 ContactorId. metaData: ${JSON.stringify(e.metaData)}, bodyKeys: ${Object.keys(e.body || {})}`)
          throw new Error('无法确定当前 Agent 预设，请确保在 Agent 对话窗内使用此工具')
        }

        // 确定 systemPrompt：AI 显式传入 > inheritPersona 继承 > 默认 null（回退到 "You are a professional AI assistant"）
        let finalSystemPrompt = systemPrompt || null
        let tools = null
        let provider = null
        let model = null

        if (e.body) {
          const settings = e.body.settings || {}
          provider = settings.provider
          model = settings.base?.model

          if (inheritPersona) {
            // 1. 继承人格：直接从预设历史中获取（纯净的人格定义，还没被注入 skills）
            // 但如果 AI 显式传了 systemPrompt，保持显式传入的优先级
            if (!finalSystemPrompt) {
              const history = settings.presetSettings?.history || []
              const sysMsg = history.find(m => (m.role === 'system' || m.role === 'developer'))
              if (sysMsg) {
                finalSystemPrompt = sysMsg.content
              }
            }
            
            // 2. 继承所有工具
            tools = settings.toolCallSettings?.tools || []
          } else {
            // 3. 不继承人格：使用指定的工具列表
            tools = e.params.allowedTools || []
          }
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
          systemPrompt: finalSystemPrompt,
          tools,
          provider,
          model,
          userId,
          contactorId,
          shWhitelist,
          status: action === 'add' ? 'active' : undefined,
        })

        return {
          success: true,
          message: `任务 "${taskId}" 已成功处理。执行身份：${presetName}，执行频率：${cron}。`,
          task,
        }
      }

      case 'run': {
        if (!taskId) throw new Error('需要 taskId')
        const result = await TaskScheduler.runTaskById(taskId)
        return result
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
