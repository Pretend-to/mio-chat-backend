/**
 * lib/chat/llm/events/subtypes/ChannelChatEvent.js
 * 外部渠道专用领域事件：承接渠道文本块累积分包、微信/渠道二次确认审批、及 admin streamCache 双写
 */

import { ChatEvent } from '../ChatEvent.js'
import streamCache from '../../../../server/socket.io/services/streamCache.js'
import logger from '../../../../../utils/logger.js'
import approvalNotificationBroker from '../../../../approvals/ApprovalNotificationBroker.js'

export class ChannelChatEvent extends ChatEvent {
  /**
   * @param {object} params
   * @param {object} params.channelContext 渠道执行上下文原始引用 (含 onEmitTextBlock, webClient 等)
   */
  constructor(params) {
    super(params)

    this.channelContext = params.channelContext || {}
    this.collectedChunks = []
    this.currentTextBlock = ''
    this.currentReasoningStartTime = null
    this.lastActionData = null
    this.streamError = null
    this.emittedRenders = new Set()
    this.latestCrystal = null
    this.crystalPersisted = false
    this._finishing = false
  }

  async flushTextBlock() {
    const textToSend = this.currentTextBlock.trim()
    this.currentTextBlock = ''
    if (!textToSend) return

    if (typeof this.channelContext.onEmitTextBlock === 'function') {
      await this.channelContext.onEmitTextBlock(textToSend)
    }
  }

  async update(data) {
    if (!data) return
    this.collectedChunks.push(data)
    const ctx = this.channelContext

    if (data.type === 'action' && data.content) {
      this.lastActionData = data.content
    }

    // 1. 文本流累积状态机
    if (data.type === 'content' && typeof data.content === 'string') {
      this.currentTextBlock += data.content
    }

    // 2. 异步同步至 streamCache (写入 cacheOwnerIds: 如 'admin', webClient.id)
    if (this.contactorId && ctx.messageId) {
      let finalData = data
      if (data.type === 'reasoningContent') {
        if (!this.currentReasoningStartTime) {
          this.currentReasoningStartTime = Date.now()
        }
        finalData = {
          data: {
            duration: 0,
            startTime: this.currentReasoningStartTime,
            text: data.content || data.data?.text || '',
          },
          type: 'reason',
        }
      } else if (data.type === 'reason' && !data.data && typeof data.content === 'string') {
        if (!this.currentReasoningStartTime) this.currentReasoningStartTime = Date.now()
        finalData = {
          data: {
            duration: data.duration || 0,
            startTime: data.startTime || this.currentReasoningStartTime,
            text: data.content,
          },
          type: 'reason',
        }
      } else if (data.type === 'content' || data.type === 'toolCall') {
        this.currentReasoningStartTime = null
      }

      const isChannelApproval =
        !ctx.isWeb &&
        data.type === 'action' &&
        data.content?.actionType === 'REQUEST_APPROVAL'

      // 渠道侧的审批卡片由渠道文本确认，不能广播为 Web 幽灵确认框
      if (!isChannelApproval) {
        const metaData = {
          contactorId: this.contactorId,
          isTask: Boolean(ctx.isTask),
          messageId: this.messageId,
          triggerType: ctx.isTask ? 'task' : 'chat',
          ...(ctx.wakeType ? { wakeType: ctx.wakeType } : {}),
          ...(ctx.subagentContact ? { subagentContact: ctx.subagentContact } : {}),
          ...data.metaData,
        }

        for (const ownerId of this.cacheOwnerIds) {
          try {
            streamCache.push(
              ownerId,
              this.contactorId,
              this.messageId,
              finalData,
              metaData,
            )
          } catch (err) {
            logger.warn(`[ChannelChatEvent] 写入 streamCache 失败 (${ownerId}):`, err.message)
          }
        }
      }
      await ctx.onMirrorUpdate?.({
        data: { ...finalData, metaData: {
          contactorId: this.contactorId,
          isTask: Boolean(ctx.isTask),
          messageId: this.messageId,
          triggerType: ctx.isTask ? 'task' : 'chat',
          ...(ctx.wakeType ? { wakeType: ctx.wakeType } : {}),
          ...(ctx.subagentContact ? { subagentContact: ctx.subagentContact } : {}),
          ...data.metaData,
        } },
        isChannelApproval,
      })
    }

    if (data.type === 'crystallize' &&
      data.content?.commit === true &&
      data.content?.status === 'finished' &&
      data.content?.summary) {
      const summary = data.content.summary.trim()
      if (summary) {
        this.latestCrystal = summary
        ctx.onCrystallize?.(summary, this)
      }
    }

    if (data.type === 'content') {
      ctx.onProgressText?.(this.currentTextBlock.slice(0, 100))
    } else {
      await this.flushTextBlock()
      if (data.type === 'toolCall') ctx.onToolStatus?.(data.content)
      if (data.type === 'toolCall' || data.type === 'extraRender') {
        await this._emitExtraRenders(data)
      }
    }
  }

