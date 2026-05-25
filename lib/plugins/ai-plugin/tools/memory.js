import { MioFunction } from '../../../function.js'

const CRYSTAL_TAGS = [
  'long_term_profile',
  'short_term_goals',
  'current_plan',
  'file_architecture_delta',
  'constraints',
]

function parseXmlZones(xmlStr) {
  const result = {}
  CRYSTAL_TAGS.forEach(key => {
    const openTag = `<${key}>`
    const closeTag = `</${key}>`
    const startIdx = xmlStr ? xmlStr.indexOf(openTag) : -1
    const endIdx = xmlStr ? xmlStr.indexOf(closeTag) : -1
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      result[key] = xmlStr.slice(startIdx + openTag.length, endIdx).trim()
    } else {
      result[key] = ''
    }
  })
  return result
}

function buildXmlFromZones(zones) {
  return CRYSTAL_TAGS.map(key => {
    const content = (zones[key] || '').trim()
    return `<${key}>\n${content}\n</${key}>`
  }).join('\n\n')
}

export default class Memory extends MioFunction {
  constructor() {
    super({
      name: 'memory',
      description:
        '管理当前联系人的记忆结晶与事实（支持完整的 CRUD 操作）。你可以通过 question & answer 记录新记忆；也可以选择更先进的 CRUD 模式，在用户画像、短期目标等 5 个 XML 分区中写入、修改、删除或读取记忆数据。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add', 'delete', 'update', 'read'],
            description: '操作类型（仅在结晶模式下有效）：add (在分区末尾追加事实), delete (按关键字删除分区里的行), update (更新或覆写分区内容), read (读取当前全部 XML 分区记忆)',
            default: 'add',
          },
          zone: {
            type: 'string',
            enum: ['long_term_profile', 'short_term_goals', 'current_plan', 'file_architecture_delta', 'constraints'],
            description: '目标记忆分区，默认为 long_term_profile (用户画像)',
            default: 'long_term_profile',
          },
          content: {
            type: 'string',
            description: '对于 add 和 update：要记录或写入的新信息。若使用传统问答记忆，请留空并在下方填写 question 与 answer',
          },
          target: {
            type: 'string',
            description: '对于 delete 和 update：需要删除或被替换的旧信息关键字或整行匹配内容',
          },
          question: {
            type: 'string',
            description: '传统问答模式（仅用于兼容性或未开启结晶时）：需要记忆的问题或情境',
          },
          answer: {
            type: 'string',
            description: '传统问答模式（仅用于兼容性或未开启结晶时）：对应的回答或需要记住的信息',
          },
        },
      },
    })
    this.func = this.recordMemory
  }

  async recordMemory(e) {
    const params = e.params || {}
    const body = e.body || {}
    const settings = body.settings || {}

    const watermark = settings.crystallization_token_watermark
    const hasCrystallization = watermark && watermark > 0

    // 1. 如果未开启结晶功能，且提供了传统问答参数，使用传统模式优雅降级。否则抛出结晶专属错误。
    if (!hasCrystallization) {
      if (params.question && params.answer) {
        logger.info('[Memory Tool] 未开启结晶功能，使用传统问答记忆兼容模式')
        return {
          success: true,
          action: 'add',
          question: params.question.trim(),
          answer: params.answer.trim(),
          message: '记忆成功',
        }
      }
      throw new Error('记忆管理工具仅在开启记忆结晶功能时可用（crystallization_token_watermark 必须大于 0）！')
    }

    // 2. 开启结晶时的双模处理 (支持新版 CRUD 协议，同时完美兼容传统 Q&A 参数)
    let action = params.action || 'add'
    let zone = params.zone || 'long_term_profile'
    let content = params.content || ''
    const target = params.target || ''

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
        success: true,
        action,
        zone,
        summary: previousSummary,
        zones,
        message: '读取记忆结晶成功',
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

    return {
      success: true,
      action,
      zone,
      summary: newSummary,
      message: `记忆 ${action} 操作成功`,
      // 携带 Q&A 兼容字段以迎合前端通用 recordMemory 保存机制
      question: params.question || `结晶更新:${zone}`,
      answer: params.answer || content || `执行记忆整理`,
    }
  }
}
