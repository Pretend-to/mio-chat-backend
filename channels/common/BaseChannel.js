/**
 * BaseChannel — 多渠道（微信、飞书、钉钉、Telegram、QQ 等）统一抽象基类
 *
 * 核心架构与职责：
 * 1. 统一渠道生命周期管理 (start, stop, error handling)；
 * 2. 统一消息路由与通用 Slash 处理器 (SlashHandler)；
 * 3. 统一高危动作挂起确认拦截器 (ConfirmationManager)；
 * 4. 统一保活与心跳检查管理器 (KeepAliveManager)；
 * 5. 统一流式响应、多模态分发流水线 (Image/Voice/File/Video/Text) 与降级通知；
 * 6. 统一持久化与会话记忆结晶 (MemoryStore)。
 */

import { SlashHandler } from './SlashHandler.js'
import { ConfirmationManager } from './ConfirmationManager.js'
import { KeepAliveManager } from './KeepAliveManager.js'
import { MediaResolver } from './MediaResolver.js'
import { getSessionYolo, setSessionYolo } from '../../lib/chat/sessionExecutionState.js'
import sessions from '../../lib/server/socket.io/services/sessions.js'

export class BaseChannel {
  /**
   * @param {object} opts
   * @param {object} opts.client      底层协议客户端实现
   * @param {import('../memory/MemoryStore.js').MemoryStore} opts.memory     会话与记忆存储
   * @param {string} opts.masterId   绑定主用户 UID
   * @param {object} opts.llm        LLM 处理器
   * @param {string} [opts.channelType='base'] 渠道标识（如 'wechat', 'feishu', 'dingtalk'）
   * @param {string} [opts.provider] 大模型提供商
   * @param {string} [opts.model]    大模型名称
   * @param {boolean} [opts.typing=true] 是否启用打字中状态反馈
   * @param {object} [opts.keepAlive] 保活配置
   * @param {object} [opts.logger=console] 日志输出
   * @param {Function} [opts.onActivity] 活跃状态回调
   */
  constructor({
    client,
    memory,
    masterId,
    llm,
    channelType = 'base',
    provider = null,
    model = null,
    typing = true,
    keepAlive = {},
    logger = console,
    onActivity = null,
    id = null,
    channelId = null,
  }) {
    if (!client || !memory || !masterId) {
      throw new Error(`[${this.constructor.name}] requires client, memory, and masterId`)
    }
    this.id = id || channelId || (memory && memory.agentId) || channelType
    this.channelId = this.id
    this.client = client
    this.memory = memory
    this.masterId = masterId
    this.llm = llm
    this.channelType = channelType
    this.provider = provider
    this.model = model
    this.defaultProvider = provider
    this.defaultModel = model
    this.typing = typing
    this.log = logger
    this.onActivity = onActivity
    this.activeJobs = new Map() // sessionId -> { startTime, text, currentTool, toolCount, lastProgressText }
    this._sessionQueues = new Map() // sessionId -> Promise chain (FIFO 互斥队列)
    this._sessionYolo = new Map()

    this.running = false
    this._abort = null

    // 初始化子系统
    this.confirmations = new ConfirmationManager({ channel: this })
    this.slashHandler = new SlashHandler({ channel: this, memory: this.memory })
    this.keepAlive = new KeepAliveManager({
      client: this.client,
      config: keepAlive,
      logger: this.log,
      masterId: this.masterId,
      memory: this.memory,
    })
  }

  /** 兼容性 getter：直接访问 pendingConfirmations Map */
  get pendingConfirmations() {
    return this.confirmations.pendingConfirmations
  }

  // ===============================================================
  // 抽象方法（由具体渠道子类实现协议特异性）
  // ===============================================================

  /** 从原始入站数据包中提取文本消息 */
  extractText(msg) {
    throw new Error('extractText(msg) must be implemented by subclass')
  }

  /** 构造下行文本消息数据包 */
  buildSendMsg({ to, text, contextToken }) {
    throw new Error('buildSendMsg() must be implemented by subclass')
  }

