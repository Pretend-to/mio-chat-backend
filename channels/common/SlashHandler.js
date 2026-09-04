/**
 * SlashHandler — 全渠道通用 Slash 命令路由器与处理器
 *
 * 支持通用指令：
 *   - /help 帮助菜单
 *   - /abort /crush /stop /cancel /interrupt /cut /break 任务中止与强插开启新对话
 *   - /tools 工具查看、开启、禁用、重置
 *   - /think /reasoning 思考推理强度调节
 *   - /yolo Shell 审批跳过开关（按当前会话）
 *   - /status 当前会话与执行状态
 *   - /model 模型查看、列表检索、实时切换、重置
 *   - /sessions /ls 历史话题查看
 *   - /new 新建并切换会话
 *   - /use 切换会话
 *   - /current 查看当前激活会话
 *   - /clear 清空当前会话消息
 *   - /soul 灵魂人设查看与修改
 *   - /memory 全局长期记忆查看
 *   - /context 当前话题记忆结晶查看
 *   - /delete 删除会话
 */
import { getRegisteredSystemToolNames } from '../llm.js'
import { getTriggerService } from '../../lib/triggers/index.js'
import { getSessionYolo, setSessionYolo } from '../../lib/chat/sessionExecutionState.js'

export class SlashHandler {
  /**
   * @param {object} opts
   * @param {import('../memory/MemoryStore.js').MemoryStore} opts.memory 记忆存储
   * @param {import('./BaseChannel.js').BaseChannel} opts.channel 关联的渠道实例
   */
  constructor({ memory, channel }) {
    this.memory = memory
    this.channel = channel
  }

