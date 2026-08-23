import { MioFunction } from '../../../function.js'
import { TemplateStore } from '../lib/TemplateStore.js'
import { validateTemplate } from '../lib/TemplateRenderer.js'

/**
 * define_ui_template - 定义 UI 模板
 * 校验模板语法后存入当前用户的模板库（元数据 json + html 正文分文件存储）。
 */
export default class DefineUiTemplate extends MioFunction {
  constructor() {
    super({
      name: 'define_ui_template',
      description:
        '定义并保存一个 UI 模板到当前用户的模板库。模板用 HTML 编写，支持 {{变量名}} 占位符和 {{#each 数组名}}...{{/each}} 循环（循环内用 {{this}} 或 {{this.属性}}）。' +
        '适合角色扮演场景：状态面板、商店界面、对话窗口、剧情选项等。定义后可用 send_ui 发送。' +
        '模板正文会单独存为 html 文件（模板名即文件名），方便后续直接编辑。',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '模板 id（只能包含字母、数字、- 和 _，也是 html 文件名）' },
          html: { type: 'string', description: 'HTML 模板正文，用 {{变量}} 占位' },
          description: { type: 'string', description: '模板用途说明（可选）' },
          variables: { type: 'string', description: '变量声明，JSON 数组字符串，如 ["name","hp","items"]（可选）' }
        },
        required: ['name', 'html']
      }
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const userId = e.user?.id
    if (!userId) return { success: false, error: '无法获取当前用户身份' }

    const { name, html, description, variables } = e.params

    if (!name || !String(name).trim()) return { success: false, error: '模板名不能为空' }
    if (!html || !String(html).trim()) return { success: false, error: '模板正文不能为空' }

    try {
      validateTemplate(html)
    } catch (err) {
      return { success: false, error: err.message }
    }

    let vars = []
    if (variables) {
      try {
        const parsed = JSON.parse(variables)
        if (Array.isArray(parsed)) vars = parsed
        else return { success: false, error: 'variables 必须是 JSON 数组字符串，如 ["name","hp"]' }
      } catch {
        return { success: false, error: 'variables 不是合法 JSON 数组字符串' }
      }
    }

    // 自动从 HTML 正文提取 {{var}} 变量名，与手动声明的合并去重（过滤 each/this 关键字）
    const RESERVED = new Set(['each', '/each', 'this'])
    const extracted = new Set(vars)
    const varRe = /\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g
    let m
    while ((m = varRe.exec(html)) !== null) {
      const name = m[1]
      if (!RESERVED.has(name)) extracted.add(name)
    }
    vars = Array.from(extracted)

    const meta = TemplateStore.save(userId, { name, html, description, variables: vars })
    return {
      success: true,
      message: `UI 模板「${name}」已保存（${meta.variables.length} 个变量）`,
      template: {
        name: meta.name,
        description: meta.description,
        variables: meta.variables,
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt
      },
      hint: '直接用 send_ui 发送它，或告诉用户模板正文已存为 html 文件可自行编辑'
    }
  }
}
