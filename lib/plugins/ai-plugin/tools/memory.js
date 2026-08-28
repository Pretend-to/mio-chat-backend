import { MioFunction } from '../../../function.js'

import {
  buildXmlFromZones,
  parseXmlZones,
} from '../../../chat/llm/services/CrystallizationUtils.js'

export default class Memory extends MioFunction {
  constructor() {
    super({
      description: [
        '管理记忆与事实（支持完整的 CRUD 操作）。支持 local（当前会话短期结晶）与 global（全局跨会话长期事实）两个作用域。',
        '【行为准则与防污染要求】：',
        '- 严禁滥用 global 作用域！全局记忆（scope: "global"）会被所有会话和所有 Agent 共享并永久加载，仅限记录全局通用的长期恒定事实（如用户真实姓名/称谓、固定编程偏好、全局环境变量等）。',
        '- 严禁将单次会话的具体任务、临时步骤、临时文件路径、代码片段或短期问答存入 global！',
        '- 当前对话的任务进展、短期计划与会话约束，请一律使用 scope: "local" 存入会话结晶。',
      ].join('\n'),
      name: 'memory',
      parameters: {
        properties: {
          scope: {
            default: 'local',
            description: '记忆作用域：local (当前会话短期结晶，推荐用于任务/计划/文件等), global (全局跨会话长期事实库，谨慎使用，严禁存入临时任务)',
            enum: ['local', 'global'],
            type: 'string',
          },
          action: {
            default: 'add',
            description: '操作类型：add (新增记忆事实), delete (删除记忆，target 支持 ID 如 mem_xxx 或匹配文本), update (更新记忆，target 指定要替换的 ID 或旧内容), read (读取当前记忆)',
            enum: ['add', 'delete', 'update', 'read'],
            type: 'string',
          },
          answer: {
            description: '传统问答模式（仅用于兼容性）：对应的回答或需要记住的信息',
            type: 'string',
          },
          content: {
            description: '对于 add 和 update：要记录或写入的新事实内容',
            type: 'string',
          },
          question: {
            description: '传统问答模式（仅用于兼容性）：需要记忆的问题或情境',
            type: 'string',
          },
          target: {
            description: '对于 delete 和 update：需要删除或被替换的目标记忆 ID（如 mem_xxx）或关键字/旧内容',
            type: 'string',
          },
          category: {
            default: 'general',
            description: '仅在 scope 为 global 时有效：记忆分类标签，如 user_profile, tech_stack, project_fact, general',
            type: 'string',
          },
          zone: {
            default: 'long_term_profile',
            description: '目标记忆分区（仅在 scope 为 local 结晶时有效）：long_term_profile (用户画像), behavioral_guidelines (行为准则/偏好规范), short_term_goals (短期目标), current_plan (运行计划), file_architecture_delta (文件变更), constraints (技术约束)',
            enum: ['long_term_profile', 'behavioral_guidelines', 'short_term_goals', 'current_plan', 'file_architecture_delta', 'constraints'],
            type: 'string',
          },
        },
        type: 'object',
      },
    })
    this.func = this.recordMemory
  }

