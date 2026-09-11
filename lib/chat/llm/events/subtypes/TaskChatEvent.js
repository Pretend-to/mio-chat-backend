/**
 * lib/chat/llm/events/subtypes/TaskChatEvent.js
 * 后台任务专用领域事件：用于定时器与自动化触发器
 */

import { ChatEvent } from '../ChatEvent.js'
import streamCache from '../../../../server/socket.io/services/streamCache.js'
import logger from '../../../../../utils/logger.js'

export class TaskChatEvent extends ChatEvent {
  /**
   * @param {object} params
   * @param {string} params.taskId 任务 ID
   * @param {number} [params.executionId] DB 执行记录 ID
   */
  constructor(params) {
    super(params)
    this.taskId = params.taskId
    this.executionId = params.executionId || null
    this.collectedChunks = []
    this.taskResult = null
    this.taskError = null
    this.currentReasoningStartTime = null
  }

  update(chunk) {
    if (!chunk) return
    this.collectedChunks.push(chunk)

    let finalChunk = chunk
    if (chunk.type === 'reasoningContent') {
      if (!this.currentReasoningStartTime) {
        this.currentReasoningStartTime = Date.now()
      }
      finalChunk = {
        data: {
          duration: 0,
          startTime: this.currentReasoningStartTime,
          text: chunk.content,
        },
        type: 'reason',
      }
    }

    const metaData = {
      contactorId: this.contactorId,
      executionId: this.executionId,
      isTask: true,
      messageId: this.messageId,
      triggerType: 'task',
    }

    // 写入 streamCache (供离线同步与刷新恢复)
    if (this.contactorId) {
      streamCache.push(
        this.principalId,
        this.contactorId,
        this.messageId,
        finalChunk,
        metaData,
      )
    }

    // 实时通知虚拟客户端 (转发给在线的真实客户端)
    if (this.client?.sendOpenaiMessage) {
      this.client.sendOpenaiMessage(
        'update',
        {
          ...finalChunk,
          metaData,
        },
        this.requestId,
      )
    }
  }

  complete() {
    if (this.completed) return
    super.complete()
    logger.debug(`[TaskChatEvent] Task ${this.taskId} completed (MessageId: ${this.messageId})`)

    const metaData = {
      contactorId: this.contactorId,
      executionId: this.executionId,
      isTask: true,
      messageId: this.messageId,
      triggerType: 'task',
    }

    if (this.contactorId) {
      streamCache.complete(this.principalId, this.contactorId, this.messageId)
    }

    if (this.client?.sendOpenaiMessage) {
      this.client.sendOpenaiMessage(
        'complete',
        { metaData },
        this.requestId,
      )
    }
  }

  error(err) {
    if (this.completed) return
    super.error(err)
    this.taskError = err
    logger.error(`[TaskChatEvent] Task ${this.taskId} failed:`, err)

    const metaData = {
      contactorId: this.contactorId,
      executionId: this.executionId,
      isTask: true,
      messageId: this.messageId,
      triggerType: 'task',
    }

    if (this.contactorId) {
      streamCache.fail(
        this.principalId,
        this.contactorId,
        this.messageId,
        err?.message || String(err),
      )
    }

    if (this.client?.sendOpenaiMessage) {
      this.client.sendOpenaiMessage(
        'failed',
        {
          message: err?.message || String(err),
          metaData,
        },
        this.requestId,
      )
    }
  }
}
