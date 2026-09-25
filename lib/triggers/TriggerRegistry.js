import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

import prismaManager from '../database/prisma.js'
import {
  DELIVERY_MODES,
  normalizeDeliveryMode,
} from '../chat/delivery/DeliveryBindingService.js'

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
 * 触发器元数据和执行审计存于数据库；脚本仍写入 <dataDir>/scripts。
 */
export class TriggerRegistry {
  constructor({ dataDir = DEFAULT_DATA_DIR, prisma = null, ...unsupported } = {}) {
    if (Object.keys(unsupported).length) {
      throw new Error(`TriggerRegistry unsupported options: ${Object.keys(unsupported).join(', ')}`)
    }
    this.dataDir = dataDir
    this.prisma = prisma
    this.scriptsDir = path.join(dataDir, 'scripts')
  }

  async _database() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
    return this.prisma
  }

  _fromDatabase(row) {
    if (!row) return null
    return {
      agentId: row.agentId,
      deliveryBindingId: row.deliveryBindingId,
      deliveryMode:
        row.deliveryMode ||
        (row.deliveryBindingId
          ? DELIVERY_MODES.CHANNEL
          : DELIVERY_MODES.DEFAULT),
      sourceChannelId: row.sourceChannelId,
      cooldownSec: row.cooldownSec,
      createdAt: row.createdAt.getTime(),
      cronExpr: row.cronExpr,
      deletedAt: row.deletedAt?.getTime() || null,
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
      messageId: row.messageId,
      reason: row.reason || '',
      sessionId: row.sessionId,
      status: row.status,
      triggerId: row.triggerKey,
      wake: row.wake,
    }
  }

  async _writeScript(opts, id) {
    if (!opts.scriptCode)
      return { created: false, scriptPath: opts.scriptPath || null }
    await this._ensureDirs()
    const lang = opts.scriptLang || 'js'
    const ext =
      lang === 'python' || lang === 'py'
        ? 'py'
        : lang === 'sh' || lang === 'bash'
          ? 'sh'
          : 'js'
    const scriptPath = path.join(this.scriptsDir, `${id}.${ext}`)
    await fs.promises.writeFile(scriptPath, opts.scriptCode, UTF8)
    if (ext === 'sh') await fs.promises.chmod(scriptPath, 0o755)
    return { created: true, scriptPath }
  }

  async _resolveDatabaseReferences(
    prisma,
    { agentId, deliveryBindingId, sourceChannelId, sessionId },
  ) {
    if (!agentId || !sessionId)
      throw new Error('Trigger requires agentId and sessionId')
    const [agent, session, binding, sourceChannel] = await Promise.all([
      prisma.agent.findUnique({ where: { id: agentId } }),
      prisma.session.findUnique({ where: { id: sessionId } }),
      deliveryBindingId
        ? prisma.agentChannelBinding.findUnique({
            where: { id: deliveryBindingId },
          })
        : null,
      sourceChannelId
        ? prisma.channel.findUnique({ where: { id: sourceChannelId } })
        : null,
    ])
    if (!agent) throw new Error(`agent ${agentId} not found`)
    if (!session || session.agentId !== agentId)
      throw new Error(`session ${sessionId} not found for agent ${agentId}`)
    if (deliveryBindingId && (!binding || binding.agentId !== agentId))
      throw new Error(
        `delivery binding ${deliveryBindingId} not found for agent ${agentId}`,
      )
    if (sourceChannelId && !sourceChannel)
      throw new Error(`source channel ${sourceChannelId} not found`)
  }

  async _createDatabase(opts) {
    const prisma = await this._database()
    const id =
      opts.id || `trg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
    if (await prisma.trigger.findUnique({ where: { id } })) {
      throw new Error(`Trigger with id "${id}" already exists`)
    }

    const agentId = opts.agentId
    const deliveryBindingId = opts.deliveryBindingId || null
    const deliveryMode = normalizeDeliveryMode(
      opts.deliveryMode ||
        (deliveryBindingId ? DELIVERY_MODES.CHANNEL : DELIVERY_MODES.DEFAULT),
    )
    if (deliveryMode === DELIVERY_MODES.CHANNEL && !deliveryBindingId) {
      throw new Error('deliveryBindingId is required when deliveryMode=channel')
    }
    const sourceChannelId = opts.sourceChannelId || null
    const sessionId = opts.sessionId
    await this._resolveDatabaseReferences(prisma, {
      agentId,
      deliveryBindingId,
      deliveryMode,
      sourceChannelId,
      sessionId,
    })
    const script = await this._writeScript(opts, id)
    const now = new Date()
    const data = {
      agentId,
      deliveryBindingId,
      sourceChannelId,
      cooldownSec:
        typeof opts.cooldownSec === 'number' ? opts.cooldownSec : 1800,
      createdAt: now,
      cronExpr: opts.cronExpr || null,
      enabled: opts.enabled !== false,
      fireCount: 0,
      id,
      lastFiredAt: null,
      legacyJson: null,
      maxFiresPerDay:
        typeof opts.maxFiresPerDay === 'number' ? opts.maxFiresPerDay : 5,
      mode: opts.mode === 'once' ? 'once' : 'persistent',
      params: JSON.stringify(
        opts.params && typeof opts.params === 'object' ? opts.params : {},
      ),
      promptTemplate: opts.promptTemplate || '{{payload.reason}}',
      scriptPath: script.scriptPath,
      sessionId,
      type:
        opts.type ||
        (script.scriptPath || opts.scriptCode
          ? 'script'
          : opts.cronExpr
            ? 'cron'
            : 'script'),
      updatedAt: now,
      wakeCount: 0,
      webhookSecretHash: opts.webhookSecret
        ? crypto
            .createHash('sha256')
            .update(String(opts.webhookSecret))
            .digest('hex')
        : null,
    }
    try {
      return this._fromDatabase(await prisma.trigger.create({ data }))
    } catch (error) {
      if (script.created)
        await fs.promises.rm(script.scriptPath, { force: true })
      throw error
    }
  }

  async _updateDatabase(id, patch, { agentId } = {}) {
    const prisma = await this._database()
    const where = { deletedAt: null, id }
    if (agentId) where.agentId = agentId
    const current = await prisma.trigger.findFirst({
      where,
    })
    if (!current) return null
    const merged = { ...this._fromDatabase(current), ...patch, id: current.id }
    await this._resolveDatabaseReferences(prisma, merged)
    const data = {
      agentId: merged.agentId,
      deliveryBindingId: merged.deliveryBindingId || null,
      deliveryMode: normalizeDeliveryMode(
        merged.deliveryMode ||
          (merged.deliveryBindingId
            ? DELIVERY_MODES.CHANNEL
            : DELIVERY_MODES.DEFAULT),
      ),
      sourceChannelId: merged.sourceChannelId || null,
      cooldownSec: Number.isFinite(merged.cooldownSec)
        ? merged.cooldownSec
        : current.cooldownSec,
      cronExpr: merged.cronExpr || null,
      enabled: merged.enabled !== false,
      fireCount: Number.isFinite(merged.fireCount)
        ? merged.fireCount
        : current.fireCount,
      lastFiredAt: merged.lastFiredAt ? new Date(merged.lastFiredAt) : null,
      maxFiresPerDay: Number.isFinite(merged.maxFiresPerDay)
        ? merged.maxFiresPerDay
        : current.maxFiresPerDay,
      mode: merged.mode === 'once' ? 'once' : 'persistent',
      params: JSON.stringify(
        merged.params && typeof merged.params === 'object' ? merged.params : {},
      ),
      promptTemplate: merged.promptTemplate || '{{payload.reason}}',
      scriptPath: merged.scriptPath || null,
      sessionId: merged.sessionId,
      type: merged.type || 'script',
      wakeCount: Number.isFinite(merged.wakeCount)
        ? merged.wakeCount
        : current.wakeCount,
    }
    if (Object.hasOwn(patch, 'webhookSecret')) {
      data.webhookSecretHash = patch.webhookSecret
        ? crypto
            .createHash('sha256')
            .update(String(patch.webhookSecret))
            .digest('hex')
        : null
    }
    return this._fromDatabase(
      await prisma.trigger.update({ data, where: { id } }),
    )
  }

  async _ensureDirs() {
    await fs.promises.mkdir(this.scriptsDir, { recursive: true })
  }

  async create(opts = {}) {
    if (!opts.agentId || !opts.sessionId) {
      throw new Error('Trigger requires agentId and sessionId')
    }
    return await this._createDatabase(opts)
  }

  async get(id, { agentId, includeDeleted = false } = {}) {
    const prisma = await this._database()
    const where = { id }
    if (!includeDeleted) where.deletedAt = null
    if (agentId) where.agentId = agentId
    return this._fromDatabase(await prisma.trigger.findFirst({ where }))
  }

  async list(filter = {}) {
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

  async update(id, patch = {}, scope = {}) {
    if (scope.agentId && patch.agentId && patch.agentId !== scope.agentId) return null
    return await this._updateDatabase(id, patch, scope)
  }

  async remove(id, { agentId } = {}) {
    const prisma = await this._database()
    const where = { deletedAt: null, id }
    if (agentId) where.agentId = agentId
    const current = await prisma.trigger.findFirst({ where })
    if (!current) return false
    await prisma.trigger.update({
      data: { deletedAt: new Date(), enabled: false },
      where: { id },
    })
    if (current.scriptPath) {
      try {
        await fs.promises.unlink(current.scriptPath)
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn(`[TriggerRegistry] 删除脚本文件失败: ${current.scriptPath}`, error)
        }
      }
    }
    return true
  }

  async recordExecution({
    triggerId,
    wake = false,
    reason = '',
    data = null,
    durationMs = 0,
    status = 'success',
    error = null,
  }) {
    const prisma = await this._database()
    const trigger = triggerId
      ? await prisma.trigger.findUnique({ where: { id: triggerId } })
      : null
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

  async getExecution(id) {
    if (!id) return null
    const prisma = await this._database()
    const row = await prisma.triggerExecution.findUnique({ where: { id: String(id) } })
    return row ? this._executionFromDatabase(row) : null
  }

  async updateExecution(id, patch = {}) {
    if (!id) return null
    const data = {
      ...(Object.hasOwn(patch, 'data')
        ? { dataJson: patch.data == null ? null : JSON.stringify(patch.data) }
        : {}),
      ...(Object.hasOwn(patch, 'durationMs')
        ? { durationMs: Number.isFinite(patch.durationMs) ? Math.round(patch.durationMs) : 0 }
        : {}),
      ...(Object.hasOwn(patch, 'error')
        ? { error: patch.error == null ? null : String(patch.error) }
        : {}),
      ...(Object.hasOwn(patch, 'firedAt')
        ? { firedAt: patch.firedAt ? new Date(patch.firedAt) : null }
        : {}),
      ...(Object.hasOwn(patch, 'messageId')
        ? { messageId: patch.messageId || null }
        : {}),
      ...(Object.hasOwn(patch, 'reason')
        ? { reason: String(patch.reason || '') }
        : {}),
      ...(Object.hasOwn(patch, 'sessionId')
        ? { sessionId: patch.sessionId || null }
        : {}),
      ...(Object.hasOwn(patch, 'status')
        ? { status: String(patch.status || '') }
        : {}),
      ...(Object.hasOwn(patch, 'wake') ? { wake: Boolean(patch.wake) } : {}),
    }
    const prisma = await this._database()
    try {
      const row = await prisma.triggerExecution.update({ data, where: { id: String(id) } })
      return this._executionFromDatabase(row)
    } catch (error) {
      if (error?.code === 'P2025') return null
      throw error
    }
  }

  async listExecutions(triggerId = null, { limit = 50 } = {}) {
    const prisma = await this._database()
    const rows = await prisma.triggerExecution.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.max(0, Number(limit) || 0),
      where: triggerId ? { triggerKey: triggerId } : undefined,
    })
    return rows.map(row => this._executionFromDatabase(row))
  }

  async countWakeExecutionsSince(triggerId, since) {
    if (!triggerId) return 0
    const prisma = await this._database()
    return await prisma.triggerExecution.count({
      where: {
        firedAt: { gte: new Date(since) },
        triggerKey: triggerId,
        wake: true,
      },
    })
  }
}
