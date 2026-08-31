import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const UTF8 = 'utf-8'
const DEFAULT_DATA_DIR = 'channels-data/triggers'

/**
 * TriggerRegistry — 触发器配置与执行审计存储管理
 *
 * 数据文件：
 *   - <dataDir>/triggers.json       触发器元数据列表
 *   - <dataDir>/executions.json     触发器执行与唤醒历史审计日志
 *   - <dataDir>/scripts/<id>.<ext> 哨兵执行脚本
 */
export class TriggerRegistry {
  constructor({ dataDir = DEFAULT_DATA_DIR } = {}) {
    this.dataDir = dataDir
    this.triggersFile = path.join(dataDir, 'triggers.json')
    this.executionsFile = path.join(dataDir, 'executions.json')
    this.scriptsDir = path.join(dataDir, 'scripts')
    this._triggersCache = null
    this._executionsCache = null
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
    const triggers = await this._loadTriggers()
    return triggers.find((t) => t.id === id) || null
  }

  async list(filter = {}) {
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
    const executions = await this._loadExecutions()
    let list = triggerId ? executions.filter((e) => e.triggerId === triggerId) : executions
    list.sort((a, b) => (b.firedAt || 0) - (a.firedAt || 0))
    return list.slice(0, limit)
  }
}