  /** 发送原始下行数据包至渠道服务端 */
  async doSendMessage(payload) {
    throw new Error('doSendMessage() must be implemented by subclass')
  }

  /** 发送原生图片（Buffer 或 URL） */
  async doSendImage({ to, contextToken, buffer, url, localPath }) {
    throw new Error('doSendImage() must be implemented by subclass')
  }

  /** 发送原生语音（Buffer 或 URL，自动转码为 Silk） */
  async doSendVoice({ to, contextToken, buffer, url, localPath, text, durationMs }) {
    throw new Error('doSendVoice() must be implemented by subclass')
  }

  /** 发送原生文件（Buffer 或 URL） */
  async doSendFile({ to, contextToken, buffer, url, localPath, fileName }) {
    throw new Error('doSendFile() must be implemented by subclass')
  }

  /** 发送原生视频（Buffer 或 URL） */
  async doSendVideo({ to, contextToken, buffer, url, localPath, durationMs }) {
    throw new Error('doSendVideo() must be implemented by subclass')
  }

  /** 发送打字中状态反馈 */
  async doSendTyping(ctx, status) {
    // 默认空操作，子类按需覆写
  }

  /** 渠道专属回复风格与格式系统提示词（子类按需覆写） */
  getChannelPrompt() {
    return ''
  }

  /**
   * 将一段完整文本块切分为渠道最终落地的独立消息段（默认不切分、整段发送）。
   * 微信覆写：按 <msg>...</msg> / <break/> 拆分为多条微信气泡。
   */
  splitTextToSegments(text, ctx = {}) {
    const t = (text || '').trim()
    return t ? [t] : []
  }

  /** 渠道主长轮询/接收循环 */
  async _loop() {
    throw new Error('_loop() must be implemented by subclass')
  }

  // ===============================================================
  // 生命周期与保活管理
  // ===============================================================
  async start() {
    this.running = true
    this._abort = new AbortController()
    if (this.memory) {
      try {
        this.latestContextToken = await this.memory.getAgentMeta('latestContextToken', null)
      } catch {}
    }
    this.keepAlive.start()
    this._loop().catch((e) => {
      this.log?.error?.(`[${this.channelType}] 运行主循环异常:`, e)
    })
  }

  async stop() {
    this.running = false
    this.keepAlive.stop()
    this.confirmations.clear()
    if (this._abort) {
      this._abort.abort()
      this._abort = null
    }
  }

  /**
   * Session-scoped shell approval override used by /yolo. The persisted map
   * keeps the setting stable across channel restarts while the local cache
   * avoids another metadata read for every shell tool call.
   */
  async isSessionYoloEnabled(sessionId) {
    if (!sessionId) return false
    if (this._sessionYolo.has(sessionId)) return this._sessionYolo.get(sessionId)
    const enabled = await getSessionYolo(this.memory, sessionId)
    this._sessionYolo.set(sessionId, enabled)
    return enabled
  }

  async setSessionYolo(sessionId, enabled) {
    const value = await setSessionYolo(this.memory, sessionId, enabled)
    this._sessionYolo.set(sessionId, value)
    return value
  }

  // ===============================================================
  // 消息路由、确认拦截与临时插话处理
  // ===============================================================
  async _safeSend(from, contextToken, text) {
    const targetToken = contextToken || this.latestContextToken || null
    try {
      for (const seg of this.splitTextToSegments(text, { contextToken: targetToken, from })) {
        const payload = this.buildSendMsg({
          contextToken: targetToken,
          fromBot: this.client.botId,
          text: seg,
          to: from,
        })
        await this.doSendMessage(payload)
      }
    } catch {}
  }

  /** 高危动作挂起确认代理 */
  requestConfirmation({ description, title = '安全操作确认', ...options }, ctx) {
    return this.confirmations.request({ description, title, ...options }, ctx)
  }

  /** 高危动作用户输入拦截检查代理 */
  _handlePendingConfirmation(text, ctx) {
    return this.confirmations.handleMessage(text, ctx)
  }

