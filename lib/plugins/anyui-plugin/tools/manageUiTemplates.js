import { MioFunction } from '../../../function.js'
import { TemplateStore } from '../lib/TemplateStore.js'

/**
 * manage_ui_templates - 管理 UI 模板
 * action: list（列出全部模板）/ get（查看模板详情含正文）/ delete（删除模板）
 */
export default class ManageUiTemplates extends MioFunction {
  constructor() {
    super({
      name: 'manage_ui_templates',
      description:
        '管理当前用户的 UI 模板库。动作：list 列出全部模板（名称+描述+标准 JSON Schema）；get 查看指定模板的完整内容（含 HTML 正文与 schema）；delete 删除指定模板。',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'get', 'delete'], description: '操作类型' },
          name: { type: 'string', description: '模板名（get / delete 时需要）' }
        },
        required: ['action']
      }
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const userId = e.user?.id || 'guest'
    const { action, name } = e.params

    if (action === 'list') {
      const templates = TemplateStore.list(userId)
      return {
        success: true,
        count: templates.length,
        templates,
        message: templates.length > 0 ? `共 ${templates.length} 个模板` : '模板库为空'
      }
    }

    if (action === 'get') {
      if (!name) return { success: false, error: 'get 操作需要提供 name' }
      const template = TemplateStore.get(userId, name)
      if (!template) return { success: false, error: `模板「${name}」不存在` }
      return {
        success: true,
        template: {
          name: template.name,
          description: template.description,
          schema: template.schema,
          variables: template.variables,
          variableDocs: template.variableDocs || {},
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
          html: template.html
        }
      }
    }

    if (action === 'delete') {
      if (!name) return { success: false, error: 'delete 操作需要提供 name' }
      const deleted = TemplateStore.delete(userId, name)
      if (!deleted) return { success: false, error: `模板「${name}」不存在` }
      return { success: true, message: `模板「${name}」已删除` }
    }

    return { success: false, error: `未知操作：${action}（支持 list / get / delete）` }
  }
}
