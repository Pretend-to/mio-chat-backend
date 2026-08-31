import { TriggerRegistry } from './TriggerRegistry.js'
import { TriggerRunner } from './TriggerRunner.js'
import { WakeInjector } from './WakeInjector.js'
import { WakeProtocol } from './WakeProtocol.js'

export { TriggerRegistry, TriggerRunner, WakeInjector, WakeProtocol }

/**
 * TriggerService — 触发器与哨兵系统门面服务单例
 */
export class TriggerService {
  constructor(opts = {}) {
    this.registry = opts.registry || new TriggerRegistry(opts)
    this.runner = opts.runner || new TriggerRunner(opts)
    this.injector = opts.injector || new WakeInjector({ channelRuntime: opts.channelRuntime, registry: this.registry })
    this._pollInterval = null
    this._runningJobs = new Set()
  }

  setChannelRuntime(channelRuntime) {
    this.injector.channelRuntime = channelRuntime
  }

  /**
   * 手动或调试触发一次脚本执行（不计入冷却限制）
   * @param {string} id - 触发器 ID
   * @param {boolean} [forceWake=false] - 是否在 wake=true 时强制执行唤醒注入
   */
  async runOnce(id, { forceWake = false } = {}) {
    const trigger = await this.registry.get(id)
    if (!trigger) {
      throw new Error(`Trigger with id "${id}" not found`)
    }

    if (trigger.type === 'script') {
      const execResult = await this.runner.executeScript(trigger)
      let wakeResult = null
      if (execResult.wake) {
        if (forceWake) {
          wakeResult = await this.injector.processWake(trigger, {
            data: execResult.data,
            reason: execResult.reason,
          }, { durationMs: execResult.durationMs })
        }
      } else {
        await this.registry.recordExecution({
          data: execResult.data,
          durationMs: execResult.durationMs,
          error: execResult.error,
          reason: execResult.reason || 'No wake signal',
          status: execResult.error ? 'error' : 'checked_no_wake',
          triggerId: trigger.id,
          wake: false,
        })
      }

      return {
        ...execResult,
        wakeResult,
      }
    }

    return { error: `Trigger type "${trigger.type}" does not support script execution`, wake: false }
  }

  /**
   * 启动后台轮询调度器（按分钟巡检 script 触发器）
   */
  startScheduler(intervalMs = 60000) {
    if (this._pollInterval) return
    this._pollInterval = setInterval(async () => {
      try {
        await this._tick()
      } catch (err) {
        console.error('[TriggerService] Scheduler tick error:', err)
      }
    }, intervalMs)
    if (this._pollInterval?.unref) {
      this._pollInterval.unref()
    }
  }

  stopScheduler() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval)
      this._pollInterval = null
    }
  }

  async _tick() {
    const activeTriggers = await this.registry.list({ enabled: true, type: 'script' })
    for (const trigger of activeTriggers) {
      if (this._runningJobs.has(trigger.id)) continue
      this._runningJobs.add(trigger.id)
      this._runScriptTrigger(trigger).finally(() => {
        this._runningJobs.delete(trigger.id)
      })
    }
  }

  async _runScriptTrigger(trigger) {
    try {
      const execResult = await this.runner.executeScript(trigger)
      if (execResult.wake) {
        await this.injector.processWake(trigger, {
          data: execResult.data,
          reason: execResult.reason,
        }, { durationMs: execResult.durationMs })
      } else {
        await this.registry.recordExecution({
          data: execResult.data,
          durationMs: execResult.durationMs,
          error: execResult.error,
          reason: execResult.reason || 'No wake signal',
          status: execResult.error ? 'error' : 'checked_no_wake',
          triggerId: trigger.id,
          wake: false,
        })
      }
    } catch (err) {
      await this.registry.recordExecution({
        durationMs: 0,
        error: err.message,
        reason: 'Execution exception',
        status: 'error',
        triggerId: trigger.id,
        wake: false,
      })
    }
  }
}

let defaultTriggerService = null

export function getTriggerService(opts = {}) {
  if (!defaultTriggerService) {
    defaultTriggerService = new TriggerService(opts)
  }
  return defaultTriggerService
}
