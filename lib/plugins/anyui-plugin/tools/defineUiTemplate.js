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
        '模板正文会单独存为 html 文件（模板名即文件名），方便后续直接编辑。' +
        '可通过 schema（标准 JSON Schema）为每个字段补充说明（type/description/required 等），保存后 list/get 都能查看规范 schema 与字段含义。',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '模板 id（只能包含字母、数字、- 和 _，也是 html 文件名）' },
          html: { type: 'string', description: 'HTML 模板正文，用 {{变量}} 占位' },
          description: { type: 'string', description: '模板用途说明（可选）' },
          schema: { type: 'string', description: '标准 JSON Schema 对象字符串，如 {"type":"object","properties":{"hp":{"type":"number","description":"生命值"}},"required":["hp"]}（推荐，可选）' },
          variables: { type: 'string', description: '变量名列表（旧兼容），JSON 数组字符串，如 ["name","hp","items"]（可选）' },
          variableDocs: { type: 'string', description: '变量说明（旧兼容），JSON 对象字符串，键为变量名，值为 {type, required, description}（可选）' }
        },
        required: ['name', 'html']
      }
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const userId = e.user?.id || 'guest'
    const { name, html, description, schema: schemaParam, variables, variableDocs: variableDocsParam } = e.params

    if (!name || !String(name).trim()) return { success: false, error: '模板名不能为空' }
    if (!html || !String(html).trim()) return { success: false, error: '模板正文不能为空' }

    try {
      validateTemplate(html)
    } catch (err) {
      return { success: false, error: err.message }
    }

    let schema = null
    if (schemaParam) {
      try {
        const parsed = typeof schemaParam === 'string' ? JSON.parse(schemaParam) : schemaParam
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) schema = parsed
        else return { success: false, error: 'schema 必须是标准 JSON Schema 对象字符串' }
      } catch {
        return { success: false, error: 'schema 不是合法 JSON 字符串' }
      }
    }

    let vars = []
    if (variables) {
      try {
        const parsed = typeof variables === 'string' ? JSON.parse(variables) : variables
        if (Array.isArray(parsed)) vars = parsed
        else return { success: false, error: 'variables 必须是 JSON 数组字符串，如 ["name","hp"]' }
      } catch {
        return { success: false, error: 'variables 不是合法 JSON 数组字符串' }
      }
    }
    // 解析可选的 variableDocs（兼容旧格式）
    let variableDocs = null
    if (variableDocsParam) {
      try {
        const parsed = typeof variableDocsParam === 'string' ? JSON.parse(variableDocsParam) : variableDocsParam
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) variableDocs = parsed
        else return { success: false, error: 'variableDocs 必须是 JSON 对象字符串，如 {"hp":{"type":"number","description":"生命值"}}' }
      } catch {
        return { success: false, error: 'variableDocs 不是合法 JSON 对象字符串' }
      }
    }

    // 自动从 HTML 正文提取 {{var}} 变量名，与手动声明的合并去重（过滤 each/this 关键字）
    const RESERVED = new Set(['each', '/each', 'this'])
    const extracted = new Set(vars)
    const varRe = /\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g
    let m
    while ((m = varRe.exec(html)) !== null) {
      const varName = m[1]
      if (!RESERVED.has(varName)) extracted.add(varName)
    }
    vars = Array.from(extracted)

    const meta = TemplateStore.save(userId, { name, html, description, schema, variables: vars, variableDocs })
    return {
      success: true,
      message: `UI 模板「${name}」已保存（${meta.variables.length} 个变量）`,
      template: {
        name: meta.name,
        description: meta.description,
        schema: meta.schema,
        variables: meta.variables,
        variableDocs: meta.variableDocs || {},
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt
      },
      hint: '直接用 send_ui 发送它，或告诉用户模板正文已存为 html 文件可自行编辑'
    }
  }
}