  async _emitExtraRenders(data) {
    const payload = data.content || data
    const renders = [
      ...(Array.isArray(payload?.extraRender) ? payload.extraRender : payload?.extraRender ? [payload.extraRender] : []),
      ...(Array.isArray(data.extraRender) ? data.extraRender : data.extraRender ? [data.extraRender] : []),
    ]
    for (const render of renders) {
      if (!render) continue
      const key = render.url || render.text ||
        (render.title ? `${render.title}:${render.description}` : JSON.stringify(render))
      if (this.emittedRenders.has(key)) continue
      this.emittedRenders.add(key)
      const emit = this.channelContext.onEmitTextBlock
      if (typeof emit !== 'function') continue
      if (render.type === 'image' && (render.url || render.buffer || render.localPath)) {
        await emit('', { extraRender: render, image: render.url })
      } else if ((render.type === 'audio' || render.type === 'voice') && (render.url || render.buffer || render.localPath)) {
        await emit('', { audio: render.url, extraRender: render })
      } else if ((render.type === 'file' || render.type === 'document') && (render.url || render.buffer || render.localPath)) {
        await emit('', { extraRender: render, file: render.url })
      } else if (render.type === 'video' && (render.url || render.buffer || render.localPath)) {
        await emit('', { extraRender: render, video: render.url })
      } else if (render.type === 'link' || (!render.type && (render.url || render.href))) {
        await emit('', { extraRender: render, link: render.url || render.href || '' })
      } else if (render.type === 'card' || render.type === 'html') {
        await emit('', { card: render, extraRender: render })
      } else if (['text', 'notice', 'alert'].includes(render.type)) {
        const notice = render.text || (render.title ? `[${render.title}] ${render.description || ''}` : render.description)
        if (notice) await emit(notice, { extraRender: render })
      }
    }
  }

  async complete() {
    if (this.completed || this._finishing) return
    this._finishing = true
    try {
      await this.flushTextBlock()
      await this.channelContext.awaitPersistence?.()
      super.complete()

      if (this.contactorId && this.channelContext.messageId) {
        for (const ownerId of this.cacheOwnerIds) {
          try {
            streamCache.complete(ownerId, this.contactorId, this.messageId)
          } catch {}
        }
      }
      await this.channelContext.onComplete?.(this)
    } catch (error) {
      this.channelContext.onCompletionFailure?.(error)
    }
  }

  error(err) {
    if (this.completed || this._finishing) return
    this._finishing = true
    super.error(err)
    this.streamError = err

    if (this.contactorId && this.channelContext.messageId) {
      for (const ownerId of this.cacheOwnerIds) {
        try {
          streamCache.fail(
            ownerId,
            this.contactorId,
            this.messageId,
            err?.message || String(err),
          )
        } catch {}
      }
    }
    this.channelContext.onError?.(err, this)
  }