  /** 统一消息路由入口：拦截确认 -> Slash 指令 -> 任务忙临时插话 -> 正式对话处理 */
  async _route(text, ctx) {
    if (ctx?.contextToken) {
      this.latestContextToken = ctx.contextToken
      if (this.memory) {
        this.memory.setAgentMeta('latestContextToken', ctx.contextToken).catch(() => {})
      }
    }

    // 0. 保活：记录用户活动时间并缓存 contextToken（对齐重构前 handleIncomingMessage 行为）
    await this.keepAlive.recordActivity(ctx?.contextToken || this.latestContextToken || null)

    // 1. 优先检查高危操作确认回复
    if (this._handlePendingConfirmation(text, ctx)) {
      return
    }

    // 2. 检查 Slash 斜杠指令（如 /abort, /crush, /model, /tools 等）
    if (text.trim().startsWith('/')) {
      const slashRes = await this.slashHandler.handle(text.trim(), ctx)
      if (slashRes?.text) {
        if (ctx.isWeb && ctx.webClient && ctx.messageId) {
          const metaData = {
            contactorId: ctx.channelId,
            messageId: ctx.messageId,
          }
          ctx.webClient.sendOpenaiMessage('update', {
            content: slashRes.text,
            metaData,
            type: 'content',
          }, ctx.messageId)
          ctx.webClient.sendOpenaiMessage('complete', {
            metaData,
          }, ctx.messageId)
        } else {
          await this._safeSend(ctx.from, ctx.contextToken, slashRes.text)
        }
      }
      return slashRes
    }

    // 3. 检查当前会话是否已有正在运行的 LLM 任务（插话机制 vs 任务排队）
    const sid = ctx.sid || (await this.memory.getActiveSession())
    if (sid && this.activeJobs.has(sid) && !ctx.isTask && !ctx.isWake && !ctx.forceQueue) {
      const activeJob = this.activeJobs.get(sid)
      return this._handleTransientFollowup(text, activeJob, ctx)
    }

    // 4. 正常发起 LLM 对话处理（进入 Session FIFO 互斥队列排队）
    return this._enqueueSession(sid, () => this._processChat(text.trim(), ctx))
  }

  /**
   * 针对指定 sessionId 的主会话 FIFO 互斥执行队列
   * 确保同一个 session 的主会话（写入历史、更新记忆）串行安全执行，旁对话无需进队列
   */
  async _enqueueSession(sid, fn) {
    if (!sid) return await fn()
    if (!this._sessionQueues) {
      this._sessionQueues = new Map()
    }
    const prevPromise = this._sessionQueues.get(sid) || Promise.resolve()
    const nextPromise = (async () => {
      try {
        await prevPromise
      } catch {}
      return await fn()
    })()
    const cleanPromise = nextPromise.catch(() => {}).finally(() => {
      if (this._sessionQueues.get(sid) === cleanPromise) {
        this._sessionQueues.delete(sid)
      }
    })
    this._sessionQueues.set(sid, cleanPromise)
    return await nextPromise
  }

  /**
   * 向指定 session 追加一条 user 消息并触发完整处理管线（支持 Cron、Trigger、外部调用）
   * @param {string} sessionId - 目标会话 ID
   * @param {string} text - 消息正文
   * @param {object} [options] - 附加选项 (isTask, isWake, from, triggerId 等)
   */
  async appendUserMessage(sessionId, text, options = {}) {
    const targetSid = sessionId || (await this.memory.getActiveSession())
    const ctx = {
      channelId: this.id || this.channelId,
      from: options.from || 'system_trigger',
      isTask: Boolean(options.isTask || options.isWake),
      isWake: Boolean(options.isWake),
      sid: targetSid,
      triggerId: options.triggerId || null,
      ...options,
    }
    return this._enqueueSession(targetSid, () => this._processChat(text.trim(), ctx))
  }

