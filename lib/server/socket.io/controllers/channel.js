import { getChannelRuntime } from '../../http/controllers/channelController.js'
import { MemoryStore } from '../../../../channels/memory/index.js'

/**
 * 处理 Channel 协议请求 (protocol === 'channel')
 * @param {import('../services/client.js').default} client - Socket WebUser 客户端
 * @param {object} message - 请求数据包
 */
export async function handleChannelMessage(client, message) {
  const { type, id: channelId, data = {}, request_id } = message
  const runtime = getChannelRuntime()
  const store = runtime.channelStore

  try {
    switch (type) {
      // 1. 获取会话历史 (支持 20 条分页懒加载)
      case 'history': {
        const channel = await store.get(channelId)
        if (!channel) throw new Error(`渠道 ${channelId} 未找到`)

        const agentId = channel.agentId || 'wechat-master'
        const runningEntry = runtime.running.get(channelId)
        const memory = runningEntry?.memory || new MemoryStore({ agentId, baseDir: runtime.memoryBase })
        await memory.ensure()

        let sid = await memory.getActiveSession()
        if (!sid) {
          const sessions = await memory.listSessions()
          if (sessions.length > 0) {
            sid = sessions[sessions.length - 1].id
            await memory.setActiveSession(sid)
          } else {
            const newSession = await memory.createSession({ title: 'Web 会话' })
            sid = newSession.id
            await memory.setActiveSession(sid)
          }
        }

        const session = (await memory.getSession(sid)) || { chat: [], crystal: '' }
        const chat = Array.isArray(session.chat) ? session.chat : []
        const limit = Math.max(1, parseInt(data.limit, 10) || 20)
        const before = data.before

        let endIndex = chat.length
        if (before) {
          const beforeTime = typeof before === 'number' ? before : parseInt(before, 10)
          if (!isNaN(beforeTime)) {
            const foundIdx = chat.findIndex((m) => (m.time || m.create_time_ms) >= beforeTime)
            if (foundIdx !== -1) {
              endIndex = foundIdx
            }
          }
        }

        const startIndex = Math.max(0, endIndex - limit)
        const slicedChat = chat.slice(startIndex, endIndex)

        const mappedMessages = slicedChat.map((item, idx) => {
          const isUser = item.role === 'user'
          const msgTime = item.time || item.create_time_ms || Date.now()
          let content = []
          if (Array.isArray(item.content) && item.content.length > 0) {
            content = item.content.map((elm) => {
              if (elm.type === 'reason' && elm.data) {
                const start = elm.data.startTime || (msgTime - (elm.data.duration || 1000))
                const duration = elm.data.duration || (elm.data.endTime ? elm.data.endTime - start : 1000)
                const safeDuration = duration > 0 ? duration : 1000
                return {
                  ...elm,
                  data: {
                    ...elm.data,
                    duration: safeDuration,
                    endTime: elm.data.endTime || (start + safeDuration),
                    startTime: start,
                  },
                }
              }
              return elm
            })
          } else if (item.text) {
            content = [{ data: { text: item.text }, type: 'text' }]
          } else {
            content = [{ data: { text: '' }, type: 'text' }]
          }

          return {
            content,
            id: item.id || `hist_${sid}_${startIndex + idx}_${msgTime}`,
            role: isUser ? 'user' : 'other',
            senderAvatar: isUser ? '' : (channel.avatar || ''),
            senderName: isUser ? (item.from_user_id || '用户') : (channel.name || '微信助手'),
            status: item.status || 'completed',
            time: msgTime,
            ...(item.toolCalls ? { toolCalls: item.toolCalls } : {}),
          }
        })

        const responseData = {
          channel: {
            agentId: channel.agentId,
            avatar: channel.avatar,
            id: channel.id,
            model: channel.model,
            name: channel.name,
            provider: channel.provider,
            status: runtime.isRunning(channelId) ? 'running' : (channel.status || 'stopped'),
          },
          crystal: session.crystal || '',
          hasMore: startIndex > 0,
          messages: mappedMessages,
          sessionId: sid,
          total: chat.length,
        }

        client.send({
          code: 0,
          data: responseData,
          message: 'ok',
          protocol: 'channel',
          request_id,
        })
        break
      }

      // 2. 发送消息给渠道 Bot (极轻量当前轮输入 RPC)
      case 'message': {
        const channel = await store.get(channelId)
        if (!channel) throw new Error(`渠道 ${channelId} 未找到`)

        let runningEntry = runtime.running.get(channelId)
        if (!runningEntry) {
          // 若渠道未在运行，尝试拉起
          if (channel.status === 'running' || channel.token) {
            await runtime.start(channelId).catch((err) => {
              logger?.warn?.(`[ChannelSocket] 自动拉起渠道 ${channelId} 失败:`, err.message)
            })
            runningEntry = runtime.running.get(channelId)
          }
        }

        if (!runningEntry) {
          throw new Error(`渠道「${channel.name}」当前未在运行，请先在管理面板启动该渠道`)
        }

        const messageId = data.messageId || `msg_${Date.now()}`
        const ctx = {
          channelId: channel.id,
          files: data.files || [],
          from: client.id || channel.userId || 'web-user',
          images: data.images || [],
          isWeb: true,
          messageId,
          rawFiles: data.files || [],
          rawImages: data.images || [],
          webClient: client,
        }

        // 立即确认收到请求
        client.send({
          code: 0,
          data: { messageId, status: 'processing' },
          message: 'ok',
          protocol: 'channel',
          request_id,
        })

        // 异步派发至 BaseChannel 任务执行流
        runningEntry.chn._route(data.text || '', ctx).catch((err) => {
          logger?.error?.(`[ChannelSocket] 渠道「${channel.name}」消息处理异常:`, err)
          client.sendOpenaiMessage('failed', {
            message: err.message || String(err),
            metaData: {
              contactorId: channel.id,
              messageId,
            },
          }, messageId)
        })
        break
      }

      // 3. 中断生成任务
      case 'abort': {
        const runningEntry = runtime.running.get(channelId)
        if (runningEntry?.chn) {
          const sid = await runningEntry.memory.getActiveSession()
          if (sid && runningEntry.chn.activeJobs.has(sid)) {
            const job = runningEntry.chn.activeJobs.get(sid)
            if (typeof job._abortLlm === 'function') {
              job._abortLlm()
            }
            runningEntry.chn.activeJobs.delete(sid)
          }
        }
        client.send({ code: 0, data: { success: true }, message: 'ok', protocol: 'channel', request_id })
        break
      }

      // 4. 获取与保存灵魂人格 (soul.md)
      case 'get_soul': {
        const channel = await store.get(channelId)
        if (!channel) throw new Error(`渠道 ${channelId} 未找到`)
        const memory = new MemoryStore({ agentId: channel.agentId || 'wechat-master', baseDir: runtime.memoryBase })
        const soul = await memory.readSoul()
        client.send({ code: 0, data: { soul }, message: 'ok', protocol: 'channel', request_id })
        break
      }

      case 'save_soul': {
        const channel = await store.get(channelId)
        if (!channel) throw new Error(`渠道 ${channelId} 未找到`)
        const memory = new MemoryStore({ agentId: channel.agentId || 'wechat-master', baseDir: runtime.memoryBase })
        await memory.writeSoul(data.soul || '')
        client.send({ code: 0, data: { success: true }, message: 'ok', protocol: 'channel', request_id })
        break
      }

      // 5. 获取与保存服务端记忆与结晶
      case 'get_memory': {
        const channel = await store.get(channelId)
        if (!channel) throw new Error(`渠道 ${channelId} 未找到`)
        const memory = new MemoryStore({ agentId: channel.agentId || 'wechat-master', baseDir: runtime.memoryBase })
        const globalCats = await memory.listGlobalCategories()
        const globals = {}
        for (const c of globalCats) {
          globals[c] = await memory.readGlobal(c)
        }
        const sid = await memory.getActiveSession()
        const session = sid ? await memory.getSession(sid) : null
        client.send({
          code: 0,
          data: { crystal: session?.crystal || '', globals },
          message: 'ok',
          protocol: 'channel',
          request_id,
        })
        break
      }

      case 'save_crystal': {
        const channel = await store.get(channelId)
        if (!channel) throw new Error(`渠道 ${channelId} 未找到`)
        const memory = new MemoryStore({ agentId: channel.agentId || 'wechat-master', baseDir: runtime.memoryBase })
        const sid = await memory.getActiveSession()
        if (sid) {
          await memory.setCrystal(sid, data.crystal || '')
        }
        client.send({ code: 0, data: { success: true }, message: 'ok', protocol: 'channel', request_id })
        break
      }

      case 'save_global': {
        const channel = await store.get(channelId)
        if (!channel) throw new Error(`渠道 ${channelId} 未找到`)
        const memory = new MemoryStore({ agentId: channel.agentId || 'wechat-master', baseDir: runtime.memoryBase })
        if (data.category) {
          await memory.writeGlobal(data.category, data.content || '')
        }
        client.send({ code: 0, data: { success: true }, message: 'ok', protocol: 'channel', request_id })
        break
      }

      // 6. 获取与保存工具配置
      case 'get_tools': {
        const channel = await store.get(channelId)
        if (!channel) throw new Error(`渠道 ${channelId} 未找到`)
        const memory = new MemoryStore({ agentId: channel.agentId || 'wechat-master', baseDir: runtime.memoryBase })
        const tools = await memory.getAgentMeta('tools', null)
        const toolCallMode = await memory.getAgentMeta('tool_call_mode', 'AUTO')
        client.send({
          code: 0,
          data: {
            mode: toolCallMode,
            tools: tools || [],
          },
          message: 'ok',
          protocol: 'channel',
          request_id,
        })
        break
      }

      case 'save_tools': {
        const channel = await store.get(channelId)
        if (!channel) throw new Error(`渠道 ${channelId} 未找到`)
        const memory = new MemoryStore({ agentId: channel.agentId || 'wechat-master', baseDir: runtime.memoryBase })
        if (Array.isArray(data.tools)) {
          await memory.setAgentMeta('tools', data.tools)
        }
        if (data.mode) {
          await memory.setAgentMeta('tool_call_mode', data.mode)
        }
        client.send({ code: 0, data: { success: true }, message: 'ok', protocol: 'channel', request_id })
        break
      }

      default:
        throw new Error(`未知的 Channel 协议操作: ${type}`)
    }
  } catch (err) {
    client.send({
      code: 1,
      message: err.message || '操作失败',
      protocol: 'channel',
      request_id,
    })
  }
}
