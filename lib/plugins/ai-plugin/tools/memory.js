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
        '管理当前联系人的记忆结晶与事实（支持完整的 CRUD 操作）。你可以往用户画像、短期目标、开发约束等 5 个 XML 分区中写入、修改、删除或读取记忆数据。该工具仅在开启记忆结晶功能时可用。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add', 'delete', 'update', 'read'],
            description: '操作类型：add (在分区末尾追加事实), delete (按关键字删除分区里的行), update (更新或覆写分区内容), read (读取当前全部 XML 分区记忆)',
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
            description: '对于 add 和 update：要记录或写入的新信息',
          },
          target: {
            type: 'string',
            description: '对于 delete 和 update：需要删除或被替换的旧信息关键字或整行匹配内容',
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

    // 校验是否开启了记忆结晶功能
    const watermark = settings.crystallization_token_watermark
    if (!watermark || watermark <= 0) {
      throw new Error('记忆管理工具仅在开启记忆结晶功能时可用（crystallization_token_watermark 必须大于 0）！')
    }

    const previousSummary = settings.previous_summary || ''
    const action = params.action || 'add'
    const zone = params.zone || 'long_term_profile'
    const content = params.content || ''
    const target = params.target || ''

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
    }
  }
}
