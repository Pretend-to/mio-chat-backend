/**
 * TemplateRenderer - anyUI 动态模板渲染引擎
 *
 * 支持双模式：
 * 1. 动态 JS / JSX 组件模式（推荐）：
 *    - 接收函数模板代码或模块导出：`(props) => html`<div class="card">${props.title}</div>``
 *    - 具备完整的条件渲染（如 `${hasImage && html`...`}`）、数组映射、计算逻辑。
 * 2. 经典 HTML 占位符模式（向后兼容）：
 *    - `{{var}}` / `{{#each}}`
 */

import htm from 'htm'
import vhtml from 'vhtml'

export const html = htm.bind(vhtml)

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 渲染 {{#each key}}...{{/each}} 块 */
function renderEach(template, variables) {
  return template.replace(/\{\{#each\s+([a-zA-Z_][\w]*)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, inner) => {
    const list = variables[key]
    if (!Array.isArray(list)) return ''
    return list
      .map((item) => {
        let out = inner
        out = out.replace(/\{\{\s*this\.([a-zA-Z_][\w]*)\s*\}\}/g, (__, prop) =>
          escapeHtml(item && item[prop] !== undefined ? item[prop] : '')
        )
        out = out.replace(/\{\{\s*this\s*\}\}/g, () => escapeHtml(item))
        return out
      })
      .join('')
  })
}

/** 渲染 {{var}} 变量（支持 {{a.b.c}} 属性路径） */
function renderVars(template, variables) {
  return template.replace(/\{\{\s*([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)*)\s*\}\}/g, (_, path) => {
    const value = path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), variables)
    return escapeHtml(value !== undefined ? value : '')
  })
}

/**
 * 编译并执行 JSX / JS 模板函数
 */
export function renderJsx(templateCode, variables = {}) {
  const trimmed = String(templateCode || '').trim()
  if (!trimmed) return ''

  try {
    let fnBody = trimmed
    if (fnBody.startsWith('export default')) {
      fnBody = fnBody.replace(/^export\s+default\s+/, '')
    }

    // 构造执行环境，注入 html (htm+vhtml), vhtml, escapeHtml 等辅助工具
    let runner
    if (/^\s*(async\s+)?(function|\([^)]*\)\s*=>|[a-zA-Z_$][\w$]*\s*=>)/.test(fnBody)) {
      runner = new Function('html', 'vhtml', 'escapeHtml', `return (${fnBody});`)(html, vhtml, escapeHtml)
    } else {
      runner = new Function('props', 'html', 'vhtml', 'escapeHtml', fnBody)
    }

    if (typeof runner === 'function') {
      const result = runner(variables, html, vhtml, escapeHtml)
      return typeof result === 'string' ? result : String(result ?? '')
    }
  } catch (err) {
    throw new Error(`JSX/JS 模板执行失败: ${err.message}`)
  }

  return ''
}

/**
 * 智能渲染：自动检测是 JSX / JS 组件模板还是静态 HTML Mustache 模板
 * @param {string|Function} template - 模板内容
 * @param {Object} variables - 变量值
 * @returns {string} 渲染后的 HTML
 */
export function render(template, variables = {}) {
  if (!template) return ''

  // 若传入的是现成函数
  if (typeof template === 'function') {
    const res = template(variables, html, vhtml, escapeHtml)
    return typeof res === 'string' ? res : String(res ?? '')
  }

  const str = String(template).trim()

  // 判断是否为 JS / JSX 动态模板（包含 html` 或 export default 或 (props) => 或 return html`）
  if (
    str.includes('html`') ||
    str.startsWith('export default') ||
    str.startsWith('(props)') ||
    str.startsWith('function') ||
    str.startsWith('props =>')
  ) {
    return renderJsx(str, variables)
  }

  // 经典 HTML 占位符渲染
  return renderVars(renderEach(str, variables), variables)
}

/** 校验模板语法 */
export function validateTemplate(template) {
  if (!template) return true
  if (typeof template === 'function') return true

  const str = String(template).trim()
  if (
    str.includes('html`') ||
    str.startsWith('export default') ||
    str.startsWith('(props)') ||
    str.startsWith('function') ||
    str.startsWith('props =>')
  ) {
    try {
      let fnBody = str
      if (fnBody.startsWith('export default')) fnBody = fnBody.replace(/^export\s+default\s+/, '')
      if (/^\s*(async\s+)?(function|\([^)]*\)\s*=>|[a-zA-Z_$][\w$]*\s*=>)/.test(fnBody)) {
        new Function('html', 'vhtml', 'escapeHtml', `return (${fnBody});`)
      } else {
        new Function('props', 'html', 'vhtml', 'escapeHtml', fnBody)
      }
      return true
    } catch (err) {
      throw new Error(`JSX 模板语法错误: ${err.message}`)
    }
  }

  // HTML {{#each}} 语法校验
  const opens = (str.match(/\{\{#each\s+/g) || []).length
  const closes = (str.match(/\{\{\/each\}\}/g) || []).length
  if (opens !== closes) {
    throw new Error(`模板语法错误：{{#each}} 有 ${opens} 个，{{/each}} 有 ${closes} 个，不配对`)
  }
  return true
}
