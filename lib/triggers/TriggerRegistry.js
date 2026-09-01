import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

import prismaManager from '../database/prisma.js'

const UTF8 = 'utf-8'
const DEFAULT_DATA_DIR = 'channels-data/triggers'

function parseJson(value, fallback = null) {
  if (value == null) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

/**
 * TriggerRegistry — 触发器配置与执行审计存储管理
 *
 * 数据文件：
 *   - <dataDir>/triggers.json       触发器元数据列表
 *   - <dataDir>/executions.json     触发器执行与唤醒历史审计日志
 *   - <dataDir>/scripts/<id>.<ext> 哨兵执行脚本
 */
export class TriggerRegistry {
  constructor({
    dataDir = DEFAULT_DATA_DIR,
    mode = process.env.MIO_CHANNEL_PERSISTENCE_MODE || 'legacy',
    prisma = null,
  } = {}) {
    this.dataDir = dataDir
    this.mode = mode
    this.prisma = prisma
    this.triggersFile = path.join(dataDir, 'triggers.json')
    this.executionsFile = path.join(dataDir, 'executions.json')
    this.scriptsDir = path.join(dataDir, 'scripts')
    this._triggersCache = null
    this._executionsCache = null
  }

  _usesDatabase() {
    return this.mode === 'database' || this.mode === 'database-shadow'
  }

  async _database() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
    return this.prisma
  }

  _fromDatabase(row) {
    if (!row) return null
    return {
      agentId: row.agentId,
      channelId: row.channelId,
      cooldownSec: row.cooldownSec,
      createdAt: row.createdAt.getTime(),
      cronExpr: row.cronExpr,
      enabled: row.enabled,
      fireCount: row.fireCount,
      id: row.id,
      lastFiredAt: row.lastFiredAt?.getTime() || null,
      maxFiresPerDay: row.maxFiresPerDay,
      mode: row.mode,
      params: parseJson(row.params, {}),
      promptTemplate: row.promptTemplate,
      scriptPath: row.scriptPath,
      sessionId: row.sessionId,
      type: row.type,
      updatedAt: row.updatedAt.getTime(),
      wakeCount: row.wakeCount,
    }
  }

  _executionFromDatabase(row) {
    return {
      data: parseJson(row.dataJson, null),
      durationMs: row.durationMs || 0,
      error: row.error,
      firedAt: row.firedAt?.getTime() || row.createdAt.getTime(),
      id: row.id,
      reason: row.reason || '',
      status: row.status,
      triggerId: row.triggerKey,
      wake: row.wake,
    }
  }

  async _writeScript(opts, id) {
    if (!opts.scriptCode) return { created: false, scriptPath: opts.scriptPath || null }
    await this._ensureDirs()
    const lang = opts.scriptLang || 'js'
    const ext = lang === 'python' || lang === 'py' ? 'py' : (lang === 'sh' || lang === 'bash' ? 'sh' : 'js')
    const scriptPath = path.join(this.scriptsDir, `${id}.${ext}`)
    await fs.promises.writeFile(scriptPath, opts.scriptCode, UTF8)
    if (ext === 'sh') await fs.promises.chmod(scriptPath, 0o755)
    return { created: true, scriptPath }
  }

  async _resolveDatabaseReferences(prisma, { agentId, channelId, sessionId }) {
    await prisma.agent.upsert({ create: { id: agentId }, update: {}, where: { id: agentId } })
    if (channelId) {
      const channel = await prisma.channel.findFirst({ where: { agentId, id: channelId } })
      if (!channel) throw new Error(`channel ${channelId} not found for agent ${agentId}`)
    }
    if (sessionId) {
      const session = await prisma.session.findFirst({ where: { agentId, id: sessionId } })
      if (!session) throw new Error(`session ${sessionId} not found for agent ${agentId}`)
    }
  }

  async _createDatabase(opts) {
    const prisma = await this._database()
    const id = opts.id || `trg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
    if (await prisma.trigger.findUnique({ where: { id } })) {
      throw new Error(`Trigger with id "${id}" already exists`)
    }

    const agentId = opts.agentId || 'wechat-master'
    const channelId = opts.channelId || null
    const sessionId = opts.sessionId || null
    await this._resolveDatabaseReferences(prisma, { agentId, channelId, sessionId })
    const script = await this._writeScript(opts, id)
    const now = new Date()
    const data = {
      agentId,
      channelId,
      cooldownSec: typeof opts.cooldownSec === 'number' ? opts.cooldownSec : 1800,
      createdAt: now,
      cronExpr: opts.cronExpr || null,
      enabled: opts.enabled !== false,
      fireCount: 0,
      id,
      lastFiredAt: null,
      legacyJson: null,
      maxFiresPerDay: typeof opts.maxFiresPerDay === 'number' ? opts.maxFiresPerDay : 5,
      mode: opts.mode === 'once' ? 'once' : 'persistent',
      params: JSON.stringify(opts.params && typeof opts.params === 'object' ? opts.params : {}),
      promptTemplate: opts.promptTemplate || '{{payload.reason}}',
      scriptPath: script.scriptPath,
      sessionId,
      type: opts.type || (opts.cronExpr ? 'cron' : 'script'),
      updatedAt: now,
      wakeCount: 0,
      webhookSecretHash: opts.webhookSecret
        ? crypto.createHash('sha256').update(String(opts.webhookSecret)).digest('hex')
        : null,
    }
    try {
      return this._fromDatabase(await prisma.trigger.create({ data }))
    } catch (error) {
      if (script.created) await fs.promises.rm(script.scriptPath, { force: true })
      throw error
    }
  }

  async _updateDatabase(id, patch) {
    const prisma = await this._database()
    const current = await prisma.trigger.findFirst({ where: { deletedAt: null, id } })
    if (!current) return null
    const merged = { ...this._fromDatabase(current), ...patch, id: current.id }
    await this._resolveDatabaseReferences(prisma, merged)
    const data = {
      agentId: merged.agentId,
      channelId: merged.channelId || null,
      cooldownSec: Number.isFinite(merged.cooldownSec) ? merged.cooldownSec : current.cooldownSec,
      cronExpr: merged.cronExpr || null,
      enabled: merged.enabled !== false,
      fireCount: Number.isFinite(merged.fireCount) ? merged.fireCount : current.fireCount,
      lastFiredAt: merged.lastFiredAt ? new Date(merged.lastFiredAt) : null,
      maxFiresPerDay: Number.isFinite(merged.maxFiresPerDay) ? merged.maxFiresPerDay : current.maxFiresPerDay,
      mode: merged.mode === 'once' ? 'once' : 'persistent',
      params: JSON.stringify(merged.params && typeof merged.params === 'object' ? merged.params : {}),
      promptTemplate: merged.promptTemplate || '{{payload.reason}}',
      scriptPath: merged.scriptPath || null,
      sessionId: merged.sessionId || null,
      type: merged.type || 'script',
      wakeCount: Number.isFinite(merged.wakeCount) ? merged.wakeCount : current.wakeCount,
    }
    if (Object.hasOwn(patch, 'webhookSecret')) {
      data.webhookSecretHash = patch.webhookSecret
        ? crypto.createHash('sha256').update(String(patch.webhookSecret)).digest('hex')
        : null
    }
    return this._fromDatabase(await prisma.trigger.update({ data, where: { id } }))
  }

  async _ensureDirs() {
    await fs.promises.mkdir(this.dataDir, { recursive: true })
    await fs.promises.mkdir(this.scriptsDir, { recursive: true })
  }

  async _loadTriggers() {
    if (this._triggersCache) return this._triggersCache
    await this._ensureDirs()
    try {
      const raw = await fs.promises.readFile(this.triggersFile, UTF8)
      this._triggersCache = raw && raw.trim() ? JSON.parse(raw.trim()) : []
    } catch (e) {
      if (e.code === 'ENOENT' || e instanceof SyntaxError) {
        this._triggersCache = []
      } else {
        throw e
      }
    }
    return this._triggersCache
  }

  async _saveTriggers() {
    await this._ensureDirs()
    const tmp = `${this.triggersFile}.${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`
    await fs.promises.writeFile(tmp, JSON.stringify(this._triggersCache ?? [], null, 2), UTF8)
    await fs.promises.rename(tmp, this.triggersFile)
  }

  async _loadExecutions() {
    if (this._executionsCache) return this._executionsCache
    await this._ensureDirs()
    try {
      const raw = await fs.promises.readFile(this.executionsFile, UTF8)
      this._executionsCache = raw && raw.trim() ? JSON.parse(raw.trim()) : []
    } catch (e) {
      if (e.code === 'ENOENT' || e instanceof SyntaxError) {
        this._executionsCache = []
      } else {
        throw e
      }
    }
    return this._executionsCache
  }

  async _saveExecutions() {
    await this._ensureDirs()
    const tmp = `${this.executionsFile}.${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`
    await fs.promises.writeFile(tmp, JSON.stringify(this._executionsCache ?? [], null, 2), UTF8)
    await fs.promises.rename(tmp, this.executionsFile)
  }

  // ===============================================================
  // Trigger CRUD
  // ===============================================================

  async create(opts = {}) {
    if (this._usesDatabase()) return await this._createDatabase(opts)
    const triggers = await this._loadTriggers()
    const id = opts.id || `trg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`

    if (triggers.some((t) => t.id === id)) {
      throw new Error(`Trigger with id "${id}" already exists`)
    }

    let scriptPath = opts.scriptPath || null
    // 如果直接提供了脚本源码，自动写入脚本文件
    if (opts.scriptCode) {
      const lang = opts.scriptLang || 'js'
      const ext = lang === 'python' || lang === 'py' ? 'py' : (lang === 'sh' || lang === 'bash' ? 'sh' : 'js')
      const fileName = `${id}.${ext}`
      const targetPath = path.join(this.scriptsDir, fileName)
      await fs.promises.writeFile(targetPath, opts.scriptCode, UTF8)
      // 如果是 shell 脚本，赋予执行权限
      if (ext === 'sh') {
        try {
          await fs.promises.chmod(targetPath, 0o755)
        } catch {}
      }
      scriptPath = targetPath
    }

    const trigger = {
      agentId: opts.agentId || 'wechat-master',
      cooldownSec: typeof opts.cooldownSec === 'number' ? opts.cooldownSec : 1800,
      createdAt: Date.now(),
      cronExpr: opts.cronExpr || null,
      enabled: opts.enabled !== false,
      fireCount: 0,
      id,
      lastFiredAt: null,
      maxFiresPerDay: typeof opts.maxFiresPerDay === 'number' ? opts.maxFiresPerDay : 5,
      mode: opts.mode === 'once' ? 'once' : 'persistent',
      params: opts.params && typeof opts.params === 'object' ? opts.params : {},
      promptTemplate: opts.promptTemplate || '{{payload.reason}}',
      scriptPath,
      sessionId: opts.sessionId || null,
      type: opts.type || (opts.cronExpr ? 'cron' : 'script'),
      updatedAt: Date.now(),
      wakeCount: 0,
      webhookSecret: opts.webhookSecret || null,
    }

    triggers.push(trigger)
    await this._saveTriggers()
    return trigger
  }

  async get(id) {
    if (this._usesDatabase()) {
      const prisma = await this._database()
      return this._fromDatabase(await prisma.trigger.findFirst({ where: { deletedAt: null, id } }))
    }
    const triggers = await this._loadTriggers()
    return triggers.find((t) => t.id === id) || null
  }

  async list(filter = {}) {
    if (this._usesDatabase()) {
      const prisma = await this._database()
      const rows = await prisma.trigger.findMany({
        orderBy: { createdAt: 'asc' },
        where: {
          agentId: filter.agentId,
          deletedAt: null,
          enabled: filter.enabled,
          sessionId: filter.sessionId,
          type: filter.type,
        },
      })
      return rows.map(row => this._fromDatabase(row))
    }
    const triggers = await this._loadTriggers()
    return triggers.filter((t) => {
      if (filter.agentId && t.agentId !== filter.agentId) return false
      if (filter.sessionId && t.sessionId !== filter.sessionId) return false
      if (filter.type && t.type !== filter.type) return false
      if (filter.enabled !== undefined && t.enabled !== filter.enabled) return false
      return true
    })
  }

  async update(id, patch = {}) {
    if (this._usesDatabase()) return await this._updateDatabase(id, patch)
    const triggers = await this._loadTriggers()
    const idx = triggers.findIndex((t) => t.id === id)
    if (idx === -1) return null

    const current = triggers[idx]
    const updated = {
      ...current,
      ...patch,
      id: current.id, // ID 不允许被修改
      updatedAt: Date.now(),
    }

    triggers[idx] = updated
    await this._saveTriggers()
    return updated
  }

  async remove(id) {
    if (this._usesDatabase()) {
      const prisma = await this._database()
      const current = await prisma.trigger.findFirst({ where: { deletedAt: null, id } })
      if (!current) return false
      await prisma.trigger.update({ data: { deletedAt: new Date(), enabled: false }, where: { id } })
      if (current.scriptPath) {
        try {
          await fs.promises.unlink(current.scriptPath)
        } catch (error) {
          if (error.code !== 'ENOENT') console.warn(`[TriggerRegistry] 删除脚本文件失败: ${current.scriptPath}`, error)
        }
      }
      return true
    }
    const triggers = await this._loadTriggers()
    const idx = triggers.findIndex((t) => t.id === id)
    if (idx === -1) return false

    const [deleted] = triggers.splice(idx, 1)
    await this._saveTriggers()

    // 清理对应的脚本文件
    if (deleted.scriptPath) {
      try {
        await fs.promises.unlink(deleted.scriptPath)
      } catch (e) {
        if (e.code !== 'ENOENT') console.warn(`[TriggerRegistry] 删除脚本文件失败: ${deleted.scriptPath}`, e)
      }
    }

    return true
  }

  // ===============================================================
  // Execution & Audit Logs
  // ===============================================================

  async recordExecution({ triggerId, wake = false, reason = '', data = null, durationMs = 0, status = 'success', error = null }) {
    if (this._usesDatabase()) {
      const prisma = await this._database()
      const trigger = triggerId ? await prisma.trigger.findUnique({ where: { id: triggerId } }) : null
      const row = await prisma.triggerExecution.create({
        data: {
          dataJson: data == null ? null : JSON.stringify(data),
          durationMs: Number.isFinite(durationMs) ? Math.round(durationMs) : 0,
          error: error ? String(error) : null,
          firedAt: new Date(),
          id: `exec_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          reason: String(reason || ''),
          status: String(status || 'success'),
          triggerId: trigger?.id || null,
          triggerKey: String(triggerId || 'unknown'),
          wake: Boolean(wake),
        },
      })
      return this._executionFromDatabase(row)
    }
    const executions = await this._loadExecutions()
    const record = {
      data,
      durationMs,
      error: error ? String(error) : null,
      firedAt: Date.now(),
      id: `exec_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      reason,
      status,
      triggerId,
      wake,
    }

    executions.push(record)

    // 控制历史日志容量，保留最近 1000 条
    if (executions.length > 1000) {
      executions.splice(0, executions.length - 1000)
    }

    await this._saveExecutions()
    return record
  }

  async listExecutions(triggerId = null, { limit = 50 } = {}) {
    if (this._usesDatabase()) {
      const prisma = await this._database()
      const rows = await prisma.triggerExecution.findMany({
        orderBy: { createdAt: 'desc' },
        take: Math.max(0, Number(limit) || 0),
        where: triggerId ? { triggerKey: triggerId } : undefined,
      })
      return rows.map(row => this._executionFromDatabase(row))
    }
    const executions = await this._loadExecutions()
    let list = triggerId ? executions.filter((e) => e.triggerId === triggerId) : executions
    list.sort((a, b) => (b.firedAt || 0) - (a.firedAt || 0))
    return list.slice(0, limit)
  }
}