  /** 处理任务执行中途的用户即时插话 */
  async _handleTransientFollowup(text, activeJob, ctx) {
    const elapsedSec = Math.floor((Date.now() - activeJob.startTime) / 1000)
    const promptStatus = [
      `【系统上下文 - 即时任务状态】`,
      `你之前正在处理用户的上一条任务：${JSON.stringify(activeJob.text)}`,
      `当前任务已持续耗时：${elapsedSec} 秒`,
      activeJob.currentTool ? `当前正在执行的工具：${activeJob.currentTool}` : '',
      activeJob.lastProgressText ? `上一步阶段性说明：${activeJob.lastProgressText}` : '',
      '',
      `用户刚刚又发送了一条即时消息：${JSON.stringify(text)}`,
      '',
      `【回复要求】：`,
      `1. 这是一次即时插话交互，请以自然、亲切、简短的口吻（1~2 句话）向用户反馈你当前正在全力处理上个任务的最新进度，或对他的临时疑问做快速解答；`,
      `2. 不要重复调用重度工具，直接输出文本；`,
      `3. 依然可以使用 <msg>...</msg> 分条。`,
    ].filter(Boolean).join('\n')

    try {
      this.doSendTyping(ctx, 1).catch(() => {})
      const reply = await this.llm.process({
        agentId: this.memory.agentId,
        channel: this,
        chat: [],
        contextToken: ctx.contextToken || this.latestContextToken || null,
        crystal: '',
        from: ctx.from,
        globalMem: '',
        guidance: false,
        memory: this.memory,
        model: this.model,
        onEmitTextBlock: async (msgContent) => {
          if (msgContent?.trim()) {
            await this._safeSend(ctx.from, ctx.contextToken || this.latestContextToken, msgContent.trim())
          }
        },
        provider: this.provider,
        sessionId: `transient_${ctx.sid}_${Date.now()}`,
        soul: (await this.memory.readSoul()) || '',
        text: promptStatus,
      })
      if (reply?.text?.trim()) {
        await this._safeSend(ctx.from, ctx.contextToken || this.latestContextToken, reply.text.trim())
      }
    } catch (e) {
      this.log?.warn?.(`[${this.channelType}] 临时插话回复失败: ${e.message}`)
      await this._safeSend(ctx.from, ctx.contextToken || this.latestContextToken, `我正在后台全力处理刚才的任务（已运行 ${elapsedSec}s），马上就好哦～`)
    }
  }

