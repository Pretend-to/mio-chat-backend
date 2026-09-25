import crypto from 'node:crypto'

import prismaManager from '../lib/database/prisma.js'
import {
  decryptToken,
  encryptToken,
  parseEncryptionKey,
} from '../lib/chat/persistence/TokenCipher.js'
import { resolveChannelAdapter } from './ChannelAdapterRegistry.js'

/**
 * ChannelStore — 渠道配置持久化（管理面板后端的存储端）
 *
 * 渠道配置由数据库持久化。
 * 每个渠道：
 *   {
 *     id,            // 唯一 id（如 c_xxx）
 *     name,          // bot 显示名
 *     type,          // MioChat 渠道适配器，如 'weixin-ilink'
 *     driver,        // 底层运行时，如 'native'
 *     platform,      // 平台适配器，如 'weixin-ilink'
 *     protocol,      // 协议标识，如 'weixin.ilink'
 *     config,        // adapter 扩展配置
 *     token,         // bot_token（敏感，落盘）
 *     botId, userId, // iLink 登录返回的 bot 账户 id / 绑定者微信 id
 *     avatar,        // 头像链接（可选）
 *     status,        // 'unbound' | 'running' | 'stopped' | 'expired'
 *     lastActive,    // 最近消息活跃时间戳
 *     createdAt, updatedAt
 *   }
 */
export class ChannelStore {
  constructor({
    encryptionKey = process.env.MIOCHAT_ENC_KEY,
    logger = console,
    prisma = null,
    ...unsupported
  } = {}) {
    if (Object.keys(unsupported).length) {
      throw new Error(`ChannelStore unsupported options: ${Object.keys(unsupported).join(', ')}`)
    }
    this.encryptionKey = encryptionKey
    this.logger = logger
    this.prisma = prisma
  }

  async _database() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
    return this.prisma
  }

  _key(required = false) {
    if (!required && !this.encryptionKey) return null
    return Buffer.isBuffer(this.encryptionKey)
      ? this.encryptionKey
      : parseEncryptionKey(this.encryptionKey)
  }

  _public(c) {
    // 脱敏对外：token 不返回明文
    const { token, ...rest } = c
    const definition = resolveChannelAdapter(c)
    return {
      ...rest,
      ...(definition && {
        adapterId: c.adapterId || definition.id,
        driver: c.driver || definition.runtime,
      }),
      hasToken: !!token,
    }
  }

  _fromDatabase(row) {
    let legacy = {}
    try {
      legacy = row.legacyJson ? JSON.parse(row.legacyJson) : {}
    } catch (error) {
      this.logger?.warn?.(
        `[ChannelStore] invalid legacy_json for ${row.id}: ${error.message}`,
      )
    }
    return {
      ...legacy,
      avatar: row.avatar || '',
      botId: row.botId || '',
      createdAt: row.createdAt.getTime(),
      id: row.id,
      lastActive: row.lastActive?.getTime() || 0,
      name: row.name || '',
      status: row.status,
      token: row.tokenEnc ? decryptToken(row.tokenEnc, this._key(true)) : '',
      type: row.type,
      updatedAt: row.updatedAt.getTime(),
      userId: row.userId || '',
    }
  }

  async _listDatabase() {
    const prisma = await this._database()
    const rows = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((row) => this._fromDatabase(row))
  }

  async _getDatabase(id) {
    const prisma = await this._database()
    const row = await prisma.channel.findUnique({ where: { id } })
    return row ? this._fromDatabase(row) : null
  }

  async _writeDatabase(channel) {
    const prisma = await this._database()
    const tokenEnc = channel.token
      ? encryptToken(channel.token, this._key(true))
      : null
    const legacyJson = { ...channel }
    delete legacyJson.token
    delete legacyJson.agentId
    delete legacyJson.provider
    delete legacyJson.model
    const data = {
      avatar: channel.avatar || null,
      botId: channel.botId || null,
      lastActive: channel.lastActive ? new Date(channel.lastActive) : null,
      legacyJson: JSON.stringify(legacyJson),
      name: channel.name || null,
      status: channel.status || 'unbound',
      tokenEnc,
      type: channel.type || 'channel',
      updatedAt: new Date(channel.updatedAt),
      userId: channel.userId || null,
    }
    await prisma.channel.upsert({
      create: {
        ...data,
        createdAt: new Date(channel.createdAt),
        id: channel.id,
      },
      update: data,
      where: { id: channel.id },
    })
    return channel
  }

  async _removeDatabase(id) {
    const prisma = await this._database()
    return (await prisma.channel.deleteMany({ where: { id } })).count > 0
  }

  /** Internal, non-redacted list used by ChannelRuntime during startup. */
  async listInternal() {
    return await this._listDatabase()
  }

  async list() {
    const list = await this.listInternal()
    return list.map((c) => this._public(c))
  }
  async get(id) {
    const found = await this._getDatabase(id)
    return found ? found : null
  }
  async getPublic(id) {
    const c = await this.get(id)
    return c ? this._public(c) : null
  }
  async create(data = {}) {
    const now = Date.now()
    // Before the versioned adapter API, bound WeChat channels were sometimes
    // written directly without any type metadata. Preserve only that legacy
    // shape; a new unbound record remains platform-neutral.
    const legacyBoundRecord =
      !data.type &&
      !data.adapterId &&
      !data.driver &&
      !data.platform &&
      Boolean(data.token || data.userId || data.botId)
    const channel = {
      avatar: '',
      botId: '',
      createdAt: now,
      id: `c_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`,
      name: data.name || '渠道助手',
      status: 'unbound',
      token: '',
      type: legacyBoundRecord ? 'weixin-ilink' : 'channel',
      adapterId: legacyBoundRecord ? 'weixin-ilink' : '',
      driver: legacyBoundRecord ? 'native' : '',
      platform: legacyBoundRecord ? 'weixin-ilink' : '',
      protocol: legacyBoundRecord ? 'weixin.ilink' : '',
      updatedAt: now,
      userId: '',
      lastActive: 0,
      ...data,
    }
    delete channel.agentId
    delete channel.provider
    delete channel.model
    await this._writeDatabase(channel)
    return this._public(channel)
  }
  async update(id, patch = {}) {
    const ch = await this._getDatabase(id)
    if (!ch) return null
    const nextPatch = { ...patch }
    delete nextPatch.agentId
    delete nextPatch.provider
    delete nextPatch.model
    Object.assign(ch, nextPatch, { updatedAt: Date.now() })
    await this._writeDatabase(ch)
    return this._public(ch)
  }
  async remove(id) {
    return await this._removeDatabase(id)
  }
}

export default ChannelStore
