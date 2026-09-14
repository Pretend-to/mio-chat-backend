/**
 * lib/chat/llm/events/subtypes/InternalChatEvent.js
 * 系统内部轻量调用领域事件：用于标题生成、摘要、免推流内存任务
 */

import { ChatEvent } from '../ChatEvent.js'
import logger from '../../../../../utils/logger.js'

export class InternalChatEvent extends ChatEvent {
  /**
   * @param {object} params
   * @param {Function} [params.onContent]
   * @param {Function} [params.onComplete]
   */
  constructor(params) {
    super(params)
    this.onContent = params.onContent || null
    this.onCompleteCallback = params.onComplete || null
    this.accumulatedContent = ''
  }

  update(data) {
    if (!data) return
    if (data.type === 'content' && typeof data.content === 'string') {
      this.accumulatedContent += data.content
      if (typeof this.onContent === 'function') {
        this.onContent(data.content)
      }
    }
  }

  complete() {
    if (this.completed) return
    super.complete()
    logger.debug(`[InternalChatEvent] Internal task ${this.requestId} completed`)

    if (typeof this.onCompleteCallback === 'function') {
      this.onCompleteCallback(this.accumulatedContent)
    }
  }

  error(err) {
    if (this.completed) return
    super.error(err)
    logger.error(`[InternalChatEvent] Internal task ${this.requestId} failed:`, err)
  }
}
