/**
 * TemplateStore - anyUI 模板存储层
 *
 * 支持用户隔离与全局内置模板（Global）：
 *   templates/global/<templateName>.json          # 全局通用模板元数据
 *   templates/global/html/<templateName>.html     # 全局通用模板 HTML 正文
 *   templates/<userId>/<templateName>.json        # 用户私有模板元数据
 *   templates/<userId>/html/<templateName>.html   # 用户私有模板 HTML 正文
 *
 * 查找策略：
 *   get(userId, name): 优先读取用户私有模板，若不存在则读取 global 全局模板。
 *   list(userId): 合并全局模板与用户私有模板（私有模板同名覆盖全局）。
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATES_ROOT = path.join(__dirname, '..', 'templates')
const GLOBAL_DIR_NAME = 'global'

/** 用户 ID / 模板名清洗：只保留安全字符，防路径穿越 */
function sanitize(segment) {
  return String(segment ?? '').replace(/[^a-zA-Z0-9_-]/g, '')
}

function userDir(userId) {
  const safe = sanitize(userId) || 'default'
  return path.join(TEMPLATES_ROOT, safe)
}

function globalDir() {
  return path.join(TEMPLATES_ROOT, GLOBAL_DIR_NAME)
}

function htmlDir(userId) {
  return path.join(userDir(userId), 'html')
}

function metaFile(userId, name) {
  return path.join(userDir(userId), `${name}.json`)
}