  async recordMemory(e) {
    const params = e.params || {}
    const body = e.body || {}
    const settings = body.settings || {}

    const scope = params.scope || 'local'
    let action = params.action || 'add'
    let content = params.content || ''
    const target = params.target || ''
    const category = params.category || 'general'

    // ==================== 全局长期记忆 (scope: 'global') ====================
    if (scope === 'global') {
      if (action === 'add' && (!content || !content.trim())) {
        throw new Error('全局记忆 add 操作必须提供 content 内容')
      }
      if ((action === 'delete' || action === 'update') && !target && !content) {
        throw new Error(`全局记忆 ${action} 操作必须提供 target 参数（记忆 ID 或匹配内容）`)
      }

      const memoryStore = e.channel?.memory || e.memory
      if (memoryStore) {
        try {
          if (action === 'add') {
            await memoryStore.addGlobal(category, content.trim())
          } else if (action === 'update') {
            await memoryStore.updateGlobal(category, target ? target.trim() : '', content.trim())
          } else if (action === 'delete') {
            await memoryStore.deleteGlobal(category, target ? target.trim() : content.trim())
          }
        } catch (err) {
          logger.error(`[Memory Tool] 写入全局长期记忆到 MemoryStore 失败:`, err)
        }
      }

      return {
        action,
        category,
        content: content.trim(),
        message: `全局长期记忆 [${action}] 执行成功，已由客户端全局持久化`,
        scope: 'global',
        success: true,
        target: target ? target.trim() : '',
      }
    }

    // ==================== 本地会话结晶 (scope: 'local') ====================
    const watermark = settings.crystallization_token_watermark
    // 'auto' 表示按模型规格动态计算 80% 水位线（与 base.js _checkAndCrystallize 语义一致），
    // 显式 -1/0 仍视为关闭结晶
    const hasCrystallization =
      watermark === 'auto' ||
      (typeof watermark === 'number' && watermark > 0)

    // 1. 如果未开启结晶功能，且提供了传统问答参数，使用传统模式优雅降级。否则抛出结晶专属错误。
    if (!hasCrystallization) {
      if (params.question && params.answer) {
        logger.info('[Memory Tool] 未开启结晶功能，使用传统问答记忆兼容模式')
        return {
          action: 'add',
          answer: params.answer.trim(),
          message: '记忆成功',
          question: params.question.trim(),
          scope: 'local',
          success: true,
        }
      }
      throw new Error('本地会话记忆结晶工具仅在开启结晶功能时可用（crystallization_token_watermark 需为 auto 或大于 0）！若要记录跨会话通用事实，可使用 scope: "global"')
    }

    // 2. 开启结晶时的双模处理 (支持新版 CRUD 协议，同时完美兼容传统 Q&A 参数)
    let zone = params.zone || 'long_term_profile'

    // 如果是通过传统参数调用的，自动映射到 long_term_profile 追加操作
    if (params.question && params.answer) {
      action = 'add'
      zone = 'long_term_profile'
      content = `Q: ${params.question.trim()}\nA: ${params.answer.trim()}`
    }

    const previousSummary = settings.previous_summary || ''
    // 解析当前 XML 记忆结晶
    const zones = parseXmlZones(previousSummary)

    // 执行对应的 CRUD 操作
    if (action === 'read') {
      return {
        action,
        message: '读取记忆结晶成功',
        success: true,
        summary: previousSummary,
        zone,
        zones,
      }
    }

    if (action === 'add') {
      if (!content || !content.trim()) {
        throw new Error('add 操作必须提供 content 内容')
      }
      const existing = zones[zone] || ''
      zones[zone] = existing ? `${existing}\n${content.trim()}` : content.trim()
    } else if (action === 'delete') {
      if (!target || !target.trim()) {
        throw new Error('delete 操作必须提供 target 参数用于筛选删除')
      }
      const existing = zones[zone] || ''
      const lines = existing.split('\n')
      // 过滤掉包含 target 关键字的行
      const filtered = lines.filter(line => !line.includes(target.trim()))
      zones[zone] = filtered.join('\n')
    } else if (action === 'update') {
      if (!content || !content.trim()) {
        throw new Error('update 操作必须提供 content 内容')
      }
      const existing = zones[zone] || ''
      if (target && target.trim()) {
        if (existing.includes(target.trim())) {
          zones[zone] = existing.replace(target.trim(), content.trim())
        } else {
          // 找不到匹配目标，则 fallback 自动追加
          zones[zone] = existing ? `${existing}\n${content.trim()}` : content.trim()
        }
      } else {
        // 未提供 target，直接整体覆写该分区！
        zones[zone] = content.trim()
      }
    }

    // 重组为最新的 XML，并写回当前 event 的 context，保证在后续/压缩步骤即刻生效
    const newSummary = buildXmlFromZones(zones)
    if (body.settings) {
      body.settings.previous_summary = newSummary
    }

    const memoryStore = e.channel?.memory || e.memory
    if (memoryStore && typeof memoryStore.setCrystal === 'function') {
      const sessionId = e.sessionId || e.body?.sessionId || e.channel?.activeJobs?.keys()?.next()?.value
      if (sessionId) {
        memoryStore.setCrystal(sessionId, newSummary).catch(err => {
          logger.error(`[Memory Tool] 持久化会话结晶失败:`, err)
        })
      }
    }

    return {
      action,
      answer: params.answer || content || `执行记忆整理`,
      message: `记忆 ${action} 操作成功`,
      question: params.question || `结晶更新:${zone}`,
      success: true,
      summary: newSummary,
      zone,
    }
  }
}
