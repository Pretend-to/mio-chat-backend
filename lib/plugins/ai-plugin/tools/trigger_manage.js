import { MioFunction } from '../../../function.js'
import { getTriggerService } from '../../../triggers/index.js'

export default class TriggerManage extends MioFunction {
  constructor() {
    super({
      description: [
        '管理系统级触发器与后台哨兵 (Trigger & Sentinel System)。',
        '支持创建条件巡检哨兵 (script)、定时调度 (cron) 以及管理已注册的触发器。',
        '【核心场景】：',
        '1. 创建价格监控/事件巡逻哨兵：编写一段 Node.js / Python / Bash 脚本，脚本在满足触发条件时于 stdout 输出 `@WAKE@ {"wake": true, "reason": "...", "data": {...}}`，系统后台定期巡检并在条件达成时唤醒你并提供证据。',
        '2. 生命周期模式 (mode)："once"（一次性预警，唤醒一次后自动销毁并保留审计日志）；"persistent"（长期持续巡检任务）。',
        '3. 支持 list / remove / enable / disable / run_once (调试试跑) 操作。',
      ].join('\n'),
      name: 'trigger_manage',
      parameters: {
        properties: {
          action: {
            default: 'list',
            description: '操作类型：create (创建新触发器/哨兵), list (列出所有触发器), remove (删除触发器), enable (启用), disable (禁用), run_once (调试执行一次脚本), logs (查看最近审计执行日志)',
            enum: ['create', 'list', 'remove', 'enable', 'disable', 'run_once', 'logs'],
            type: 'string',
          },
          cooldownSec: {
            default: 1800,
            description: '唤醒冷却时间（秒，默认 1800 秒 / 30 分钟），在冷却期内即使哨兵触发也不会重复唤醒 LLM',
            type: 'number',
          },
          cronExpr: {
            description: '调度周期表达式（例如 "*/5 * * * *" 代表每 5 分钟巡检一次）',
            type: 'string',
          },
          id: {
            description: '触发器 ID（对于 create 操作可选，对于 remove/enable/disable/run_once/logs 必填）',
            type: 'string',
          },
          maxFiresPerDay: {
            default: 5,
            description: '每日最大允许唤醒次数（默认 5 次，防止死循环或行情频繁波动导致的 Token 消耗）',
            type: 'number',
          },
          mode: {
            default: 'persistent',
            description: '生命周期模式：once (一次性，唤醒一次即自动销毁并保留审计，适合价格突破等单次提醒), persistent (持久化持续运行，适合长期每日/每小时监控)',
            enum: ['once', 'persistent'],
            type: 'string',
          },
          params: {
            description: '传给哨兵脚本的上下文参数对象（脚本可通过 process.env.TRIGGER_PARAMS 读取）',
            type: 'object',
          },
          promptTemplate: {
            description: '唤醒时追加到会话中的关注提示词模板（支持 {{payload.reason}} 或 {{payload.data.key}} 插值）',
            type: 'string',
          },
          scriptCode: {
            description: '哨兵执行脚本源码。当条件满足时，最后一行必须输出：@WAKE@ {"wake": true, "reason": "...", "data": {...}}',
            type: 'string',
          },
          scriptLang: {
            default: 'js',
            description: '脚本语言：js (默认 Node.js), python (Python 3), bash (Shell 脚本)',
            enum: ['js', 'python', 'bash'],
            type: 'string',
          },
          sessionId: {
            description: '唤醒注入的目标会话 ID（可选，默认绑定当前会话）',
            type: 'string',
          },
          type: {
            default: 'script',
            description: '触发源类型：script (条件巡检脚本哨兵), cron (标准定时任务), webhook (外部 Webhook 接入)',
            enum: ['script', 'cron', 'webhook'],
            type: 'string',
          },
        },
        type: 'object',
      },
    })
    this.func = this.execute
  }

  async execute(e) {
    const params = e.params || {}
    const action = params.action || 'list'
    const service = getTriggerService()
    const registry = service.registry

    // 获取当前上下文绑定的 agentId 与 sessionId
    const agentId = e.channel?.memory?.agentId || e.user?.agentId || 'wechat-master'
    const currentSessionId = e.sessionId || e.body?.sessionId || (e.channel?.memory ? await e.channel.memory.getActiveSession() : null)

    switch (action) {
      case 'create': {
        if (params.type === 'script' && !params.scriptCode) {
          throw new Error('创建 script 类型触发器必须提供 scriptCode 脚本源码')
        }

        const trigger = await registry.create({
          agentId,
          cooldownSec: params.cooldownSec,
          cronExpr: params.cronExpr || '*/5 * * * *',
          id: params.id,
          maxFiresPerDay: params.maxFiresPerDay,
          mode: params.mode || 'persistent',
          params: params.params || {},
          promptTemplate: params.promptTemplate,
          scriptCode: params.scriptCode,
          scriptLang: params.scriptLang || 'js',
          sessionId: params.sessionId || currentSessionId,
          type: params.type || 'script',
        })

        return {
          message: `触发器 "${trigger.id}" 创建成功 ✅ [类型: ${trigger.type}, 模式: ${trigger.mode}]`,
          success: true,
          trigger,
        }
      }

      case 'list': {
        const triggers = await registry.list({ agentId })
        return {
          count: triggers.length,
          success: true,
          triggers,
        }
      }

      case 'remove': {
        if (!params.id) throw new Error('remove 操作必须指定 id 参数')
        const ok = await registry.remove(params.id)
        return {
          message: ok ? `触发器 "${params.id}" 已成功删除 🗑️` : `未找到触发器 "${params.id}"`,
          success: ok,
        }
      }

      case 'enable': {
        if (!params.id) throw new Error('enable 操作必须指定 id 参数')
        const updated = await registry.update(params.id, { enabled: true })
        return {
          message: updated ? `触发器 "${params.id}" 已启用 ✅` : `未找到触发器 "${params.id}"`,
          success: Boolean(updated),
          trigger: updated,
        }
      }

      case 'disable': {
        if (!params.id) throw new Error('disable 操作必须指定 id 参数')
        const updated = await registry.update(params.id, { enabled: false })
        return {
          message: updated ? `触发器 "${params.id}" 已禁用 🚫` : `未找到触发器 "${params.id}"`,
          success: Boolean(updated),
          trigger: updated,
        }
      }

      case 'run_once': {
        if (!params.id) throw new Error('run_once 操作必须指定 id 参数')
        const result = await service.runOnce(params.id, { forceWake: false })
        return {
          message: result.wake
            ? `哨兵试跑成功并发出唤醒契约行: "${result.reason || 'WAKE'}"`
            : (result.error ? `哨兵试跑异常: ${result.error}` : '哨兵试跑完毕（当前未达到唤醒条件）'),
          result,
          success: !result.error,
        }
      }

      case 'logs': {
        const logs = await registry.listExecutions(params.id || null, { limit: 20 })
        return {
          count: logs.length,
          logs,
          success: true,
        }
      }

      default:
        throw new Error(`未知 action: "${action}"`)
    }
  }
}
