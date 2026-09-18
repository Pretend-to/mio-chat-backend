/**
 * WakeInjector.js — 事件唤醒注入器
 *
 * 核心职责（docs/architecture/trigger-system.md §3）：
 * 1. 冷却与日限额校验（cooldownSec / maxFiresPerDay）
 * 2. 模板插值并构造标准化 User 唤醒消息（「system：trigger 系统监测到事件...」）
 * 3. 调用 SessionTurnService 注入精确的 Agent + Session
 * 4. 记录审计日志并处理 once / persistent 生命周期
 */

import logger from '../../utils/logger.js'

export class WakeInjector {
  constructor({ registry, channelRuntime, sessionTurnService = null } = {}) {
    this.registry = registry
    this.channelRuntime = channelRuntime
    this.sessionTurnService = sessionTurnService
    this._wakeLocks = new Map()
  }

  /**
   * 渲染 prompt 模板插值（支持 {{payload.xxx}} 与 {{params.xxx}}）
   */
  static interpolateTemplate(template, payload = {}, params = {}) {
    if (!template || typeof template !== 'string') return ''

    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, pathStr) => {
      const parts = pathStr.split('.')
      let curr = null
      if (parts[0] === 'payload') {
        curr = payload
        parts.shift()
      } else if (parts[0] === 'params') {
        curr = params
        parts.shift()
      } else {
        curr = payload
      }

      for (const p of parts) {
        if (curr && typeof curr === 'object' && p in curr) {
          curr = curr[p]
        } else {
          return match
        }
      }

      if (curr !== null && typeof curr === 'object') {
        return JSON.stringify(curr)
      }
      return curr !== undefined && curr !== null ? String(curr) : ''
    })
  }

  /**
   * 执行唤醒注入流程
   * @param {object} trigger - 触发器对象
   * @param {{ reason?: string, data?: any }} payload - 触发事件 payload
   * @param {object} [opts] - 执行参数（例如 durationMs 等）
   * @returns {Promise<{ injected: boolean, reason?: string, wakeMessage?: string, error?: string }>}
   */
  async processWake(trigger, payload = {}, opts = {}) {
    const lockKey = `${trigger.agentId || ''}:${trigger.id}`
    const previous = this._wakeLocks.get(lockKey) || Promise.resolve()
    const current = previous.catch(() => {}).then(() => {
      return this._processWake(trigger, payload, opts)
    })
    this._wakeLocks.set(lockKey, current)
    try {
      return await current
    } finally {
      if (this._wakeLocks.get(lockKey) === current) {
        this._wakeLocks.delete(lockKey)
      }
    }
  }

  async _processWake(trigger, payload = {}, opts = {}) {
    if (this.registry?.get) {
      const current = await this.registry.get(trigger.id, {
        agentId: trigger.agentId,
      })
      if (!current) {
        return {
          injected: false,
          reason: `Trigger "${trigger.id}" not found or not owned by this agent`,
          status: 'trigger_not_found',
        }
      }
      trigger = current
    }

    const now = Date.now()
    const cooldownMs = (trigger.cooldownSec || 1800) * 1000

    // 1. 冷却检查
    if (trigger.lastFiredAt && now - trigger.lastFiredAt < cooldownMs) {
      const remainingSec = Math.ceil((cooldownMs - (now - trigger.lastFiredAt)) / 1000)
      const skipReason = `Trigger 在冷却中（剩余 ${remainingSec}s），跳过本次唤醒`
      logger.warn(`[WakeInjector] ⏳ 哨兵 "${trigger.id}" 处于冷却中（剩余 ${remainingSec}s），跳过本次唤醒`)
      await this.registry?.recordExecution?.({
        data: payload.data,
        durationMs: opts.durationMs || 0,
        reason: skipReason,
        status: 'cooldown_skipped',
        triggerId: trigger.id,
        wake: false,
      })
      return { injected: false, reason: skipReason, status: 'cooldown_skipped' }
    }

    // 2. 日限额检查
    const maxFires = trigger.maxFiresPerDay || 5
    if (this.registry) {
      const todayStart = new Date().setHours(0, 0, 0, 0)
      const todayWakeCount = this.registry.countWakeExecutionsSince
        ? await this.registry.countWakeExecutionsSince(trigger.id, todayStart)
        : (await this.registry.listExecutions(trigger.id, { limit: 1000 })).filter(
            (l) => l.wake && l.firedAt >= todayStart,
          ).length
      if (todayWakeCount >= maxFires) {
        const skipReason = `已达每日最大唤醒限额 (${todayWakeCount}/${maxFires})，跳过本次唤醒`
        logger.warn(
          `[WakeInjector] 🚫 哨兵 "${trigger.id}" 已达每日最大唤醒限额 (${todayWakeCount}/${maxFires})，跳过本次唤醒`,
        )
        await this.registry.recordExecution({
          data: payload.data,
          durationMs: opts.durationMs || 0,
          reason: skipReason,
          status: 'quota_exceeded',
          triggerId: trigger.id,
          wake: false,
        })
        return { injected: false, reason: skipReason, status: 'quota_exceeded' }
      }
    }

    // 3. 构造标准注入消息
    let promptBody = ''
    if (trigger.promptTemplate && trigger.promptTemplate.trim()) {
      promptBody = WakeInjector.interpolateTemplate(trigger.promptTemplate, payload, trigger.params)
    }
    if (!promptBody.trim()) {
      promptBody = payload.reason || '检测到预设条件触发'
    }

    const payloadBlock = payload.data ? `\n【事件证据与明细】：\n\`\`\`json\n${JSON.stringify(payload.data, null, 2)}\n\`\`\`` : ''

    const wakeMessage = [
      `system：trigger 系统监测到事件，符合唤起条件，请处理。`,
      `【事件原因】：${payload.reason || promptBody}`,
      promptBody !== payload.reason ? `【关注提示】：${promptBody}` : null,
      payloadBlock,
    ].filter(Boolean).join('\n')

    let injected = false
    let injectError = null
    try {
      if (!this.sessionTurnService) {
        const { SessionTurnService } = await import('../chat/sessions/SessionTurnService.js')
        this.sessionTurnService = new SessionTurnService({ channelRuntime: this.channelRuntime })
      }
      await this.sessionTurnService.runTurn({
        agentId: trigger.agentId,
        deliveryBindingId: trigger.deliveryBindingId,
        isWake: true,
        sessionId: trigger.sessionId,
        source: 'trigger',
        text: wakeMessage,
        triggerId: trigger.id,
      })
      injected = true
      logger.info(`[WakeInjector] ⚡ 已向 Agent "${trigger.agentId}" Session "${trigger.sessionId}" 注入唤醒消息`)
    } catch (e) {
      injectError = `注入 Agent Session 失败: ${e.message}`
      logger.error('[WakeInjector] ❌ 唤醒注入失败:', e)
    }

    // 5. 审计记录与触发器计数更新
    if (this.registry) {
      await this.registry.recordExecution({
        data: payload.data,
        durationMs: opts.durationMs || 0,
        error: injectError,
        reason: payload.reason || promptBody,
        status: injected ? 'woken' : 'inject_failed',
        triggerId: trigger.id,
        wake: injected,
      })

      if (injected) {
        if (trigger.mode === 'once') {
          // once 模式：唤醒一次即自动删除触发器（审计日志仍保留）
          await this.registry.remove(trigger.id, { agentId: trigger.agentId })
        } else {
          // persistent 模式：更新计数与最后唤醒时间
          await this.registry.update(
            trigger.id,
            {
              fireCount: (trigger.fireCount || 0) + 1,
              lastFiredAt: now,
              wakeCount: (trigger.wakeCount || 0) + 1,
            },
            { agentId: trigger.agentId },
          )
        }
      }
    }

    return {
      error: injectError,
      injected,
      reason: payload.reason || promptBody,
      status: injected
        ? 'woken'
        : 'inject_failed',
      wakeMessage,
    }
  }
}
