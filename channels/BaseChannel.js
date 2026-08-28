/**
 * BaseChannel — 多渠道（微信、飞书、钉钉、Telegram 等）抽象基类
 *
 * 核心设计目标：
 * 1. 统一渠道生命周期管理 (start, stop, loop, error handling)
 * 2. 统一消息路由与 Slash 命令处理
 * 3. 统一高危动作挂起确认拦截 (Pending Action Interceptor)
 * 4. 统一原生媒体下发 (Image/Audio/File) 与展示型 extraRender 降级适配
 * 5. 统一与底层 LLM 对话桥接与流式文本发射 (Streaming State Machine)
 * 6. 统一记忆落盘 (MemoryStore: soul, globalMem, crystal, session chat)
 */

import { sleep } from './memory/sleep.js'
import { SlashCommandHandler } from './wechat/slash.js'
import { KeepAliveManager } from './wechat/keepAlive.js'

export class BaseChannel {
  /**
   * @param {object} opts
   * @param {object} opts.client      协议客户端实现
   * @param {import('./memory/MemoryStore.js').MemoryStore} opts.memory     记忆/会话落盘存储
   * @param {string} opts.masterId   绑定主用户 UID
   * @param {object} opts.llm        LLM 处理器
   * @param {string} [opts.channelType] 渠道标识（如 'wechat', 'feishu', 'dingtalk'）
   * @param {string} [opts.provider] 指定大模型提供商
   * @param {string} [opts.model]    指定大模型名称
   * @param {boolean} [opts.typing]  是否启用打字中状态反馈
   * @param {object} [opts.keepAlive] 保活配置
   * @param {object} [opts.logger]   日志输出
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
  }) {
    if (!client || !memory || !masterId) {
      throw new Error(`[${this.constructor.name}] requires client, memory, and masterId`)
    }
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

    this.running = false
    this._abort = null

    // 待确认高危动作挂起队列 (pendingId -> { id, description, action, resolve, reject, timer })
    this.pendingConfirmations = new Map()

    // 子组件初始化
    this.slashHandler = new SlashCommandHandler({ memory: this.memory, channel: this })
    this.keepAlive = new KeepAliveManager({
      client: this.client,
      memory: this.memory,
      masterId: this.masterId,
      config: keepAlive,
      logger: this.log,
    })
  }

  // ===============================================================
  // 抽象方法（由各渠道子类实现协议特异性）
  // ===============================================================

  /** 从原始入站数据包中提取文本消息 */
  extractText(msg) {
    throw new Error('extractText(msg) must be implemented by subclass')
  }

  /** 构造下行文本消息数据包 */
  buildSendMsg({ to, text, contextToken }) {
    throw new Error('buildSendMsg() must be implemented by subclass')
  }

  /** 发送真实消息给渠道用户 */
  async doSendMessage(payload) {
    if (typeof this.client.sendMessage === 'function') {
      return this.client.sendMessage(payload)
    }
    throw new Error('doSendMessage() must be implemented by subclass')
  }

