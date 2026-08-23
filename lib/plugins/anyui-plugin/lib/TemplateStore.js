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

function htmlFile(userId, name) {
  return path.join(htmlDir(userId), `${name}.html`)
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

export class TemplateStore {
  /**
   * 读取完整模板（元数据 + html 正文）
   * 优先查当前用户私有模板，未找到则回退至 global 全局模板
   */
  static get(userId, name) {
    const safeName = sanitize(name)
    if (!safeName) return null

    // 1. 尝试从用户目录查找
    const userMetaPath = metaFile(userId, safeName)
    if (fs.existsSync(userMetaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(userMetaPath, 'utf-8'))
        const htmlPath = htmlFile(userId, safeName)
        meta.html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf-8') : ''
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
          const meta = JSON.parse(fs.readFileSync(globalMetaPath, 'utf-8'))
          const htmlPath = htmlFile(GLOBAL_DIR_NAME, safeName)
          meta.html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf-8') : ''
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
    const meta = {
      name,
      description: template.description || '',
      variables: Array.isArray(template.variables) ? template.variables : [],
      isGlobal: Boolean(isGlobal || targetUserId === GLOBAL_DIR_NAME),
      createdAt: existing.createdAt || now,
      updatedAt: now,
    }
    fs.writeFileSync(metaFile(targetUserId, name), JSON.stringify(meta, null, 2), 'utf-8')
    if (typeof template.html === 'string') {
      fs.writeFileSync(htmlFile(targetUserId, name), template.html, 'utf-8')
    }
    return meta
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
          const t = JSON.parse(fs.readFileSync(path.join(gDir, f), 'utf-8'))
          templateMap.set(t.name, {
            name: t.name,
            description: t.description || '',
            variables: t.variables || [],
            isGlobal: true,
            updatedAt: t.updatedAt,
          })
        } catch {}
      }
    }

    // 2. 加载用户私有模板（覆盖全局同名模板）
    const uDir = userDir(userId)
    if (userId !== GLOBAL_DIR_NAME && fs.existsSync(uDir)) {
      const files = fs.readdirSync(uDir).filter((f) => f.endsWith('.json'))
      for (const f of files) {
        try {
          const t = JSON.parse(fs.readFileSync(path.join(uDir, f), 'utf-8'))
          templateMap.set(t.name, {
            name: t.name,
            description: t.description || '',
            variables: t.variables || [],
            isGlobal: false,
            updatedAt: t.updatedAt,
          })
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
    if (fs.existsSync(htmlFile(userId, safeName))) {
      fs.unlinkSync(htmlFile(userId, safeName))
      deleted = true
    }

    // 2. 如果指定或当前就是全局用户，允许删除全局模板
    if ((allowGlobal || userId === GLOBAL_DIR_NAME) && !deleted) {
      if (fs.existsSync(metaFile(GLOBAL_DIR_NAME, safeName))) {
        fs.unlinkSync(metaFile(GLOBAL_DIR_NAME, safeName))
        deleted = true
      }
      if (fs.existsSync(htmlFile(GLOBAL_DIR_NAME, safeName))) {
        fs.unlinkSync(htmlFile(GLOBAL_DIR_NAME, safeName))
        deleted = true
      }
    }

    return deleted
  }
}