function templateFile(userId, name) {
  const base = path.join(htmlDir(userId), name)
  if (fs.existsSync(`${base}.jsx`)) return `${base}.jsx`
  if (fs.existsSync(`${base}.js`)) return `${base}.js`
  return `${base}.html`
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

export class TemplateStore {
  /** 规范化元数据，提取标准 JSON Schema 与 variables */
  static normalizeMeta(raw) {
    if (!raw || typeof raw !== 'object') return null
    const schema = (raw.schema && typeof raw.schema === 'object' && !Array.isArray(raw.schema))
      ? raw.schema
      : null

    let variables = Array.isArray(raw.variables) ? raw.variables : []
    let variableDocs = (raw.variableDocs && typeof raw.variableDocs === 'object' && !Array.isArray(raw.variableDocs))
      ? raw.variableDocs
      : {}

    // 若具备标准 JSON Schema，则自动同步推导 variables 和 properties 说明
    if (schema && schema.properties && typeof schema.properties === 'object') {
      variables = Object.keys(schema.properties)
      const requiredSet = new Set(Array.isArray(schema.required) ? schema.required : [])
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (!variableDocs[key] && prop && typeof prop === 'object') {
          variableDocs[key] = {
            type: prop.type || 'string',
            required: requiredSet.has(key),
            description: prop.description || ''
          }
        }
      }
    } else if (variables.length > 0 || Object.keys(variableDocs).length > 0) {
      // 若只有旧的 variables / variableDocs，构建向后兼容的标准 JSON Schema
      const properties = {}
      const required = []
      for (const v of variables) {
        const doc = variableDocs[v]
        const desc = typeof doc === 'string' ? doc : (doc?.description || '')
        const type = (typeof doc === 'object' && doc?.type) ? doc.type : 'string'
        const isReq = Boolean(typeof doc === 'object' && doc?.required)
        properties[v] = { type, description: desc }
        if (isReq) required.push(v)
      }
      for (const [k, doc] of Object.entries(variableDocs)) {
        if (!properties[k]) {
          const desc = typeof doc === 'string' ? doc : (doc?.description || '')
          const type = (typeof doc === 'object' && doc?.type) ? doc.type : 'string'
          const isReq = Boolean(typeof doc === 'object' && doc?.required)
          properties[k] = { type, description: desc }
          if (isReq) required.push(k)
        }
      }
      raw.schema = {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {})
      }
    }

    return {
      name: raw.name,
      description: raw.description || '',
      schema: raw.schema || { type: 'object', properties: {} },
      variables: Array.from(new Set(variables)),
      variableDocs,
      isGlobal: Boolean(raw.isGlobal),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt
    }
  }

  /**
   * 读取完整模板（元数据 + html/jsx 正文）
   * 优先查当前用户私有模板，未找到则回退至 global 全局模板
   */
  static get(userId, name) {
    const safeName = sanitize(name)
    if (!safeName) return null

    // 1. 尝试从用户目录查找
    const userMetaPath = metaFile(userId, safeName)
    if (fs.existsSync(userMetaPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(userMetaPath, 'utf-8'))
        const meta = this.normalizeMeta(raw)
        const codePath = templateFile(userId, safeName)
        meta.html = fs.existsSync(codePath) ? fs.readFileSync(codePath, 'utf-8') : ''
        meta.isGlobal = false
        return meta
      } catch {
        // 出错继续尝试全局
      }
    }

    // 2. 回退尝试全局模板目录 (global)
    if (userId !== GLOBAL_DIR_NAME) {
      const globalMetaPath = metaFile(GLOBAL_DIR_NAME, safeName)
      if (fs.existsSync(globalMetaPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(globalMetaPath, 'utf-8'))
          const meta = this.normalizeMeta(raw)
          const codePath = templateFile(GLOBAL_DIR_NAME, safeName)
          meta.html = fs.existsSync(codePath) ? fs.readFileSync(codePath, 'utf-8') : ''
          meta.isGlobal = true
          return meta
        } catch {
          return null
        }
      }
    }

    return null
  }

  /**
   * 保存模板（元数据写 json，正文写 html）
   */
  static save(userId, template, isGlobal = false) {
    const targetUserId = isGlobal ? GLOBAL_DIR_NAME : (sanitize(userId) || 'default')
    const name = sanitize(template.name)
    if (!name) throw new Error('模板名只能包含字母、数字、- 和 _')

    ensureDir(userDir(targetUserId))
    ensureDir(htmlDir(targetUserId))
    const now = Date.now()
    const existing = this.get(targetUserId, name) || {}

    const normalized = this.normalizeMeta({
      name,
      description: template.description || '',
      schema: template.schema,
      variables: template.variables,
      variableDocs: template.variableDocs,
      isGlobal: Boolean(isGlobal || targetUserId === GLOBAL_DIR_NAME),
      createdAt: existing.createdAt || now,
      updatedAt: now
    })

    const meta = {
      name: normalized.name,
      description: normalized.description,
      schema: normalized.schema,
      isGlobal: normalized.isGlobal,
      createdAt: normalized.createdAt,
      updatedAt: normalized.updatedAt
    }

    fs.writeFileSync(metaFile(targetUserId, name), JSON.stringify(meta, null, 2), 'utf-8')
    if (typeof template.html === 'string') {
      const isJsx = template.html.includes('html`') || template.html.startsWith('export default') || template.html.startsWith('(props)') || template.html.startsWith('function')
      const ext = isJsx ? '.jsx' : '.html'
      fs.writeFileSync(path.join(htmlDir(targetUserId), `${name}${ext}`), template.html, 'utf-8')
    }
    return { ...meta, variables: normalized.variables, variableDocs: normalized.variableDocs }
  }

  /**
   * 列出用户的全部可用模板（包含用户私有模板 + 全局共享模板，私有优先覆盖）
   */
  static list(userId) {
    const templateMap = new Map() // name -> templateMeta

    // 1. 加载全局模板
    const gDir = globalDir()
    if (fs.existsSync(gDir)) {
      const files = fs.readdirSync(gDir).filter((f) => f.endsWith('.json'))
      for (const f of files) {
        try {
          const raw = JSON.parse(fs.readFileSync(path.join(gDir, f), 'utf-8'))
          const normalized = this.normalizeMeta({ ...raw, isGlobal: true })
          if (normalized?.name) {
            templateMap.set(normalized.name, normalized)
          }
        } catch {}
      }
    }

    // 2. 加载用户私有模板（覆盖全局同名模板）
    const uDir = userDir(userId)
    if (userId !== GLOBAL_DIR_NAME && fs.existsSync(uDir)) {
      const files = fs.readdirSync(uDir).filter((f) => f.endsWith('.json'))
      for (const f of files) {
        try {
          const raw = JSON.parse(fs.readFileSync(path.join(uDir, f), 'utf-8'))
          const normalized = this.normalizeMeta({ ...raw, isGlobal: false })
          if (normalized?.name) {
            templateMap.set(normalized.name, normalized)
          }
        } catch {}
      }
    }

    return Array.from(templateMap.values())
  }

  /**
   * 删除模板；优先删除用户私有模板
   */
  static delete(userId, name, allowGlobal = false) {
    const safeName = sanitize(name)
    if (!safeName) return false

    let deleted = false
    // 1. 删除用户目录下的模板
    if (fs.existsSync(metaFile(userId, safeName))) {
      fs.unlinkSync(metaFile(userId, safeName))
      deleted = true
    }
    const userCode = templateFile(userId, safeName)
    if (fs.existsSync(userCode)) {
      fs.unlinkSync(userCode)
      deleted = true
    }

    // 2. 如果指定或当前就是全局用户，允许删除全局模板
    if ((allowGlobal || userId === GLOBAL_DIR_NAME) && !deleted) {
      if (fs.existsSync(metaFile(GLOBAL_DIR_NAME, safeName))) {
        fs.unlinkSync(metaFile(GLOBAL_DIR_NAME, safeName))
        deleted = true
      }
      const globalCode = templateFile(GLOBAL_DIR_NAME, safeName)
      if (fs.existsSync(globalCode)) {
        fs.unlinkSync(globalCode)
        deleted = true
      }
    }

    return deleted
  }
}