  async handle(cmd, ctx = {}) {
    const [name, ...rest] = cmd.slice(1).trim().split(/\s+/)
    const arg = rest.join(' ').trim()
    const active = () => this.memory.getActiveSession()
    const wrap = (s) => ({ text: s })

    switch (name) {
      case 'help': {
        return wrap(
          [
            '【基础与执行控制】',
            '  • /help 帮助菜单',
            '  • /abort [新话语] 停止任务（后接文字时立即以此开启新对话，支持别名 /crush）',
            '',
            '【模型与能力管理】',
            '  • /model [ls/名称/reset] 查看或切换模型',
            '  • /think [0-4/off/low/med/high/max] 调整思考推理强度',
            '  • /tools [ls/on/off/reset] 查看与开启/禁用工具',
            '  • /yolo [on/off] 当前会话跳过 Shell 审批（谨慎使用）',
            '  • /status 查看当前会话与执行状态',
            '',
            '【会话与话题管理】',
            '  • /sessions 列出所有会话',
            '  • /new [标题] 新建并切换会话',
            '  • /use <id> 切换会话',
            '  • /current 当前会话信息',
            '  • /clear 清空当前会话聊天',
            '  • /delete <id> 删除指定会话',
            '',
            '【记忆与人设管理】',
            '  • /soul [set 设定] 查看或重设灵魂人设',
            '  • /memory 查看跨会话长期记忆',
            '  • /context 查看当前会话记忆结晶',
          ].join('\n')
        )
      }

      case 'crush':
      case 'abort':
      case 'stop':
      case 'cancel':
      case 'interrupt':
      case 'cut':
      case 'break': {
        let count = 0
        if (this.channel?.activeJobs && this.channel.activeJobs.size > 0) {
          for (const [jobSid, job] of Array.from(this.channel.activeJobs.entries())) {
            try {
              if (typeof job.abort === 'function') {
                job.abort()
              }
            } catch (e) {
              console.error('[Slash] abort job error:', e)
            }
            this.channel.activeJobs.delete(jobSid)
            count++
          }
        }

        // 如果命令后附带了新的对话内容（例如 /crush 停下来，我们看看别的方向）
        if (arg) {
          // 等待前序中止任务完成落盘
          await new Promise((r) => setTimeout(r, 60))
          if (this.channel && typeof this.channel._processChat === 'function') {
            return this.channel._processChat(arg, ctx)
          }
        }

        if (count > 0) {
          return wrap(`⏹️ 已成功中止正在运行的任务 (${count} 个)`)
        }
        return wrap('当前没有正在执行的任务')
      }

      case 'tools': {
        const defaultChannelTools = getRegisteredSystemToolNames()
        const currentTools = (await this.memory.getAgentMeta('tools', null)) || defaultChannelTools
        const enabledSet = new Set(currentTools)

        if (!arg || arg === 'ls' || arg === 'list') {
          const allTools = Array.from(new Set([...defaultChannelTools, ...currentTools]))
          const lines = ['【工具状态管理】', `当前已激活工具 (共 ${enabledSet.size} 个):`]
          for (const t of allTools) {
            const status = enabledSet.has(t) ? '✅ [已启用]' : '❌ [已禁用]'
            lines.push(`  ${status} ${t}`)
          }
          lines.push('\n用法：')
          lines.push('  • /tools on <工具名1,工具名2> 开启工具')
          lines.push('  • /tools off <工具名1,工具名2> 禁用工具')
          lines.push('  • /tools reset 恢复默认工具集')
          return wrap(lines.join('\n'))
        }

        const [subCmd, ...toolArgs] = arg.split(/\s+/)
        const toolStr = toolArgs.join(' ')

        if (subCmd === 'reset') {
          await this.memory.setAgentMeta('tools', defaultChannelTools)
          return wrap('已将工具集合成功重置为系统默认配置 ✅')
        }

        if (subCmd === 'on' || subCmd === 'enable') {
          if (!toolStr) return wrap('用法：/tools on <工具名1,工具名2>')
          const targets = toolStr.split(/[,，\s]+/).filter(Boolean)
          for (const target of targets) {
            const matched = defaultChannelTools.filter(t => t === target || t.split('_mid_')[0] === target)
            if (matched.length > 0) {
              matched.forEach(m => enabledSet.add(m))
            } else {
              enabledSet.add(target)
            }
          }
          const newList = Array.from(enabledSet)
          await this.memory.setAgentMeta('tools', newList)
          return wrap(`已开启工具 [${targets.join(', ')}]，当前激活工具总计 ${newList.length} 个 ✅`)
        }

        if (subCmd === 'off' || subCmd === 'disable') {
          if (!toolStr) return wrap('用法：/tools off <工具名1,工具名2>')
          const targets = toolStr.split(/[,，\s]+/).filter(Boolean)
          for (const target of targets) {
            for (const t of Array.from(enabledSet)) {
              if (t === target || t.split('_mid_')[0] === target) {
                enabledSet.delete(t)
              }
            }
          }
          const newList = Array.from(enabledSet)
          await this.memory.setAgentMeta('tools', newList)
          return wrap(`已禁用工具 [${targets.join(', ')}]，当前激活工具总计 ${newList.length} 个 🚫`)
        }

        return wrap('未知指令，请使用 /tools ls, /tools on <工具名>, /tools off <工具名> 或 /tools reset')
      }

      case 'trigger':
      case 'triggers': {
        const service = getTriggerService()
        const registry = service.registry
        const agentId = this.memory?.agentId || 'wechat-master'

        if (!arg || arg === 'ls' || arg === 'list') {
          const list = await registry.list({ agentId })
          if (list.length === 0) {
            return wrap(
              '【触发器管理】当前未配置任何后台触发器与哨兵。\n\n提示：可以让助手通过 sentinel 自主编写并创建哨兵任务。',
            )
          }
          const lines = [
            '【后台触发器与哨兵管理】',
            `已登记触发器 (${list.length} 个):`,
          ]
          for (const t of list) {
            const status = t.enabled ? '🟢 [运行中]' : '⚪ [已禁用]'
            const modeTag = t.mode === 'once' ? '⚡一次性' : '🔄持续'
            const fires = `触发/唤醒: ${t.fireCount || 0}/${t.wakeCount || 0}`
            lines.push(
              `  ${status} [${modeTag}] ${t.id} (${t.type}) - ${fires}`,
            )
            if (t.lastFiredAt) {
              lines.push(
                `    ↳ 最近唤醒: ${new Date(t.lastFiredAt).toLocaleTimeString()}`,
              )
            }
          }
          lines.push('\n指令用法：')
          lines.push('  • /triggers on <id> 启用触发器')
          lines.push('  • /triggers off <id> 禁用触发器')
          lines.push('  • /triggers rm <id> 删除触发器')
          lines.push('  • /triggers run <id> 调试试跑一次哨兵脚本')
          return wrap(lines.join('\n'))
        }

        const [subCmd, targetId] = arg.split(/\s+/)
        if (!targetId && subCmd !== 'ls') {
          return wrap('用法：/triggers [on/off/rm/run] <触发器ID>')
        }

        if (subCmd === 'on' || subCmd === 'enable') {
          const updated = await service.enableTrigger(targetId, { agentId })
          return wrap(
            updated
              ? `触发器 "${targetId}" 已成功启用 🟢`
              : `未找到触发器 "${targetId}" ❌`,
          )
        }

        if (subCmd === 'off' || subCmd === 'disable') {
          const updated = await service.disableTrigger(targetId, { agentId })
          return wrap(
            updated
              ? `触发器 "${targetId}" 已成功禁用 ⚪`
              : `未找到触发器 "${targetId}" ❌`,
          )
        }

        if (subCmd === 'rm' || subCmd === 'delete' || subCmd === 'remove') {
          const ok = await service.removeTrigger(targetId, { agentId })
          return wrap(
            ok
              ? `触发器 "${targetId}" 及关联脚本已成功删除 🗑️`
              : `未找到触发器 "${targetId}" ❌`,
          )
        }

        if (subCmd === 'run' || subCmd === 'test') {
          try {
            const res = await service.runOnce(targetId, {
              agentId,
              forceWake: false,
            })
            if (res.wake) {
              return wrap(
                `🧪 哨兵 "${targetId}" 试跑成功，发出唤醒契约行！\n原因: ${res.reason || 'WAKE'}\n耗时: ${res.durationMs}ms`,
              )
            }
            if (res.error) {
              return wrap(
                `⚠️ 哨兵 "${targetId}" 试跑异常: ${res.error}\n耗时: ${res.durationMs}ms`,
              )
            }
            return wrap(
              `✅ 哨兵 "${targetId}" 试跑完毕，当前未满足唤醒条件。\n耗时: ${res.durationMs}ms`,
            )
          } catch (e) {
            return wrap(`❌ 执行试跑失败: ${e.message}`)
          }
        }

        return wrap(
          '未知指令，请使用 /triggers ls, /triggers on <id>, /triggers off <id>, /triggers rm <id> 或 /triggers run <id>',
        )
      }

      case 'think':
      case 'reasoning': {
        const effortMap = {
          '0': '0 (Off/关闭)',
          '1': '1 (Low/浅度思考)',
          '2': '2 (Medium/中度思考)',
          '3': '3 (High/深度思考)',
          '4': '4 (Max/极限思考)',
          'high': '3 (High/深度思考)',
          'low': '1 (Low/浅度思考)',
          'max': '4 (Max/极限思考)',
          'medium': '2 (Medium/中度思考)',
          'off': '0 (Off/关闭)',
        }
        const valMap = {
          '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
          'close': 0, 'high': 3, 'low': 1, 'max': 4, 'med': 2, 'medium': 2, 'none': 0, 'off': 0, 'ultra': 4
        }

        const currentEffort = await this.memory.getAgentMeta('reasoning_effort', 0)

        if (!arg) {
          return wrap(
            [
              `【思考/推理强度】`,
              `当前强度: ${effortMap[String(currentEffort)] || `${currentEffort} 级`}`,
              ``,
              `设置用法: /think <档位>`,
              `可选档位:`,
              `  • 0 或 off  : 关闭思考链`,
              `  • 1 或 low  : 浅度推理 / 快速思考`,
              `  • 2 或 medium : 中度推理 (默认)`,
              `  • 3 或 high : 深度推理 / 复杂解题`,
              `  • 4 或 max  : 极限推理 / 最大算力预算`,
            ].join('\n')
          )
        }

        const normalizedArg = arg.toLowerCase().trim()
        if (normalizedArg in valMap) {
          const targetLevel = valMap[normalizedArg]
          await this.memory.setAgentMeta('reasoning_effort', targetLevel)
          return wrap(`思考/推理强度已设置为: ${effortMap[String(targetLevel)]} ✅`)
        }

        return wrap(`未知档位 "${arg}"，有效档位: 0(off), 1(low), 2(medium), 3(high), 4(max)`)
      }

      case 'yolo': {
        const sid = await active()
        if (!sid) return wrap('当前无激活会话，无法设置会话级 YOLO。请先使用 /new 创建会话。')

        const normalized = arg.toLowerCase()
        if (!arg || normalized === 'status' || normalized === 'ls') {
          const enabled = this.channel?.isSessionYoloEnabled
            ? await this.channel.isSessionYoloEnabled(sid)
            : await getSessionYolo(this.memory, sid)
          return wrap(`当前会话 YOLO 模式：${enabled ? '已开启 ⚠️' : '已关闭 ✅'}\n设置用法：/yolo on 或 /yolo off`)
        }
        if (normalized !== 'on' && normalized !== 'off') {
          return wrap('用法：/yolo on|off（仅影响当前会话的所有 Shell 执行入口）')
        }

        const enabled = normalized === 'on'
        if (this.channel?.setSessionYolo) await this.channel.setSessionYolo(sid, enabled)
        else await setSessionYolo(this.memory, sid, enabled)
        return wrap(`当前会话 YOLO 模式已${enabled ? '开启 ⚠️（Shell 执行将跳过审批）' : '关闭 ✅（Shell 执行恢复审批策略）'}`)
      }

      case 'status': {
        const sid = await active()
        const session = sid ? await this.memory.getSession(sid) : null
        const yolo = sid
          ? (this.channel?.isSessionYoloEnabled
              ? await this.channel.isSessionYoloEnabled(sid)
              : await getSessionYolo(this.memory, sid))
          : false
        const tools = (await this.memory.getAgentMeta('tools', null)) || getRegisteredSystemToolNames()
        const effort = await this.memory.getAgentMeta('reasoning_effort', 0)
        const provider = this.channel?.provider || '默认'
        const model = this.channel?.model || '默认'
        const activeJobs = this.channel?.activeJobs?.size || 0
        const pendingApprovals = this.channel?.pendingConfirmations?.size || 0
        return wrap([
          '【当前状态】',
          `会话: ${sid || '无'}${session?.title ? `「${session.title}」` : ''}`,
          `YOLO: ${yolo ? '开启 ⚠️' : '关闭 ✅'}`,
          `模型: ${provider}/${model}`,
          `思考强度: ${effort}`,
          `工具: ${Array.isArray(tools) ? tools.length : 0} 个`,
          `运行中任务: ${activeJobs} 个`,
          `待确认操作: ${pendingApprovals} 个`,
        ].join('\n'))
      }

      case 'model': {
        if (!arg) {
          return wrap(
            `【当前模型】\nProvider: ${this.channel.provider || '默认 (系统推荐)'}\nModel: ${this.channel.model || '默认 (渠道主模型)'}\n\n使用「/model ls」列出可用模型\n使用「/model <模型名>」切换模型\n使用「/model reset」恢复默认`
          )
        }
        if (arg === 'ls' || arg === 'list') {
          if (typeof this.channel.llm?.getModels !== 'function') {
            return wrap('当前 LLM 驱动不支持模型列表查询')
          }
          const { models, defaultProvider } = this.channel.llm.getModels(true)
          const MAX_PER_PROVIDER = 8   // 每个 provider 最多展示模型数
          const MAX_TOTAL_CHARS = 1200 // 总字符软上限
          const lines = ['【可用模型列表】']
          for (const [provider, modelGroups] of Object.entries(models || {})) {
            const isDef = provider === defaultProvider ? ' (默认)' : ''
            lines.push(`\n[${provider}]${isDef}:`)
            const allModels = []
            if (Array.isArray(modelGroups)) {
              for (const g of modelGroups) {
                if (Array.isArray(g.models)) allModels.push(...g.models)
                else if (typeof g === 'string') allModels.push(g)
              }
            }
            const shown = allModels.slice(0, MAX_PER_PROVIDER)
            for (const m of shown) lines.push(`  • ${m}`)
            if (allModels.length > MAX_PER_PROVIDER) {
              lines.push(`  ...（共 ${allModels.length} 个，输入 /model <模型名> 直接切换）`)
            }
          }
          lines.push('\n切换命令：/model <模型名>')
          const result = lines.join('\n')
          return wrap(result.length > MAX_TOTAL_CHARS ? result.slice(0, MAX_TOTAL_CHARS) + '\n...（已截断）' : result)
        }
        if (arg === 'reset') {
          this.channel.provider = this.channel.defaultProvider
          this.channel.model = this.channel.defaultModel
          return wrap(`已重置为渠道默认模型配置：${this.channel.model || '系统默认'}`)
        }

        // 切换模型（支持 provider/model 或直接 model）
        if (arg.includes('/')) {
          const [p, m] = arg.split('/')
          this.channel.provider = p.trim()
          this.channel.model = m.trim()
        } else {
          this.channel.model = arg.trim()
        }
        return wrap(`模型已切换为：${this.channel.provider ? `${this.channel.provider}/` : ''}${this.channel.model} ✅`)
      }

      case 'sessions':
      case 'ls': {
        const list = await this.memory.listSessions()
        const cur = await active()
        return wrap(
          list.length
            ? list.map((s) => `${s.id} ${s.id === cur ? '*' : ' '} ${s.title || ''} (${s.msgCount}条)`).join('\n')
            : '暂无会话，用 /new 新建'
        )
      }

      case 'new': {
        const s = await this.memory.createSession({ title: arg || '新会话' })
        await this.memory.setActiveSession(s.id)
        return wrap(`已新建并切换到会话 ${s.id}`)
      }

      case 'use': {
        if (!arg) return wrap('用法：/use <会话id>')
        const s = await this.memory.getSession(arg)
        if (!s) return wrap(`会话 ${arg} 不存在，/sessions 查看`)
        await this.memory.setActiveSession(s.id)
        return wrap(`已切换到会话 ${s.id}`)
      }

      case 'current': {
        const cur = await active()
        if (!cur) return wrap('当前无激活会话')
        const s = await this.memory.getSession(cur)
        return wrap(`当前会话 ${cur}${s?.title ? `「${s.title}」` : ''}`)
      }

      case 'clear': {
        const cur = await active()
        if (!cur) return wrap('当前无激活会话')
        await this.memory.clearChat(cur)
        return wrap(`已清空会话 ${cur} 的聊天（记忆保留，/context 查看）`)
      }

      case 'soul': {
        if (rest[0] === 'set' && rest[1]) {
          const soul = rest.slice(1).join(' ')
          await this.memory.writeSoul(soul)
          return wrap('灵魂已重设 ✅')
        }
        const soul = await this.memory.readSoul()
        return wrap(
          soul
            ? `【灵魂】\n${soul}`
            : '【灵魂】\n当前尚未设定专属人格。\n建议直接告诉我你希望我扮演的角色（如“叫你小管家，说话幽默一点”），或输入「/soul set <设定内容>」直接配置，我会为你永久记住～'
        )
      }

      case 'memory': {
        const g = await this.memory.readAllGlobal()
        return wrap(g ? `【长期记忆】\n${g}` : '暂无长期记忆')
      }

      case 'context': {
        const cur = await active()
        const crystal = cur ? await this.memory.getCrystal(cur) : ''
        return wrap(crystal ? `【会话记忆】\n${crystal}` : '当前会话暂无结晶记忆')
      }

      case 'delete': {
        if (!arg) return wrap('用法：/delete <会话id>')
        await this.memory.deleteSession(arg)
        return wrap(`已删除会话 ${arg}`)
      }

      default:
        return wrap(`未知命令 /${name}，/help 查看可用命令`)
    }
  }
}

// 保持向下兼容别名
export const SlashCommandHandler = SlashHandler
export default SlashHandler
