import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

/**
 * ChannelStore — 渠道配置持久化（管理面板后端的存储端）
 *
 * 数据文件：<file>（默认 channels-data/channels.json），JSON 数组。
 * 每个渠道：
 *   {
 *     id,            // 唯一 id（如 c_xxx）
 *     name,          // bot 显示名
 *     type,          // 'wechat'
 *     agentId,       // 归属 agent（决定 memory/agents/<id> 与预设）默认 'wechat-master'
 *     token,         // bot_token（敏感，落盘）
 *     botId, userId, // iLink 登录返回的 bot 账户 id / 绑定者微信 id
 *     avatar,        // 头像链接（可选）
 *     status,        // 'unbound' | 'running' | 'stopped' | 'expired'
 *     lastActive,    // 最近消息活跃时间戳
 *     createdAt, updatedAt
 *   }
 */
const UTF8 = 'utf-8'
const DEFAULT_FILE = 'channels-data/channels.json'

export class ChannelStore {
  constructor({ file = DEFAULT_FILE } = {}) {
    this.file = file
    this._cache = null
  }

  async _load() {
    if (this._cache) return this._cache
    try {
      const raw = await fs.promises.readFile(this.file, UTF8)
      this._cache = raw && raw.trim() ? JSON.parse(raw.trim()) : []
    } catch (e) {
      if (e.code === 'ENOENT') {
        this._cache = []
      } else if (e instanceof SyntaxError) {
        console.error(`[ChannelStore] JSON parse error in ${this.file}: ${e.message}. Fallback to [].`)
        this._cache = []
      } else {
        throw e
      }
    }
    return this._cache
  }
  async _save() {
    await fs.promises.mkdir(path.dirname(this.file), { recursive: true })
    const tmpFile = `${this.file}.${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`
    await fs.promises.writeFile(tmpFile, JSON.stringify(this._cache ?? [], null, 2), UTF8)
    await fs.promises.rename(tmpFile, this.file)
  }
  _public(c) {
    // 脱敏对外：token 不返回明文
    const { token, ...rest } = c
    return { ...rest, hasToken: !!token }
  }

  async list() {
    return (await this._load()).map((c) => this._public(c))
  }
  async get(id) {
    const found = (await this._load()).find((c) => c.id === id)
    return found ? found : null
  }
  async getPublic(id) {
    const c = await this.get(id)
    return c ? this._public(c) : null
  }
  async create(data = {}) {
    const list = await this._load()
    const now = Date.now()
    const channel = {
      agentId: 'wechat-master', // 默认归属
      avatar: '',
      botId: '',
      createdAt: now,
      id: `c_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`,
      name: data.name || '微信助手',
      status: 'unbound',
      token: '',
      type: 'wechat',
      provider: data.provider || '',
      model: data.model || '',
      updatedAt: now,
      userId: '',
      lastActive: 0,
      ...data,
    }
    list.push(channel)
    this._cache = list
    await this._save()
    return this._public(channel)
  }
  async update(id, patch = {}) {
    const list = await this._load()
    const ch = list.find((c) => c.id === id)
    if (!ch) return null
    Object.assign(ch, patch, { updatedAt: Date.now() })
    this._cache = list
    await this._save()
    return this._public(ch)
  }
  async remove(id) {
    const list = await this._load()
    const next = list.filter((c) => c.id !== id)
    if (next.length === list.length) return false
    this._cache = next
    await this._save()
    return true
  }
}

export default ChannelStore