  /**
   * 渠道特有的二次确认审批挂起机制
   * 将操作安全审批转换为渠道文本/卡片消息
   */
  async registerInteraction(interactionId, callback) {
    super.registerInteraction(interactionId, callback)

    const ctx = this.channelContext
    if (ctx.approvalTarget) {
      approvalNotificationBroker.register({
        action: this.lastActionData || {
          actionType: 'REQUEST_APPROVAL',
          interactionId,
          prompt: 'SubAgent 正在申请执行敏感操作，是否授权？',
        },
        event: this,
        interactionId,
        target: ctx.approvalTarget,
      })
      return
    }
    if (ctx.isWeb && ctx.webClient && ctx.messageId) {
      // 来自 Web 客户端在渠道调试页：由前端通过 Socket.IO 就地交互
      ctx.webClient.pushEvent(this.messageId, this)
      return
    }

    // 来自真实第三方渠道端（微信长轮询等）：向渠道推送文本确认卡片并通过消息回复进行交互
    const reqFn =
      this.channel?.requestConfirmation ||
      this.channel?.requestUserConfirmation

    if (this.channel && typeof reqFn === 'function') {
      try {
        const meta = this.lastActionData?.meta || {}
        const prompt =
          this.lastActionData?.prompt ||
          'LLM 正在申请执行敏感操作，是否授权？'
        let title = '安全操作二次确认'
        const details = []

        if (meta.type === 'global_memory' || meta.fact || meta.content) {
          title = '全局长期记忆更新审批'
          const contentText = meta.content || meta.fact || ''
          if (contentText) details.push(`📝 记忆内容：${contentText}`)
          if (meta.category) details.push(`📁 记忆分类：${meta.category}`)
          if (meta.action) {
            details.push(
              `⚙️ 操作类型：${meta.action === 'add' ? '新增' : meta.action === 'update' ? '更新' : meta.action === 'delete' ? '删除' : meta.action}`,
            )
          }
          if (meta.target) details.push(`🎯 记忆目标：${meta.target}`)
        } else if (meta.command) {
          title = meta.highRisk
            ? '⚠️ 高危 Shell 命令授权'
            : '💻 Shell 命令授权'
          const commandPreview = meta.commandPreview || meta.command
          details.push(
            meta.rememberable === false
              ? `💻 待执行命令：\n${commandPreview}`
              : `💻 待执行命令：\`${commandPreview}\``,
          )
          if (meta.cwd) details.push(`📂 工作目录：${meta.cwd}`)
        } else if (meta.params) {
          title = '⚙️ 系统配置修改审批'
          const paramsStr =
            typeof meta.params === 'object'
              ? JSON.stringify(meta.params, null, 2)
              : String(meta.params)
          details.push(`⚙️ 修改内容：\n${paramsStr}`)
        } else if (meta.key && meta.value !== undefined) {
          title = '⚙️ 配置修改审批'
          details.push(
            `⚙️ 修改项：${meta.key} -> ${JSON.stringify(meta.value)}`,
          )
        }

        const description =
          details.length > 0 ? `${prompt}\n\n${details.join('\n')}` : prompt

        const res = await reqFn.call(
          this.channel,
          {
            command: meta.command,
            commandPrefix1: meta.commandPrefix1,
            commandPrefix2: meta.commandPrefix2,
            contextToken: ctx.contextToken,
            description,
            from: ctx.from,
            rememberable: meta.rememberable === true,
            title,
          },
          ctx,
        )

        this.emitInteraction(
          interactionId,
          typeof res === 'object' ? res : { approved: Boolean(res) },
        )
      } catch (err) {
        this.emitInteraction(interactionId, {
          approved: false,
          reason: err.message,
        })
      }
    } else {
      this.emitInteraction(interactionId, { approved: true })
    }
  }
}