  // ===============================================================
  // 核心对话处理、多模态流式流水线与持久化落盘
  // ===============================================================
  async _processChat(text, ctx) {
    if (this.onActivity) {
      this.onActivity()
    }
    const soul = await this.memory.readSoul()
    const globalMem = await this.memory.readAllGlobal()
    let sid = ctx.sid || (await this.memory.getActiveSession())
    if (!sid) {
      const s = await this.memory.createSession({ title: '默认会话' })
      await this.memory.setActiveSession(s.id)
      sid = s.id
    }
    const crystal = await this.memory.getCrystal(sid)
    const pendingMemories = (typeof this.memory.getPendingMemories === 'function')
      ? await this.memory.getPendingMemories(sid)
      : []
    const session = await this.memory.getSession(sid)
    const chat = session?.chat || []

    ctx.channelId = ctx.channelId || this.channelId || this.id || this.memory?.agentId

    // 当消息来自第三方渠道（!ctx.isWeb）时，若 Web 客户端在线，向其广播用户消息并建立 Blank 占位
    if (!ctx.isWeb) {
      const userMsgId = ctx.userMessageId || `msg_u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const assistantMsgId = ctx.messageId || `msg_a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      ctx.messageId = assistantMsgId

      const onlineWebClients = sessions.getAllAdminClients()
      if (onlineWebClients && onlineWebClients.length > 0) {
        const userMsgContent = [{ data: { text }, type: 'text' }]
        const imgList = ctx.rawMsg?.images || ctx.images || null
        if (Array.isArray(imgList)) {
          for (const img of imgList) {
            userMsgContent.push({ data: { file: img }, type: 'image' })
          }
        }
        if (Array.isArray(ctx.files)) {
          for (const f of ctx.files) {
            userMsgContent.push({ data: { file: f.url, name: f.name }, type: 'file' })
          }
        }
        for (const client of onlineWebClients) {
          client.send({
            data: {
              assistantMessageId: assistantMsgId,
              contactorId: ctx.channelId,
              userMessage: {
                content: userMsgContent,
                id: userMsgId,
                role: 'user',
                text,
                time: Date.now(),
              },
            },
            protocol: 'channel',
            type: 'channel_user_message',
          })
        }
      }
    }

    const emittedBlocks = []
    let didEmitTextBlock = false
    const supportsPersistenceLifecycle = typeof this.memory.beginAssistantMessage === 'function'
      && typeof this.memory.finalizeAssistantMessage === 'function'
    let assistantPersistenceId = null
    let persistenceQueue = Promise.resolve()
    let userPersistedBeforeLlm = false

    if (supportsPersistenceLifecycle) {
      let finalUserText = text
      const imageList = ctx.rawMsg?.images || ctx.images || null
      if (Array.isArray(imageList) && imageList.length > 0) {
        for (const image of imageList) {
          if (!finalUserText.includes(`![图片](${image})`)) finalUserText += `\n![图片](${image})`
        }
      }
      const persistUser = typeof this.memory.appendUserMessage === 'function'
        ? this.memory.appendUserMessage.bind(this.memory)
        : this.memory.appendToChat.bind(this.memory)
      await persistUser(sid, {
        content: [{ data: { text: finalUserText }, type: 'text' }],
        from_user_id: ctx.from,
        role: 'user',
        text: finalUserText,
        time: ctx.time || ctx.rawMsg?.time || Date.now(),
      })
      userPersistedBeforeLlm = true
      assistantPersistenceId = await this.memory.beginAssistantMessage(sid, {
        content: [],
        id: ctx.messageId,
        role: 'assistant',
        text: '',
        time: Date.now(),
      })
    }
    const activeJobObj = {
      _abortLlm: null,
      abort: () => {
        if (typeof activeJobObj._abortLlm === 'function') {
          activeJobObj._abortLlm()
        }
      },
      currentTool: null,
      lastProgressText: '',
      startTime: Date.now(),
      text,
      toolCount: 0,
    }
    this.activeJobs.set(sid, activeJobObj)

    let typingTimer = null
    try {
      if (!ctx.isWeb) {
        this.doSendTyping(ctx, 1).catch(() => {})
        typingTimer = setInterval(() => {
          this.doSendTyping(ctx, 1).catch(() => {})
        }, 4000)
      }

      let sendQueue = Promise.resolve()
      let lastSendTimeMs = 0

      // 流式分发回调：检测到完整文本块或多模态 extraRender 时进入串行发送流水线
      const onEmitTextBlock = (textBlock, meta = {}) => {
        didEmitTextBlock = true
        if (assistantPersistenceId && typeof this.memory.appendAssistantChunk === 'function') {
          const render = meta.extraRender || {}
          persistenceQueue = persistenceQueue
            .then(() => this.memory.appendAssistantChunk(assistantPersistenceId, 'semantic_block', {
              render: {
                fileName: render.fileName || render.name || null,
                localPath: render.localPath || null,
                type: render.type || null,
                url: render.imageUrl || render.audioUrl || render.fileUrl || render.videoUrl || render.url || null,
              },
              text: textBlock || '',
            }))
            .catch((error) => {
              this.log?.error?.(`[${this.channelType}] 流式语义块持久化失败: ${error.message}`)
            })
        }
        if (ctx.isWeb) {
          // Web 客户端已通过 Socket 实时流推送，无需向第三方 IM 网关重复发送
          return Promise.resolve()
        }
        sendQueue = sendQueue.then(async () => {
          // 1. 原生图片下发 (Image)
          if (meta.image || meta.extraRender?.type === 'image' || meta.extraRender?.imageUrl) {
            const imgUrl = meta.image || meta.extraRender?.imageUrl || meta.extraRender?.url
            const imgBuffer = meta.imageBuffer || meta.extraRender?.buffer
            const localPath = meta.extraRender?.localPath
            this.log?.info?.(`[${this.channelType}] 🖼️ 正在发送原生图片: ${imgUrl || localPath || 'buffer'}`)
            try {
              await this.doSendImage({
                buffer: imgBuffer,
                contextToken: ctx.contextToken,
                localPath,
                to: ctx.from,
                url: imgUrl,
              })
            } catch (e) {
              this.log?.warn?.(`[${this.channelType}] ⚠️ 原生图片发送失败 (${e.message})，降级为图文通知`)
              if (imgUrl) {
                const noticeText = `🖼️ [图片已生成]\n查看原图: ${imgUrl}`
                emittedBlocks.push(noticeText)
                const payload = this.buildSendMsg({
                  contextToken: ctx.contextToken,
                  fromBot: this.client.botId,
                  text: noticeText,
                  to: ctx.from,
                })
                await this.doSendMessage(payload).catch(() => {})
              }
            }
            await new Promise((r) => setTimeout(r, 100))
          }

          // 2. 原生语音下发 (Audio / Voice - Silk 转码)
          else if (meta.audio || meta.extraRender?.type === 'audio' || meta.extraRender?.type === 'voice' || meta.extraRender?.audioUrl) {
            const audioUrl = meta.audio || meta.extraRender?.audioUrl || meta.extraRender?.url
            const audioBuffer = meta.audioBuffer || meta.extraRender?.buffer
            const localPath = meta.extraRender?.localPath
            const durationMs = meta.extraRender?.durationMs || meta.extraRender?.duration
            const audioText = meta.extraRender?.text || meta.extraRender?.title || ''
            this.log?.info?.(`[${this.channelType}] 🎙️ 正在发送原生语音: ${audioUrl || localPath || 'buffer'}`)
            try {
              await this.doSendVoice({
                buffer: audioBuffer,
                contextToken: ctx.contextToken,
                durationMs,
                localPath,
                text: audioText,
                to: ctx.from,
                url: audioUrl,
              })
            } catch (e) {
              this.log?.warn?.(`[${this.channelType}] ⚠️ 原生语音发送失败 (${e.message})，降级为链接通知`)
              if (audioUrl) {
                const noticeText = `🎙️ [语音消息]\n音频链接: ${audioUrl}`
                emittedBlocks.push(noticeText)
                const payload = this.buildSendMsg({
                  contextToken: ctx.contextToken,
                  fromBot: this.client.botId,
                  text: noticeText,
                  to: ctx.from,
                })
                await this.doSendMessage(payload).catch(() => {})
              }
            }
            await new Promise((r) => setTimeout(r, 100))
          }

          // 3. 原生文件下发 (File / Document)
          else if (meta.file || meta.extraRender?.type === 'file' || meta.extraRender?.type === 'document' || meta.extraRender?.fileUrl) {
            const fileUrl = meta.file || meta.extraRender?.fileUrl || meta.extraRender?.url
            const fileBuffer = meta.fileBuffer || meta.extraRender?.buffer
            const localPath = meta.extraRender?.localPath
            const fileName = meta.extraRender?.fileName || meta.extraRender?.name || (fileUrl ? fileUrl.split('/').pop() : 'file')
            this.log?.info?.(`[${this.channelType}] 📁 正在发送原生文件: ${fileName}`)
            try {
              await this.doSendFile({
                buffer: fileBuffer,
                contextToken: ctx.contextToken,
                fileName,
                localPath,
                to: ctx.from,
                url: fileUrl,
              })
            } catch (e) {
              this.log?.warn?.(`[${this.channelType}] ⚠️ 原生文件发送失败 (${e.message})，降级为下载链接`)
              if (fileUrl) {
                const noticeText = `📁 [文件分享: ${fileName}]\n下载链接: ${fileUrl}`
                emittedBlocks.push(noticeText)
                const payload = this.buildSendMsg({
                  contextToken: ctx.contextToken,
                  fromBot: this.client.botId,
                  text: noticeText,
                  to: ctx.from,
                })
                await this.doSendMessage(payload).catch(() => {})
              }
            }
            await new Promise((r) => setTimeout(r, 100))
          }

          // 4. 原生视频下发 (Video)
          else if (meta.video || meta.extraRender?.type === 'video' || meta.extraRender?.videoUrl) {
            const videoUrl = meta.video || meta.extraRender?.videoUrl || meta.extraRender?.url
            const videoBuffer = meta.videoBuffer || meta.extraRender?.buffer
            const localPath = meta.extraRender?.localPath
            const durationMs = meta.extraRender?.durationMs || meta.extraRender?.duration
            this.log?.info?.(`[${this.channelType}] 🎬 正在发送原生视频: ${videoUrl || localPath || 'buffer'}`)
            try {
              await this.doSendVideo({
                buffer: videoBuffer,
                contextToken: ctx.contextToken,
                durationMs,
                localPath,
                to: ctx.from,
                url: videoUrl,
              })
            } catch (e) {
              this.log?.warn?.(`[${this.channelType}] ⚠️ 原生视频发送失败 (${e.message})，降级为视频链接通知`)
              if (videoUrl) {
                const noticeText = `🎬 [视频消息]\n视频链接: ${videoUrl}`
                emittedBlocks.push(noticeText)
                const payload = this.buildSendMsg({
                  contextToken: ctx.contextToken,
                  fromBot: this.client.botId,
                  text: noticeText,
                  to: ctx.from,
                })
                await this.doSendMessage(payload).catch(() => {})
              }
            }
            await new Promise((r) => setTimeout(r, 100))
          }

          // 5. 文本分条下发
          if (textBlock?.trim()) {
            const segments = this.splitTextToSegments(textBlock.trim(), ctx)
            for (const seg of segments) {
              emittedBlocks.push(seg)
              this.log?.info?.(`[${this.channelType}] 🤖 实时推送文本块: "${seg.slice(0, 50)}${seg.length > 50 ? '...' : ''}"`)
              const now = Date.now()
              lastSendTimeMs = Math.max(now, lastSendTimeMs + 10)
              const payload = this.buildSendMsg({
                contextToken: ctx.contextToken,
                fromBot: this.client.botId,
                text: seg,
                to: ctx.from,
              })
              payload.create_time_ms = lastSendTimeMs
              const sendRes = await this.doSendMessage(payload)
              this.log?.info?.(`[${this.channelType}] 📤 实时文本块发送结果: ${JSON.stringify(sendRes)}`)
              await new Promise((r) => setTimeout(r, 80))
            }
          }

          if (meta.soulDraft) {
            await this.memory.writeSoul(meta.soulDraft)
          }
        }).catch((err) => {
          this.log?.error?.(`[${this.channelType}] 队列发送异常:`, err)
        })
        return sendQueue
      }

      // 调用底层 LLM
      const reply = await this.llm.process({
        agentId: this.memory.agentId,
        channel: this,
        channelId: ctx.channelId,
        chat,
        contextToken: ctx.contextToken,
        crystal: crystal || '',
        from: ctx.from,
        globalMem: globalMem || '',
        guidance: !soul,
        images: ctx.rawMsg?.images || ctx.images || null,
        isWeb: ctx.isWeb,
        memory: this.memory,
        messageId: ctx.messageId,
        model: this.model,
        onEmitTextBlock,
        onRegisterAbort: (abortFn) => { activeJobObj._abortLlm = abortFn },
        pendingMemories,
        provider: this.provider,
        sessionId: sid,
        soul: soul || '',
        text,
        webClient: ctx.webClient,
      })

      // 兼容传统同步返回
      if (!didEmitTextBlock && reply?.text?.trim()) {
        const replyText = reply.text.trim()
        if (reply?.soulDraft) {
          await this.memory.writeSoul(reply.soulDraft)
        }
        await onEmitTextBlock(replyText, { extraRender: reply.extraRender })
      }

      await sendQueue

      // 会话持久化落盘（包含完整 Tool Calls、参数、运行结果、思考链以及文本节点）
      if (emittedBlocks.length > 0 || (reply?.content && reply.content.length > 0) || reply?.aborted) {
        const fullAssistantReply = emittedBlocks.join('\n\n')
        let finalUserText = text
        const imgList = ctx.rawMsg?.images || ctx.images || null
        if (Array.isArray(imgList) && imgList.length > 0) {
          for (const img of imgList) {
            if (!finalUserText.includes(`![图片](${img})`)) {
              finalUserText += `\n![图片](${img})`
            }
          }
        }

        const now = Date.now()
        const userMsg = {
          content: [{ data: { text: finalUserText }, type: 'text' }],
          from_user_id: ctx.from,
          role: 'user',
          text: finalUserText,
          time: ctx.time || ctx.rawMsg?.time || now,
        }
        if (!userPersistedBeforeLlm) await this.memory.appendToChat(sid, userMsg)

        const assistantContent = (Array.isArray(reply?.content) && reply.content.length > 0)
          ? [...reply.content]
          : [{ data: { text: fullAssistantReply || (reply?.aborted ? '⏹️ [用户已中止任务 / User aborted]' : '') }, type: 'text' }]

        const hasTextNode = assistantContent.some((c) => c.type === 'text' && c.data?.text?.trim())
        if (!hasTextNode) {
          if (fullAssistantReply?.trim()) {
            assistantContent.push({
              data: { text: fullAssistantReply.trim() },
              type: 'text',
            })
          } else if (reply?.aborted) {
            assistantContent.push({
              data: { text: '⏹️ [用户已中止任务 / User aborted]' },
              type: 'text',
            })
          }
        }

        const assistantMsg = {
          content: assistantContent,
          role: 'assistant',
          text: fullAssistantReply || (reply?.aborted ? '⏹️ [用户已中止任务 / User aborted]' : ''),
          time: Date.now(),
        }

        let updatedSession
        if (assistantPersistenceId) {
          await persistenceQueue
          await this.memory.finalizeAssistantMessage(
            assistantPersistenceId,
            assistantMsg,
            reply?.aborted ? 'aborted' : 'final',
          )
          updatedSession = await this.memory.getSession(sid)
          assistantPersistenceId = null
        } else {
          updatedSession = await this.memory.appendToChat(sid, assistantMsg)
        }
        const currentCount = updatedSession?.chat?.length || 0
        const toolCallCount = assistantContent.filter((c) => c.type === 'tool_call').length
        this.log?.info?.(`[${this.channelType}] 💾 会话历史已成功落盘 | 会话: ${sid} | 本轮交互已追加 (含 ${toolCallCount} 个 ToolCalls${reply?.aborted ? ', 用户中止' : ''}) | 累计条数: ${currentCount} 条`)
        if (reply?.crystal) {
          await this.memory.setCrystal(sid, reply.crystal)
          this.log?.info?.(`[${this.channelType}] 💎 会话结晶已更新 | 会话: ${sid} | 结晶长度: ${reply.crystal.length} 字符`)
        }
      }

      if (assistantPersistenceId) {
        await persistenceQueue
        await this.memory.finalizeAssistantMessage(assistantPersistenceId, {
          content: [],
          role: 'assistant',
          text: '',
          time: Date.now(),
        })
        assistantPersistenceId = null
      }
      return null
    } catch (error) {
      if (assistantPersistenceId) {
        await persistenceQueue
        const partialText = emittedBlocks.join('\n\n')
        await this.memory.finalizeAssistantMessage(assistantPersistenceId, {
          content: partialText
            ? [{ data: { text: partialText }, type: 'text' }]
            : [],
          role: 'assistant',
          text: partialText,
          time: Date.now(),
        }, 'failed').catch(finalizeError => {
          this.log?.error?.(`[${this.channelType}] 失败消息收口异常: ${finalizeError.message}`)
        })
        assistantPersistenceId = null
      }
      throw error
    } finally {
      this.activeJobs.delete(sid)
      if (typingTimer) clearInterval(typingTimer)
      await this.doSendTyping(ctx, 2)
    }
  }

  // ===============================================================
  // 兼容别名与单测调用接口
  // ===============================================================
  async _handleMessage(msg) {
    return this.handleIncomingMessage(msg)
  }

  async _slash(cmd, ctx = {}) {
    return this.slashHandler.handle(cmd, ctx)
  }

  async _checkKeepAlive() {
    return this.keepAlive.check()
  }

  async _recordActivity(token = null) {
    return this.keepAlive.recordActivity(token)
  }
}

export default BaseChannel
