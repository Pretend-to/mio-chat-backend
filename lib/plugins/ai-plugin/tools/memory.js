import { MioFunction } from '../../../function.js'

import { buildXmlFromZones } from '../../../chat/llm/services/CrystallizationUtils.js'
import {
  applyEdit,
  resolveMirror,
} from '../../../chat/llm/services/MemoryMirror.js'

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
          logger.error(`[Memory Tool] 写入全局长期记忆失败:`, err)
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

    // 镜像 = replay(结晶, 编辑事件)，这是唯一的读写对象。
    // 真结晶只在压缩时由压缩流程机械回写，这里永不写它（写了就击穿 prompt cache）。
    // 缺来源时 resolveMirror 会抛 memory_mirror_missing ——【宁可报错，也不要从空 base
    // 重建整份文档把其余分区抹掉】（2026-09-24 事故）。
    const mirror = resolveMirror(settings)
    const zones = { ...mirror.zones }

    // 执行对应的 CRUD 操作
    if (action === 'read') {
      return {
        action,
        message: '读取记忆结晶成功',
        success: true,
        summary: buildXmlFromZones(zones),
        zone,
        zones,
      }
    }

    if (action === 'add' || action === 'update') {
      if (!content || !content.trim()) {
        throw new Error(`${action} 操作必须提供 content 内容`)
      }
    }
    if (action === 'delete' && !(target && target.trim())) {
      throw new Error('delete 操作必须提供 target 参数用于筛选删除')
    }
    // 只动目标分区。与 replayEvents 共用同一份实现（MemoryMirror.applyEdit），
    // 保证「写进去的」与「重放出来的」永远是同一个结果。
    applyEdit(zones, { action, content, target, zone })

    // “同一轮内的连续编辑能看见彼此”由【事件缓冲】保证：每次编辑都追加一条事件，
    // 下一句话就把它重放进来。不再需要 pending_memory_preview 这种派生缓存
    // —— 它只写不读，是第二份真源，删掉。
    const newSummary = buildXmlFromZones(zones)

    const memoryStore = e.channel?.memory || e.memory
    const sessionId = e.sessionId || e.body?.sessionId || e.channel?.activeJobs?.keys()?.next()?.value
    const pendingEvent = { action, content, target, zone }

    // 事件数组是镜像的权威载体：**无论有没有持久存储都要累加**。
    // 旧实现只在“能落库”时才写它，于是同一轮内的连续编辑会互相看不见
    // （第二次编辑的 base 里没有第一次的结果）。
    if (body.settings) {
      const pendingEvents = Array.isArray(body.settings.pending_memory_events)
        ? body.settings.pending_memory_events
        : []
      body.settings.pending_memory_events = [...pendingEvents, pendingEvent]
    }

    // 契约：存储必须实现 appendPendingMemory（当前唯一实现是 DatabaseMemoryStore）。
    // 不写兼容分支 —— 不符合契约就报错，不猜它想干什么。
    // 编辑只能落成事件，绝不直写真结晶（写了就击穿 prompt cache）。
    if (memoryStore) {
      if (typeof memoryStore.appendPendingMemory !== 'function') {
        throw new Error(
          '[memory] 存储未实现 appendPendingMemory，违反镜像契约：编辑只能落成事件，不得直写真结晶',
        )
      }
      if (!sessionId) {
        throw new Error('[memory] 缺少 sessionId：记忆写入必须能归属到一个 session')
      }
      await memoryStore.appendPendingMemory(sessionId, pendingEvent)
    }

    return {
      action,
      answer: params.answer || content || `执行记忆整理`,
      // 前端靠这个返回值更新自己的镜像（把 event 追加进 pendingMemoryEvents）。
      // summary 是更新后的整份镜像文档，供调用方核对。
      event: pendingEvent,
      message: `记忆 ${action} 操作成功`,
      question: params.question || `结晶更新:${zone}`,
      success: true,
      summary: newSummary,
      zone,
    }
  }
}
