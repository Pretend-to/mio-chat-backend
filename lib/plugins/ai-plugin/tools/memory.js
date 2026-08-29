import { MioFunction } from '../../../function.js'

import {
  buildXmlFromZones,
  parseXmlZones,
} from '../../../chat/llm/services/CrystallizationUtils.js'

export default class Memory extends MioFunction {
  constructor() {
    super({
      description: [
        '管理个性化记忆与长期事实（支持完整的 CRUD 操作）。包含 local（当前 Agent 个性化记忆结晶）与 global（系统级跨 Agent 全局事实）两个作用域。',
        '【极其严格的作用域准则】：',
        '1. 默认且绝大多数情况下必须使用 scope: "local"（个性化记忆结晶）！',
        '   - 你与用户达成的任何交易纪律、专属约定、债务账本、性格互动、人设偏好、对话事实、短期任务与约束，都必须存入 scope: "local" 的对应 zone 中（如 behavioral_guidelines、long_term_profile 等）。这些是个性化专属记忆，绝不能污染其他 Agent。',
        '2. 严禁自主调用 scope: "global"！',
        '   - 全局记忆（scope: "global"）会直接修改系统级 System Prompt 并永久同步广播给系统中的每一个 AI Agent。',
        '   - 【铁律】：除非用户在本次对话中明确下达了全局存储指令（如：“请存为全局记忆”、“让所有Agent/助手都记住这个”、“全局记录”），否则一律禁止使用 scope: "global"！',
        '3. 记忆存储结构规范：',
        '   - local 作用域：结构化存入 6 个 XML 分区（zone），如 long_term_profile, behavioral_guidelines 等。',
        '   - global 作用域：纯文本事实条目（非 XML 分区），不需要指定 zone，可选 category 分类（默认为 general）。',
      ].join('\n'),
      name: 'memory',
      parameters: {
        properties: {
          scope: {
            default: 'local',
            description: '记忆作用域：local (默认，当前 Agent 专属个性化记忆结晶，涵盖约定/纪律/画像/计划等，与其他 Agent 隔离), global (系统级跨 Agent 全局事实库，仅限用户明确指令要求全局存储时使用)',
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
            description: '仅在 scope 为 global 时有效（注意全局记忆没有 XML 分区，仅为纯文本条目）：分类目录标签，如 general (默认), user_profile, tech_stack 等',
            type: 'string',
          },
          zone: {
            default: 'long_term_profile',
            description: '目标记忆分区（仅在 scope 为 local 结晶时有效）：long_term_profile (用户画像), behavioral_guidelines (行为准则/交易纪律/专属约定), short_term_goals (短期目标), current_plan (运行计划), file_architecture_delta (文件变更), constraints (技术约束)',
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

      // 全局记忆修改会直接影响所有 Agent 的全局 System Prompt，触发二次审批交互（Web 与 渠道 均需确认）
      let actionLabel = '新增'
      if (action === 'update') actionLabel = '更新'
      if (action === 'delete') actionLabel = '删除'

      let promptText = `是否授权将以下内容${actionLabel}至全局长期记忆（分类：${category}）？`
      if (action === 'delete') {
        promptText = `是否授权从全局长期记忆（分类：${category}）中删除条目：`
      } else if (action === 'update') {
        promptText = `是否授权将全局长期记忆（分类：${category}）中的 "${target}" 更新为：`
      }

      const approval = await this.requestUserApproval(e, promptText, {
        action,
        category,
        content: content.trim(),
        scope: 'global',
        target: target ? target.trim() : '',
        type: 'global_memory',
      })

      if (!approval?.approved) {
        const reasonMsg = approval?.reason ? ` 原因: ${approval.reason}` : ''
        return {
          error: `[执行终止] 用户拒绝授权更新全局长期记忆。${reasonMsg}`,
          success: false,
        }
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
