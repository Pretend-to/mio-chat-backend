/**
 * WeChat Slash 命令路由器与处理器
 *
 * 支持：/help /model /sessions /new /use /current /clear /soul /memory /context /delete
 */

export class SlashCommandHandler {
  /**
   * @param {object} opts
   * @param {import('../memory/MemoryStore.js').MemoryStore} opts.memory
   * @param {object} opts.channel 拥有 provider, model, defaultProvider, defaultModel, llm 的 WechatChannel 实例
   */
  constructor({ memory, channel }) {
    this.memory = memory
    this.channel = channel
  }

  async handle(cmd) {
    const [name, ...rest] = cmd.slice(1).trim().split(/\s+/)
    const arg = rest.join(' ').trim()
    const active = () => this.memory.getActiveSession()
    const wrap = (s) => ({ text: s })

    switch (name) {
      case 'help': {
        return wrap(
          [
            '/help 帮助',
            '/abort 停止/中止当前正在运行的任务',
            '/model [ls/name/reset] 查看或切换模型',
            '/think [0-4/off/low/medium/high/max] 管理思考推理强度',
            '/tools [ls/on/off/reset] 管理与开启/关闭工具',
            '/sessions 列出会话',
            '/new [标题] 新建会话',
            '/use <id> 切换会话',
            '/current 当前会话',
            '/clear 清空当前会话',
            '/soul 查看灵魂 | /soul set xxx 重设',
            '/memory 查看长期记忆',
            '/context 当前会话记忆',
            '/delete <id> 删除会话',
          ].join('\n')
        )
      }

      case 'abort':
      case 'stop':
      case 'cancel':
      case 'interrupt': {
        if (this.channel?.activeJobs && this.channel.activeJobs.size > 0) {
          let count = 0
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
          return wrap(`⏹️ 已成功中止正在运行的任务 (${count} 个)`)
        }
        return wrap('当前没有正在执行的任务')
      }

      case 'tools': {
        const defaultChannelTools = [
          'memory', 'search', 'draw', 'vision', 'parse', 'cron', 'toolsmanager', 'share',
          'Skill', 'reload_skills',
          'bash', 'bash_input', 'read_screen', 'wait', 'shell_policy',
          'channel_profile', 'channel_session', 'channel_model',
        ]
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
          targets.forEach(t => enabledSet.add(t))
          const newList = Array.from(enabledSet)
          await this.memory.setAgentMeta('tools', newList)
          return wrap(`已开启工具 [${targets.join(', ')}]，当前激活工具总计 ${newList.length} 个 ✅`)
        }

        if (subCmd === 'off' || subCmd === 'disable') {
          if (!toolStr) return wrap('用法：/tools off <工具名1,工具名2>')
          const targets = toolStr.split(/[,，\s]+/).filter(Boolean)
          targets.forEach(t => enabledSet.delete(t))
          const newList = Array.from(enabledSet)
          await this.memory.setAgentMeta('tools', newList)
          return wrap(`已禁用工具 [${targets.join(', ')}]，当前激活工具总计 ${newList.length} 个 🚫`)
        }

        return wrap('未知指令，请使用 /tools ls, /tools on <工具名>, /tools off <工具名> 或 /tools reset')
      }

      case 'think':
      case 'reasoning': {
        const effortMap = {
          '0': '0 (Off/关闭)',
          '1': '1 (Low/浅度思考)',
          '2': '2 (Medium/中度思考)',
          '3': '3 (High/深度思考)',
          '4': '4 (Max/极限思考)',
          'off': '0 (Off/关闭)',
          'low': '1 (Low/浅度思考)',
          'medium': '2 (Medium/中度思考)',
          'high': '3 (High/深度思考)',
          'max': '4 (Max/极限思考)',
        }
        const valMap = {
          '0': 0, 'off': 0, 'close': 0, 'none': 0,
          '1': 1, 'low': 1,
          '2': 2, 'medium': 2, 'med': 2,
          '3': 3, 'high': 3,
          '4': 4, 'max': 4, 'ultra': 4
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
          const MAX_TOTAL_CHARS = 1200 // 总字符软上限（留余量给微信协议开销）
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
          // 最终兜底截断（不应触发，但防止极端情况）
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