  /** 发送原生图片（Buffer 或 URL） */
  async doSendImage({ to, contextToken, buffer, url }) {
    throw new Error('doSendImage() must be implemented by subclass')
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
   * 切分责任归属渠道适配器，llm 桥接层不再解析任何分隔符。
   */
  splitTextToSegments(text) {
    const t = (text || '').trim()
    return t ? [t] : []
  }

  /** 渠道主长轮询/接收循环 */
  async _loop() {
    throw new Error('_loop() must be implemented by subclass')
  }

  // ===============================================================
  // 生命周期
  // ===============================================================
  async start() {
    this.running = true
    this._abort = new AbortController()
    if (this.memory) {
      try {
        this.latestContextToken = await this.memory.getAgentMeta('latestContextToken', null)
      } catch {}
    }
    try {
      if (typeof this.client.notifyStart === 'function') {
        await this.client.notifyStart()
      }
    } catch {}
    this._loop() // 异步长轮询循环，不阻塞
    this.keepAlive.start()
    return this
  }

  async stop() {
    this.running = false
    this.keepAlive.stop()
    try { this._abort?.abort() } catch {}
    try {
      if (typeof this.client.notifyStop === 'function') {
        await this.client.notifyStop()
      }
    } catch {}
    return this
  }

  // ===============================================================
  // 消息处理与路由中心
  // ===============================================================
  async handleIncomingMessage(msg) {
    const from = msg.from_user_id || msg.userId || msg.from
    if (from !== this.masterId) {
      this.log?.warn?.(`[${this.channelType}] 拦截非绑定者消息 (from=${from}, master=${this.masterId})`)
      return
    }

    const contextToken = msg.context_token || null
    if (contextToken) {
      this.latestContextToken = contextToken
      if (this.memory) {
        this.memory.setAgentMeta('latestContextToken', contextToken).catch(() => {})
      }
    }
    const effectiveToken = contextToken || this.latestContextToken || null
    await this.keepAlive.recordActivity(effectiveToken)

    // 更新渠道活跃时间
    if (typeof this.onActivity === 'function') {
      try { this.onActivity() } catch {}
    }

    const text = this.extractText(msg)
    if (typeof text !== 'string' || !text.trim()) {
      this.log?.warn?.(`[${this.channelType}] ⚠️ 提取文本为空或不支持的消息类型: ${JSON.stringify(msg)}`)
      return
    }

    this.log?.info?.(`[${this.channelType}] 👤 用户输入: "${text}"`)

    // 1. 检查是否有挂起待审批的敏感操作
    if (this._handlePendingConfirmation(text.trim(), { from, contextToken: effectiveToken })) {
      return
    }

    // 2. 检查当前活跃会话是否正处于长任务运行中（并发插话方案二：一次性轻量响应，不写磁盘，不污染主任务）
    let sid = await this.memory.getActiveSession()
    if (sid && this.activeJobs.has(sid) && !text.trim().startsWith('/')) {
      const activeJob = this.activeJobs.get(sid)
      this.log?.info?.(`[${this.channelType}] ⚡ 检测到主任务正在运行中，触发临时即时插话回复 (sid=${sid}, toolCount=${activeJob.toolCount})`)
      return this._handleTransientInterruption(text.trim(), activeJob, { contextToken: effectiveToken, from, sid })
    }

    // 3. 正常路由
    try {
      const reply = await this._route(text, { contextToken: effectiveToken, from, rawMsg: msg })
      if (reply?.text) {
        this.log?.info?.(`[${this.channelType}] 🤖 回复渠道: "${reply.text.slice(0, 50)}${reply.text.length > 50 ? '...' : ''}"`)
        const payload = this.buildSendMsg({
          to: from,
          fromBot: this.client.botId,
          contextToken: effectiveToken,
          text: reply.text,
        })
        const sendResult = await this.doSendMessage(payload)
        this.log?.info?.(`[${this.channelType}] 📤 发送结果: ${JSON.stringify(sendResult)}`)
      }
    } catch (e) {
      this.log?.error?.(`[${this.channelType}] 处理消息失败: ${e?.message}`)
      await this._safeSend(from, effectiveToken, `抱歉，处理出错了：${e?.message}（回复 /help 查看命令）`)
    }
  }

  /**
   * 处理长任务运行期间的用户并发消息：单次一次性回复，不产生落盘历史副作用
   */
  async _handleTransientInterruption(text, activeJob, ctx) {
    const elapsedSec = Math.round((Date.now() - activeJob.startTime) / 1000)
    const promptStatus = [
      `[系统状态通知]`,
      `你当前正在后台执行该用户的上一个任务。`,
      `上一个任务的初始输入：${JSON.stringify(activeJob.text)}`,
      `当前执行耗时：已运行 ${elapsedSec} 秒`,
      `已调用的工具步骤数：${activeJob.toolCount} 次`,
      activeJob.currentTool ? `当前正在执行的工具：${activeJob.currentTool}` : '',
      activeJob.lastProgressText ? `上一步阶段性说明：${activeJob.lastProgressText}` : '',
      '',
      `用户刚刚又发送了一条即时消息：${JSON.stringify(text)}`,
      '',
      `【回复要求】：`,
      `1. 这是一次即时插话交互，请以自然、亲切、简短的微信口吻（1~2 句话）向用户反馈你当前正在全力处理上个任务的最新进度，或对他的临时疑问做快速解答；`,
      `2. 不要重复调用重度工具，直接输出文本；`,
      `3. 依然可以使用 <msg>...</msg> 分条。`,
    ].filter(Boolean).join('\n')

    try {
      this.doSendTyping(ctx, 1).catch(() => {})
      const reply = await this.llm.process({
        sessionId: `transient_${ctx.sid}_${Date.now()}`,
        soul: (await this.memory.readSoul()) || '',
        globalMem: '',
        crystal: '',
        chat: [],
        guidance: false,
        text: promptStatus,
        from: ctx.from,
        contextToken: ctx.contextToken || this.latestContextToken || null,
        agentId: this.memory.agentId,
        memory: this.memory,
        channel: this,
        provider: this.provider,
        model: this.model,
        onEmitTextBlock: async (msgContent) => {
          if (msgContent?.trim()) {
            await this._safeSend(ctx.from, ctx.contextToken || this.latestContextToken, msgContent.trim())
          }
        },
      })
      if (reply?.text?.trim()) {
        await this._safeSend(ctx.from, ctx.contextToken || this.latestContextToken, reply.text.trim())
      }
    } catch (e) {
      this.log?.warn?.(`[${this.channelType}] 临时插话回复失败: ${e.message}`)
      await this._safeSend(ctx.from, ctx.contextToken || this.latestContextToken, `我正在后台全力处理刚才的任务（已运行 ${elapsedSec}s），马上就好哦～`)
    }
  }

  async _safeSend(from, contextToken, text) {
    const targetToken = contextToken || this.latestContextToken || null
    try {
      for (const seg of this.splitTextToSegments(text, { contextToken: targetToken, from })) {
        const payload = this.buildSendMsg({
          to: from,
          fromBot: this.client.botId,
          contextToken: targetToken,
          text: seg,
        })
        await this.doSendMessage(payload)
      }
    } catch {}
  }

  async _route(text, ctx) {
    if (text.trim().startsWith('/')) {
      return this.slashHandler.handle(text.trim())
    }
    return this._processChat(text.trim(), ctx)
  }

  // ===============================================================
  // 高危动作挂起确认拦截器 (Pending Action Interceptor)
  // ===============================================================
  requestConfirmation({ description, title = '安全操作确认' }, ctx) {
    return new Promise((resolve, reject) => {
      const pendingId = `p_${Date.now().toString(36)}`
      const timer = setTimeout(() => {
        if (this.pendingConfirmations.has(pendingId)) {
          this.pendingConfirmations.delete(pendingId)
          this._safeSend(ctx.from, ctx.contextToken, `⏰ 操作确认超时已自动取消：${description}`)
          reject(new Error('操作确认超时已取消'))
        }
      }, 5 * 60 * 1000) // 5分钟 TTL

      this.pendingConfirmations.set(pendingId, {
        description,
        pendingId,
        reject,
        resolve,
        timer,
      })

      // 向用户推送交互确认提示
      const confirmNotice = [
        `⚠️ **${title}**`,
        `> ${description}`,
        '',
        '👉 回复【确认】或【/allow】执行',
        '👉 回复【取消】放弃',
      ].join('\n')

      this._safeSend(ctx.from, ctx.contextToken, confirmNotice).catch(() => {})
    })
  }

  _handlePendingConfirmation(text, ctx) {
    if (this.pendingConfirmations.size === 0) return false

    const normalized = text.trim().toLowerCase()
    const isAllow = ['确认', '允许', 'yes', 'y', 'ok', '/allow', '继续', '同意'].includes(normalized)
    const isReject = ['取消', '拒绝', 'no', 'n', 'cancel', '/deny', '放弃'].includes(normalized)

    if (!isAllow && !isReject) return false

    // 取出最新的 pending item
    const [pendingId, item] = Array.from(this.pendingConfirmations.entries())[this.pendingConfirmations.size - 1]
    clearTimeout(item.timer)
    this.pendingConfirmations.delete(pendingId)

    if (isAllow) {
      this._safeSend(ctx.from, ctx.contextToken, '✅ 已确认授权，正在继续执行...')
      item.resolve(true)
    } else {
      this._safeSend(ctx.from, ctx.contextToken, '🚫 已取消该操作')
      item.reject(new Error('用户已手动取消该操作'))
    }
    return true
  }

  // ===============================================================
  // 核心对话处理 (LLM 桥接、记忆读写、流式状态机、原生媒体/富卡片分发)
  // ===============================================================
  async _processChat(text, ctx) {
    // 1. 确保有 active session
    let sid = await this.memory.getActiveSession()
    if (!sid) {
      const s = await this.memory.createSession({ title: '默认会话' })
      sid = s.id
      await this.memory.setActiveSession(sid)
    }

    // 2. typing 开始（微信端打字中状态默认 TTL 仅约 5~6 秒，需要定时心跳保活直到真正回复结束）
    let typingTimer = null
    const startTypingHeartbeat = () => {
      this.doSendTyping(ctx, 1).catch(() => {})
      typingTimer = setInterval(() => {
        this.doSendTyping(ctx, 1).catch(() => {})
      }, 4000)
    }

    startTypingHeartbeat()
    this.activeJobs.set(sid, {
      startTime: Date.now(),
      text,
      currentTool: null,
      toolCount: 0,
      lastProgressText: '',
    })

    try {
      const soul = await this.memory.readSoul()
      const globalMem = await this.memory.readAllGlobal()
      const crystal = await this.memory.getCrystal(sid)
      const chat = await this.memory.getChat(sid)

      const emittedBlocks = []

      // 严格保证下行消息 FIFO 串行发送队列，彻底解决微信端并发/同毫秒乱序
      let sendQueue = Promise.resolve()
      let lastSendTimeMs = 0

      // 回调：流式状态机检测到一段完整文本块或富渲染卡片时进入串行队列发送
      const onEmitTextBlock = (textBlock, meta = {}) => {
        sendQueue = sendQueue.then(async () => {
          // A. 如果包含原生图片（例如 draw 或 vision 输出），走原生媒体通道单发
          if (meta.image || meta.extraRender?.type === 'image' || meta.extraRender?.imageUrl) {
            const imgUrl = meta.image || meta.extraRender?.imageUrl || meta.extraRender?.url
            const imgBuffer = meta.imageBuffer || meta.extraRender?.buffer
            this.log?.info?.(`[${this.channelType}] 🖼️ 正在发送原生图片消息: ${imgUrl || 'buffer'}`)
            try {
              await this.doSendImage({
                buffer: imgBuffer,
                contextToken: ctx.contextToken,
                to: ctx.from,
                url: imgUrl,
              })
            } catch (e) {
              this.log?.error?.(`[${this.channelType}] 原生图片发送失败: ${e.message}`)
            }
            // 微小等待让微信服务端消息完全完成入库序列
            await new Promise((r) => setTimeout(r, 100))
          }

// B. 如果有文本，先按渠道协议切分（微信：<msg>/<break/>），再逐条伪队列发送
          if (textBlock?.trim()) {
            const segments = this.splitTextToSegments(textBlock.trim(), ctx)
            for (const seg of segments) {
              emittedBlocks.push(seg)
              this.log?.info?.(`[${this.channelType}] 🤖 实时推送文本块: "${seg.slice(0, 50)}${seg.length > 50 ? '...' : ''}"`)
              // 严格确保每条消息的 create_time_ms 严格单调递增
              const now = Date.now()
              lastSendTimeMs = Math.max(now, lastSendTimeMs + 10)
              const payload = this.buildSendMsg({
                to: ctx.from,
                fromBot: this.client.botId,
                contextToken: ctx.contextToken,
                text: seg,
              })
              payload.create_time_ms = lastSendTimeMs
              const sendRes = await this.doSendMessage(payload)
              this.log?.info?.(`[${this.channelType}] 📤 实时文本块发送结果: ${JSON.stringify(sendRes)}`)
              // 同一用户的多条消息需微小间隔保证气泡绝对时序
              await new Promise((r) => setTimeout(r, 80))
            }
          }

          // 兼容处理元信息变更（例如提炼出灵魂等）
          if (meta.soulDraft) {
            await this.memory.writeSoul(meta.soulDraft)
          }
        }).catch((err) => {
          this.log?.error?.(`[${this.channelType}] 队列发送异常:`, err)
        })
        return sendQueue
      }

      // 3. 调用底层 LLM
      const reply = await this.llm.process({
        sessionId: sid,
        soul: soul || '',
        globalMem: globalMem || '',
        crystal: crystal || '',
        chat,
        guidance: !soul,
        text,
        from: ctx.from,
        contextToken: ctx.contextToken,
        agentId: this.memory.agentId,
        memory: this.memory,
        channel: this,
        provider: this.provider,
        model: this.model,
        images: ctx.rawMsg?.images || ctx.images || null,
        onEmitTextBlock,
      })

      // 兼容传统同步返回的 LLM 驱动
      if (emittedBlocks.length === 0 && reply?.text?.trim()) {
        const replyText = reply.text.trim()
        if (reply?.soulDraft) {
          await this.memory.writeSoul(reply.soulDraft)
        }
        await onEmitTextBlock(replyText, { extraRender: reply.extraRender })
      }

      // 等待发送队列全部串行发送完毕
      await sendQueue

      // 4. 会话持久化落盘（包含完整 Tool Calls、参数、运行结果、思考链以及文本节点）
      if (emittedBlocks.length > 0 || (reply?.content && reply.content.length > 0)) {
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
        // 用户消息落盘
        const userMsg = {
          content: [{ data: { text: finalUserText }, type: 'text' }],
          from_user_id: ctx.from,
          role: 'user',
        }
        await this.memory.appendToChat(sid, userMsg)

        // Assistant 消息落盘（写入包含 tool_call, reason, text 的标准结构化 content 节点数组）
        const assistantContent = (Array.isArray(reply?.content) && reply.content.length > 0)
          ? [...reply.content]
          : [{ data: { text: fullAssistantReply }, type: 'text' }]

        // 双重保障：若 reply.content 中只有 reason/tool_call 而遗漏了最终文本，则补齐 text 节点
        const hasTextNode = assistantContent.some(c => c.type === 'text' && c.data?.text?.trim())
        if (!hasTextNode && fullAssistantReply?.trim()) {
          assistantContent.push({
            data: { text: fullAssistantReply.trim() },
            type: 'text',
          })
        }

        const assistantMsg = {
          content: assistantContent,
          role: 'assistant',
        }

        const updatedSession = await this.memory.appendToChat(sid, assistantMsg)
        const currentCount = updatedSession?.chat?.length || 0
        const toolCallCount = assistantContent.filter(c => c.type === 'tool_call').length
        this.log?.info?.(`[${this.channelType}] 💾 会话历史已成功落盘 | 会话: ${sid} | 本轮交互已追加 (含 ${toolCallCount} 个 ToolCalls) | 累计条数: ${currentCount} 条`)
        if (reply?.crystal) {
          await this.memory.setCrystal(sid, reply.crystal)
          this.log?.info?.(`[${this.channelType}] 💎 会话结晶已更新 | 会话: ${sid} | 结晶长度: ${reply.crystal.length} 字符`)
        }
      }

      return null // 已经在流式状态机中推送完成
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

  async _slash(cmd) {
    return this.slashHandler.handle(cmd)
  }

  async _checkKeepAlive() {
    return this.keepAlive.check()
  }

  async _recordActivity(token = null) {
    return this.keepAlive.recordActivity(token)
  }
}

export default BaseChannel
