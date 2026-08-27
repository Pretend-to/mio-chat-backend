/**
 * channels/llm.js — 渠道跨平台 LLM 统一对话桥接层
 *
 * 职责：
 * 1. 统一为所有渠道（微信、飞书、钉钉、Telegram 等）构造标准化内部请求事件 (Internal Event)
 * 2. 默认装配注入全量核心工具集（ai-plugin, skill-plugin, terminal-pty, channel-manager-plugin）
 * 3. 自动将 SkillService 中的技能目录注册注入到 System Prompt (<skill_registry>)
 * 4. 监听底层流式输出并利用状态机将完成的文本块和原生媒体 (图片等) 实时推送给渠道
 */

import skillService from '../lib/chat/llm/services/SkillService.js'

export function createEchoLlm({ prefix = '' } = {}) {
  return {
    getModels: () => ({ default: 'echo', models: { echo: ['echo-default'] } }),
    process: async (ctx) => ({ text: `${prefix}${ctx.text}` }),
  }
}

export function createBackendLlm(opts = {}) {
  const customService = opts.llmService || null

  return {
    getModels: (isAdmin = true) => {
      const svc = customService || (typeof global !== 'undefined' && global.middleware?.llm)
      if (!svc || typeof svc.getModelList !== 'function') {
        return { default: 'echo', models: {} }
      }
      return {
        defaultProvider: typeof svc._getDefaultProvider === 'function' ? svc._getDefaultProvider() : 'openai',
        models: svc.getModelList(isAdmin) || {},
      }
    },

    process: async (ctx) => {
      const svc = customService || (typeof global !== 'undefined' && global.middleware?.llm)
      if (!svc) {
        return { text: `[Echo] ${ctx.text}` }
      }

      const messages = []

      // 1. 组装 System Prompt（包含灵魂设定、全局长期记忆、会话结晶、技能目录）
      const systemSections = []
      if (ctx.soul?.trim()) {
        systemSections.push(`【你的灵魂设定与行为准则】\n${ctx.soul.trim()}`)
      } else {
        systemSections.push('【灵魂设定】\n当前尚未设定专属灵魂人格 (Soul)。你可以使用 `channel_profile(action="update", soul="...")` 工具自主设定并保存你的人格特征。')
      }

      if (ctx.globalMem?.trim()) {
        systemSections.push(`【关于用户的全局长期记忆与稳定事实】\n${ctx.globalMem.trim()}`)
      }

      if (ctx.crystal?.trim()) {
        systemSections.push(`【当前会话的上下文结晶摘要】\n${ctx.crystal.trim()}`)
      }

      systemSections.push([
        '【工具使用与自治能力】',
        '你可以使用 `channel_profile` 自主管理自身灵魂，使用 `channel_session` 管理会话历史，使用 `channel_model` 切换底层模型，使用 `toolsmanager` 管理所有工具开闭，使用 `memory` 记录用户事实，使用 `bash` 执行终端命令，使用 `Skill` 加载专家能力。',
      ].join('\n'))

      // 注入技能目录 (<skill_registry>)
      const skillsBlock = skillService?.buildSystemPromptBlock ? skillService.buildSystemPromptBlock() : ''
      if (skillsBlock) {
        systemSections.push(skillsBlock)
      }

      // 注入渠道专属交互风格 Prompt（如微信的口语化、简短、<msg>分条机制）
      if (ctx.channel && typeof ctx.channel.getChannelPrompt === 'function') {
        const channelPrompt = ctx.channel.getChannelPrompt()
        if (channelPrompt?.trim()) {
          systemSections.push(channelPrompt.trim())
        }
      }

      messages.push({
        content: systemSections.join('\n\n'),
        role: 'system',
      })

      // 2. 带入多轮会话历史 (chat: [{ role, text }])
      const chatHistoryCount = Array.isArray(ctx.chat) ? ctx.chat.length : 0
      if (Array.isArray(ctx.chat)) {
        for (const item of ctx.chat) {
          if (!item || !item.text) continue
          const role = item.role === 'assistant' ? 'assistant' : 'user'
          messages.push({ content: item.text, role })
        }
      }

      // 3. 当前最新用户输入
      messages.push({ content: ctx.text, role: 'user' })

      // 详细打印消息组装诊断日志
      const log = ctx.channel?.log || console
      log.info?.(`[${ctx.channel?.channelType || 'channel'}] 🧩 消息链拼装完成: 总消息数=${messages.length} (System段数=${systemSections.length}, 历史轮数=${chatHistoryCount}, 当前输入="${ctx.text.slice(0, 30)}")`)
      log.info?.(`[${ctx.channel?.channelType || 'channel'}] 🧠 记忆载入详情: Soul=${ctx.soul ? '已设定' : '无'}, GlobalMem=${ctx.globalMem ? `${ctx.globalMem.length}字` : '无'}, Crystal=${ctx.crystal ? `${ctx.crystal.length}字` : '无'}`)

      // 4. 确定使用的 provider 与 model
      const targetProvider = ctx.provider || (typeof svc._getDefaultProvider === 'function' ? svc._getDefaultProvider() : undefined)
      let targetModel = ctx.model || null

      if (!targetModel && targetProvider && svc.llms) {
        const instanceId = Array.isArray(targetProvider)
          ? targetProvider[0]
          : targetProvider
        const inst = svc.llms[instanceId]
        if (inst?.models?.[0]?.models?.[0]) {
          targetModel = inst.models[0].models[0]
        }
      }

      const emittedImages = new Set()

      // 5. 构造虚拟 Event
      let currentTextBlock = ''
      let currentBlockType = 'idle'
      let streamError = null

      /**
       * 将累积的完整文本块原样交给渠道，由渠道适配器（如 WechatChannel.splitTextToSegments）
       * 按自身协议（<msg>/<break/>）统一切分，再经伪队列逐条发送。
       * 该层不再解析任何分隔符，避免 llm 层与 channel 层双份切分导致重复发送。
       */
      const flushTextBlock = async () => {
        let textToSend = currentTextBlock.trim()
        currentTextBlock = '' // ← 先清空，防止 re-entrant 重复 emit
        if (!textToSend) {
          return
        }
        if (typeof ctx.onEmitTextBlock === 'function') {
          await ctx.onEmitTextBlock(textToSend)
        }
      }

      const defaultChannelTools = [
        // ai-plugin
        'memory', 'search', 'draw', 'vision', 'parse', 'cron', 'toolsmanager',
        // skill-plugin
        'Skill', 'reload_skills',
        // terminal-pty
        'bash', 'bash_input', 'read_screen', 'wait', 'shell_policy',
        // channel-manager-plugin
        'channel_profile', 'channel_session', 'channel_model',
      ]

      const event = {
        body: {
          channel: ctx.channel?.channelType || 'channel',
          messages,
          settings: {
            base: {
              model: targetModel,
              stream: true,
            },
            chatParams: { reasoning_effort: 0 },
            crystallization: { enabled: true },
            crystallization_token_watermark: 'auto',
            previous_summary: ctx.crystal || '',
            provider: targetProvider,
            toolCallSettings: {
              mode: 'AUTO',
              tools: defaultChannelTools,
            },
          },
        },
        channel: ctx.channel || {
          agentId: ctx.agentId || 'channel-master',
          memory: ctx.memory,
          model: ctx.model,
          provider: ctx.provider,
          type: 'channel',
        },
        client: {
          emit: () => {},
          on: () => {},
          popConnection: () => {},
          popEvent: () => {},
          pushConnection: () => {},
          pushEvent: () => {},
          removeListener: () => {},
          sendOpenaiMessage: () => {},
        },
        registerInteraction: async (interactionId, callback) => {
          if (ctx.channel && typeof ctx.channel.requestUserConfirmation === 'function') {
            try {
              const approved = await ctx.channel.requestUserConfirmation({
                title: '终端/敏感命令执行审批',
                description: `LLM 正在申请执行命令，是否授权？`,
                from: ctx.from,
                contextToken: ctx.contextToken,
              })
              callback({ approved })
            } catch (err) {
              callback({ approved: false, reason: err.message })
            }
          } else {
            callback({ approved: true })
          }
        },
        unregisterInteraction: () => true,
        emitInteraction: () => true,
        error: (err) => {
          streamError = err
        },
        onAbort: () => {},
        pending: () => {},
        reply: () => {},
        requestId: `${ctx.channel?.channelType || 'channel'}_${ctx.sessionId || Date.now()}_${Date.now()}`,
        update: async (data) => {
          if (!data) return
          if (data.type === 'content') {
            currentBlockType = 'text'
            if (typeof data.content === 'string') {
              currentTextBlock += data.content
            }
            // 同步阶段性输出到 activeJob
            if (ctx.channel?.activeJobs && ctx.sessionId && ctx.channel.activeJobs.has(ctx.sessionId)) {
              const job = ctx.channel.activeJobs.get(ctx.sessionId)
              job.lastProgressText = currentTextBlock.slice(0, 100)
            }
            // 不做实时 <msg>/<break/> 切分：文本统一在 flush 边界整块交给渠道，
            // 由渠道适配器（WechatChannel.splitTextToSegments）统一切分后经伪队列发送，
            // 避免 llm 层与 channel 层双份解析导致重复发送。
          } else {
            if (currentBlockType === 'text') {
              await flushTextBlock()
            }
            // 同步正在执行的工具到 activeJob
            if (data.type === 'toolCall' && ctx.channel?.activeJobs && ctx.sessionId && ctx.channel.activeJobs.has(ctx.sessionId)) {
              const job = ctx.channel.activeJobs.get(ctx.sessionId)
              if (data.content?.action === 'running') {
                job.currentTool = data.content.name || '工具'
                job.toolCount = (job.toolCount || 0) + 1
              } else if (data.content?.action === 'finished') {
                job.currentTool = null
              }
            }
            // 严格以 extraRender（如 setOuterRender / setExtraRender）作为富媒体渲染的唯一协议契约
            if (data.type === 'toolCall' || data.type === 'extraRender') {
              const toolPayload = data.content || data
              const renders = [
                ...(Array.isArray(toolPayload?.extraRender) ? toolPayload.extraRender : (toolPayload?.extraRender ? [toolPayload.extraRender] : [])),
                ...(Array.isArray(data.extraRender) ? data.extraRender : (data.extraRender ? [data.extraRender] : [])),
              ]

              // 仅扫描 extraRender 中的规范渲染项
              for (const r of renders) {
                if (r?.type === 'image' && r.url && !emittedImages.has(r.url)) {
                  emittedImages.add(r.url)
                  if (typeof ctx.onEmitTextBlock === 'function') {
                    await ctx.onEmitTextBlock('', { extraRender: r, image: r.url })
                  }
                }
              }
            }
          }
        },
        user: {
          agentId: ctx.agentId || 'channel-master',
          channel: ctx.channel?.channelType || 'channel',
          channelType: ctx.channel?.channelType || 'channel',
          id: ctx.from || 'channel_master',
          isAdmin: true,
          role: 'admin',
          username: 'ChannelMaster',
        },
      }

      // 等待底层 LLM 完整运行完毕（包含所有递归工具轮次）
      await new Promise((resolve, reject) => {
        let isDone = false
        event.complete = async () => {
          if (isDone) return
          isDone = true
          try {
            if (currentBlockType === 'text' || currentTextBlock.trim()) {
              await flushTextBlock()
            }
            currentBlockType = 'idle'
            resolve()
          } catch (e) {
            reject(e)
          }
        }

        event.error = (err) => {
          if (isDone) return
          isDone = true
          streamError = err
          reject(err)
        }

        svc.handleMessage(event).catch((err) => {
          if (isDone) return
          isDone = true
          reject(err)
        })
      })

      if (streamError) {
        throw streamError
      }

      await flushTextBlock()
      return { completed: true }
    },
  }
}

export default { createBackendLlm, createEchoLlm }
