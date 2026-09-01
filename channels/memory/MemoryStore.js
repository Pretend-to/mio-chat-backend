import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

/**
 * MemoryStore — 渠道无关记忆落盘层
 *
 * 定位：扮演「无前端 store 的渠道（微信等）」的客户端持久化端。
 *   - soul.md            人格/灵魂（用户可定制，markdown）
 *   - global/<category>.md  长期记忆（对接 memory 工具 scope:'global' 的落盘，按分类分区）
 *   - sessions/*.json    各会话：聊天记录(chat[]) + 结晶(<memory_crystal>/previous_summary)
 *   - active             当前激活会话 id
 *
 * 数据布局：
 *   <baseDir>/agents/<agentId>/
 *     ├── soul.md
 *     ├── global/  user_profile.md | tech_stack.md | ...
 *     ├── active
 *     └── sessions/<sessionId>.json
 */
const UTF8 = 'utf-8'
const DEFAULT_BASE_DIR = 'memory'

export class MemoryStore {
  /**
   * @param {object} opts
   * @param {string} opts.agentId  agent 唯一标识（如 'wechat-master'、或映射到具体预设）
   * @param {string} [opts.baseDir] 记忆根目录（默认 'memory'，相对 process.cwd()）
   */
  constructor({ agentId, baseDir = DEFAULT_BASE_DIR }) {
    if (!agentId) throw new Error('MemoryStore requires agentId')
    this.agentId = agentId
    this.baseDir = baseDir
  }

  // ---------------------------------------------------------------
  // 内部：路径与安全
  // ---------------------------------------------------------------
  _agentDir() {
    return path.join(this.baseDir, 'agents', this.agentId)
  }
  _safeSegment(id) {
    // 防止 path traversal / 非法字符
    const clean = String(id).replace(/[^a-zA-Z0-9_.-]/g, '_')
    if (!clean) throw new Error('invalid id')
    return clean
  }
  _sessionFile(id) {
    return path.join(this._agentDir(), 'sessions', `${this._safeSegment(id)}.json`)
  }
  _globalFile(category = 'general') {
    return path.join(this._agentDir(), 'global', `${this._safeSegment(category)}.md`)
  }
  async _ensureAgentDir() {
    const dir = this._agentDir()
    await fs.promises.mkdir(path.join(dir, 'sessions'), { recursive: true })
    await fs.promises.mkdir(path.join(dir, 'global'), { recursive: true })
    return dir
  }
  /** 显式确保 agent 目录存在（ChannelRuntime 启动时调用，使记忆落盘目录立即可用） */
  async ensure() {
    return await this._ensureAgentDir()
  }
  async _readFile(fp, fallback = null) {
    try {
      return await fs.promises.readFile(fp, UTF8)
    } catch (e) {
      if (e.code === 'ENOENT') return fallback
      throw e
    }
  }
  async _writeFile(fp, data) {
    await fs.promises.mkdir(path.dirname(fp), { recursive: true })
    const tmpFp = `${fp}.${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`
    await fs.promises.writeFile(tmpFp, data, UTF8)
    await fs.promises.rename(tmpFp, fp)
  }

  // ===============================================================
  // soul（人格）
  // ===============================================================
  async readSoul() {
    return await this._readFile(path.join(this._agentDir(), 'soul.md'), '')
  }
  async writeSoul(content) {
    await this._writeFile(path.join(this._agentDir(), 'soul.md'), String(content ?? ''))
    return true
  }

