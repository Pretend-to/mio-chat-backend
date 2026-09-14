/**
 * lib/chat/llm/events/subtypes/WebChatEvent.js
 * Web 侧专用领域事件：承接 Socket.IO 客户端连接、流式推流、streamCache 同步与自动标题总结
 */

import { ChatEvent } from '../ChatEvent.js'
import { WebEventSerializer } from '../egress/WebEventSerializer.js'
import streamCache from '../../../../server/socket.io/services/streamCache.js'
import sessions from '../../../../server/socket.io/services/sessions.js'
import {
  formatWebErrorMessage,
  parseErrorDetails,
} from '../../../../../utils/errorFormatter.js'
import logger from '../../../../../utils/logger.js'

export class WebChatEvent extends ChatEvent {
  constructor(params) {
    super(params)

    this._everUpdate = false
    this.currentReasoningStartTime = null
    this.lastChunkType = null
  }

  update(chunk) {
    if (!chunk) return
    this._everUpdate = true

    const currentType = chunk.type

    // 瞬态交互指令（除二次确认 REQUEST_APPROVAL 外）直接下发，不进入 streamCache，防止重连无意义弹窗
    if (
      currentType === 'action' &&
      chunk.content?.actionType !== 'REQUEST_APPROVAL'
    ) {
      this._sendToSocket('update', chunk)
      return
    }

    const finalChunk = WebEventSerializer.formatChunk(chunk, this)
    this.lastChunkType = currentType

    // 写入 streamCache 供断线重连与离线回放
    if (this.contactorId) {
      const metaData = WebEventSerializer.buildMetadata(this)
      streamCache.push(
        this.principalId,
        this.contactorId,
        this.messageId,
        finalChunk,
        metaData,
      )

      // 水位线检查：若 chunk 已包含在刚刚给客户端的 sync 快照中，则拦截重复发送
      if (streamCache.isAlreadySynced(this.principalId, this.contactorId)) {
        return
      }
    }

    this._sendToSocket('update', finalChunk)
  }

  complete() {
    if (this.completed) return
    super.complete()

    if (this.contactorId) {
      streamCache.complete(
        this.principalId,
        this.contactorId,
        this.messageId,
      )
    }

    if (!this._everUpdate) {
      this.update({
        content: '模型无响应，请检查输入是否合法！',
        type: 'content',
      })
    }

    logger.debug(`[WebChatEvent] Message complete: ${this.requestId}`)
    this._sendToSocket('complete', {})

    // 异步自动起标题
    this._checkAndSummarize().catch((error) => {
      logger.error('[WebChatEvent] Auto-summarization error:', error)
    })

    this.client.popEvent(this.requestId)
  }

  error(error) {
    if (this.completed) return
    super.error(error)

    logger.error(`[WebChatEvent] Request ${this.requestId} failed:`, error)

    const details = parseErrorDetails(error)
    const formattedWebMessage = formatWebErrorMessage(error)

    const errorObject = {
      code: details.code,
      message: formattedWebMessage,
      requestId: details.requestId,
      status: details.status,
    }

    if (this.contactorId) {
      streamCache.fail(
        this.principalId,
        this.contactorId,
        this.messageId,
        errorObject,
      )
    }

    this._sendToSocket('failed', errorObject)
    this.client.popEvent(this.requestId)
  }

  pending() {
    logger.debug(`[WebChatEvent] Request pending: ${this.requestId}`)
    this._sendToSocket('pending', {})
  }

  reply(chunk) {
    this._sendToSocket('reply', chunk)
  }

  _sendToSocket(type, data) {
    const payload = WebEventSerializer.serializeSocketPayload(type, data, this)
    this.client.sendOpenaiMessage(type, payload, this.requestId)
  }

  /**
   * 自动总结标题
   * @private
   */
  async _checkAndSummarize() {
    if (!this.contactorId || this.requestId.startsWith('system_title_')) {
      return
    }

    const messages = this.messages || []
    const history = this.settings?.presetSettings?.history || []

    const totalNonSystem = messages.filter((m) => m.role !== 'system').length
    const historyNonSystem = history.filter((m) => m.role !== 'system').length
    const currentCount = totalNonSystem - historyNonSystem

    const namePolicy = this.settings?.namePolicy ?? 0
    if (Number(namePolicy) !== 2) {
      return
    }

    if (
      currentCount === 1 ||
      (currentCount > 1 && (currentCount - 1) % 6 === 0)
    ) {
      const { default: llmService } = await import('../../index.js')
      const aiResponse = streamCache.getMessageText(
        this.principalId,
        this.contactorId,
        this.messageId,
      )

      const titleContext = [...messages]
      if (aiResponse) {
        titleContext.push({ content: aiResponse, role: 'assistant' })
      }

      const newTitle = await llmService.generateChatTitle(titleContext)
      if (newTitle) {
        const allClients = sessions.getClientsByUserId(this.principalId, true)
        if (allClients) {
          allClients.forEach((c) => {
            c.sendSystemMessage('chat_title_updated', {
              contactorId: this.contactorId,
              title: newTitle,
            })
          })
        }
      }
    }
  }
}
