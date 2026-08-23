/**
 * TemplateRenderer - anyUI 模板渲染引擎（纯函数，无 IO）
 *
 * 支持的语法：
 *   {{var}}                 变量替换（自动 HTML 转义，防注入）
 *   {{#each items}}...{{/each}}  数组循环，循环内可用 {{this}} / {{this.xxx}}
 *
 * 变量缺失时渲染为空字符串（不抛错），让模板在数据不全时优雅降级。
 */

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
        // {{this.xxx}} 对象属性
        out = out.replace(/\{\{\s*this\.([a-zA-Z_][\w]*)\s*\}\}/g, (__, prop) =>
          escapeHtml(item && item[prop] !== undefined ? item[prop] : '')
        )
        // {{this}} 原始值
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
 * 渲染完整模板
 * @param {string} template - HTML 模板（含 {{var}} / {{#each}}）
 * @param {Object} variables - 变量值
 * @returns {string} 渲染后的 HTML
 */
export function render(template, variables = {}) {
  if (!template) return ''
  return renderVars(renderEach(template, variables), variables)
}

/** 校验模板语法是否完整（成对的 {{#each}}/{{/each}}） */
export function validateTemplate(template) {
  const opens = (template.match(/\{\{#each\s+/g) || []).length
  const closes = (template.match(/\{\{\/each\}\}/g) || []).length
  if (opens !== closes) {
    throw new Error(`模板语法错误：{{#each}} 有 ${opens} 个，{{/each}} 有 ${closes} 个，不配对`)
  }
  return true
}