  // ===============================================================
  // global 长期记忆（memory 工具 scope:'global' 的客户端落盘，按 category 分区 md）
  // ===============================================================
  /**
   * 读取某分类的长期记忆（markdown 文本）
   */
  async readGlobal(category = 'general') {
    return await this._readFile(this._globalFile(category), '')
  }
  /**
   * 列出所有已落盘的长期记忆分类
   */
  async listGlobalCategories() {
    const dir = path.join(this._agentDir(), 'global')
    try {
      const files = await fs.promises.readdir(dir)
      return files.filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).toSorted()
    } catch {
      return []
    }
  }
  /**
   * 全部长期记忆（合并所有分类，供注入 messageChain 用）
   */
  async readAllGlobal() {
    const cats = await this.listGlobalCategories()
    const blocks = []
    for (const c of cats) {
      const body = (await this.readGlobal(c)).trim()
      if (body) blocks.push(`## ${c}\n${body}`)
    }
    return blocks.join('\n\n')
  }
  /** 整体替换一个分类文档（与数据库兼容层共用的管理 API） */
  async writeGlobal(category, content) {
    await this._writeFile(this._globalFile(category), String(content ?? ''))
    return true
  }
  /** add：追加一条事实 */
  async addGlobal(category, content) {
    const body = await this.readGlobal(category)
    const line = String(content).trim()
    if (!line) throw new Error('addGlobal requires content')
    const next = body ? `${body.replace(/\n+$/, '')}\n${line}\n` : `${line}\n`
    await this._writeFile(this._globalFile(category), next)
    return true
  }
  /** update：替换命中 target 的那一行（无 target 则整体替换） */
  async updateGlobal(category, target = '', content) {
    const body = (await this.readGlobal(category)).split('\n')
    const t = target.trim()
    if (!t) {
      await this._writeFile(this._globalFile(category), `${String(content).trim()}\n`)
      return true
    }
    const next = body.map((l) => (l.includes(t) ? String(content).trim() : l))
    await this._writeFile(this._globalFile(category), next.join('\n').replace(/\n+$/, '') + '\n')
    return true
  }
  /** delete：删除命中 target 的行 */
  async deleteGlobal(category, target) {
    const t = String(target || '').trim()
    if (!t) throw new Error('deleteGlobal requires target')
    const body = (await this.readGlobal(category)).split('\n')
    const next = body.filter((l) => !l.includes(t))
    await this._writeFile(this._globalFile(category), next.join('\n').replace(/\n+$/, '') + (next.length ? '\n' : ''))
    return true
  }

  // ===============================================================
  // sessions（会话记录 + 结晶）
  // ===============================================================
  async listSessions() {
    const dir = path.join(this._agentDir(), 'sessions')
    let files = []
    try {
      files = await fs.promises.readdir(dir)
    } catch {
      return []
    }
    const sessions = []
    for (const f of files.filter((file) => file.endsWith('.json'))) {
      try {
        const s = JSON.parse(await fs.promises.readFile(path.join(dir, f), UTF8))
        sessions.push({
          createdAt: s.created_at,
          id: s.id,
          msgCount: (s.chat || []).length,
          title: s.title || s.id,
        })
      } catch { /* skip malformed */ }
    }
    sessions.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    return sessions
  }
  async getSession(id) {
    const raw = await this._readFile(this._sessionFile(id), null)
    return raw ? JSON.parse(raw) : null
  }
  async createSession({
    createdAt = Date.now(),
    id = `s_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    title = '',
  } = {}) {
    await this._ensureAgentDir()
    const session = {
      chat: [],
      created_at: createdAt,
      crystal: '', // <memory_crystal> / previous_summary
      id: this._safeSegment(id),
      title,
    }
    await this._writeFile(this._sessionFile(session.id), JSON.stringify(session, null, 2))
    return session
  }
  async deleteSession(id) {
    try {
      await fs.promises.unlink(this._sessionFile(id))
    } catch (e) {
      if (e.code !== 'ENOENT') throw e
    }
    // 若删除的是当前激活会话，重置 active
    const active = await this.getActiveSession()
    if (active === id) await this.setActiveSession(null)
    return true
  }
  /** 追加一条聊天消息到会话 */
  async appendToChat(id, msg) {
    const session = (await this.getSession(id)) || (await this.createSession({ id }))
    session.chat = session.chat || []
    if (!msg.time) {
      msg.time = Date.now()
    }
    session.chat.push(msg)
    await this._writeFile(this._sessionFile(id), JSON.stringify(session, null, 2))
    return session
  }
  async getChat(id) {
    const s = await this.getSession(id)
    return s?.chat || []
  }
  /** 设置/清除该会话的结晶摘要（memory_crystal / previous_summary） */
  async setCrystal(id, crystalXml = '') {
    const session = (await this.getSession(id)) || (await this.createSession({ id }))
    session.crystal = crystalXml ?? ''
    await this._writeFile(this._sessionFile(id), JSON.stringify(session, null, 2))
    return true
  }
  async getCrystal(id) {
    const s = await this.getSession(id)
    return s?.crystal || ''
  }
  /** 追加一条待压缩归档的记忆事件（保护日常对话 Prefix Cache） */
  async appendPendingMemory(id, event) {
    const session = (await this.getSession(id)) || (await this.createSession({ id }))
    session.pending_memories = Array.isArray(session.pending_memories) ? session.pending_memories : []
    session.pending_memories.push({
      ...event,
      timestamp: Date.now(),
    })
    await this._writeFile(this._sessionFile(id), JSON.stringify(session, null, 2))
    return session.pending_memories
  }
  /** 获取当前会话积累的待压缩记忆事件 */
  async getPendingMemories(id) {
    const s = await this.getSession(id)
    return Array.isArray(s?.pending_memories) ? s.pending_memories : []
  }
  /** 压缩完成后清空已固化的待压缩记忆 */
  async clearPendingMemories(id) {
    const session = await this.getSession(id)
    if (session) {
      session.pending_memories = []
      await this._writeFile(this._sessionFile(id), JSON.stringify(session, null, 2))
    }
    return true
  }
  /** 清空会话聊天（保留人格注入用不到的 history 之外——这里只清 chat，保留 crystal） */
  async clearChat(id) {
    const session = (await this.getSession(id)) || (await this.createSession({ id }))
    session.chat = []
    await this._writeFile(this._sessionFile(id), JSON.stringify(session, null, 2))
    return true
  }_sessionArchiveDir(id) {
    return path.join(this._agentDir(), 'archives', this._safeSegment(id))
  }

  /**
   * 上下文压缩后的「归档 + 裁剪」闭环（仿前端：压缩节点索引更新）
   *
   * 压缩结晶落盘后调用：把当前聊天记录完整复制归档到 archives/<sessionId>/<时间戳>.json，
   * 然后仅保留最近 keepTurns 轮交互（轮 = 以 role==='user' 为起点，与前端 scanFrontendTurns 语义一致），
   * 其余历史全部清空，实现会话 chat 的索引更新与裁剪。
   *
   * @param {string} id 会话 ID
   * @param {number} [keepTurns=1] 保留最近几轮交互（默认 1 轮 = 最近一轮 user+assistant）
   * @returns {Promise<object>} { rotated, archivePath?, removedCount?, keptCount? }
   */
  async rotateChat(id, keepTurns = 1) {
    const session = await this.getSession(id)
    if (!session || !Array.isArray(session.chat) || session.chat.length === 0) {
      return { rotated: false, reason: 'empty' }
    }
    const chat = session.chat
    // 计算保留起点：从尾部倒扫 user 轮次（与 scanFrontendTurns 同语义）
    let keepFrom = 0
    let turns = 0
    for (let i = chat.length - 1; i >= 0; i--) {
      if (chat[i]?.role === 'user') {
        turns++
        if (turns >= keepTurns) {
          keepFrom = i
          break
        }
      }
    }
    if (keepFrom <= 0) {
      // 没有足够的轮次要裁剪，跳过（保持原样）
      return { rotated: false, reason: 'too-short' }
    }
    const removed = chat.slice(0, keepFrom)
    const kept = chat.slice(keepFrom)
    // 1. 归档：完整复制被裁剪的历史到独立归档文件
    await this._ensureAgentDir()
    const dir = this._sessionArchiveDir(id)
    await fs.promises.mkdir(dir, { recursive: true })
    const archivedAt = Date.now()
    const archivePath = path.join(dir, `${archivedAt}.json`)
    await this._writeFile(
      archivePath,
      JSON.stringify({ archivedAt, sessionId: id, chat: removed }, null, 2),
    )
    // 2. 裁剪：仅保留最近 N 轮写回
    session.chat = kept
    await this._writeFile(this._sessionFile(id), JSON.stringify(session, null, 2))
    return { rotated: true, archivePath, removedCount: removed.length, keptCount: kept.length }
  }

  // ===============================================================
  // agent 元数据（last_user_activity / keepalive 提醒状态等，持久化 JSON）
  // ===============================================================
  async _readMeta() {
    const fp = path.join(this._agentDir(), 'meta.json')
    const raw = await this._readFile(fp, null)
    if (!raw || !raw.trim()) return {}
    try {
      return JSON.parse(raw.trim())
    } catch (e) {
      if (e instanceof SyntaxError) {
        console.error(`[MemoryStore] Meta JSON parse error in ${fp}: ${e.message}. Resetting meta fallback.`)
        return {}
      }
      throw e
    }
  }
  async _writeMeta(meta) {
    await this._writeFile(path.join(this._agentDir(), 'meta.json'), JSON.stringify(meta, null, 2))
  }
  async getAgentMeta(key, fallback = null) {
    const meta = await this._readMeta()
    return meta[key] ?? fallback
  }
  async setAgentMeta(key, value) {
    const meta = await this._readMeta()
    meta[key] = value
    await this._writeMeta(meta)
    return true
  }

  // ===============================================================
  // active session（当前激活）
  // ===============================================================
  async getActiveSession() {
    const raw = await this._readFile(path.join(this._agentDir(), 'active'), null)
    return raw ? raw.trim() || null : null
  }
  async setActiveSession(id) {
    if (id == null) {
      try { await fs.promises.unlink(path.join(this._agentDir(), 'active')) } catch {}
      return null
    }
    await this._writeFile(path.join(this._agentDir(), 'active'), String(id))
    return id
  }
}

export default MemoryStore
