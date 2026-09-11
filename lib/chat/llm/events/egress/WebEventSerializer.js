/**
 * lib/chat/llm/events/egress/WebEventSerializer.js
 * 出口序列化层：负责将内部领域事件转换为 Web 客户端 (Socket.IO) 契约 DTO
 * 保证前端完全零破坏、流消息不丢、streamCache 快照完全兼容
 */

export class WebEventSerializer {
  /**
   * 构造符合前端协议的流式 Chunk 数据载荷
   * @param {object} chunk
   * @param {object} stateHolder 维护当前推理开始时间的上下文状态
   * @returns {object} 格式化后的 chunk
   */
  static formatChunk(chunk, stateHolder) {
    if (!chunk || typeof chunk !== 'object') return chunk

    const currentType = chunk.type

    // 自动将 reasoningContent 转换为前端 MdRenderer 所需的 reason 数据结构
    if (currentType === 'reasoningContent') {
      if (stateHolder.lastChunkType !== 'reasoningContent') {
        stateHolder.currentReasoningStartTime = Date.now()
      }

      return {
        data: {
          duration: 0,
          startTime: stateHolder.currentReasoningStartTime,
          text: chunk.content,
        },
        type: 'reason',
      }
    }

    return chunk
  }

  /**
   * 提取标准的 metaData 供 Socket 传输与 streamCache 持久化
   * @param {import('../ChatEvent.js').ChatEvent} event
   * @returns {object}
   */
  static buildMetadata(event) {
    const meta = {
      contactorId: event.contactorId,
      isTask: event.triggerKind === 'task',
      messageId: event.messageId,
      namePolicy: event.settings?.namePolicy || 0,
      triggerType: event.triggerKind === 'task' ? 'task' : 'chat',
    }

    if (event.member) {
      meta.memberId = event.member.id
      meta.memberName = event.member.name
      meta.memberAvatar = event.member.avatar
    }

    return meta
  }

  /**
   * 构造发往前端的 Socket 消息体
   * @param {string} type 'update' | 'complete' | 'failed' | 'pending' | 'reply'
   * @param {object|string} data
   * @param {import('../ChatEvent.js').ChatEvent} event
   * @returns {object}
   */
  static serializeSocketPayload(type, data, event) {
    const metaData = this.buildMetadata(event)

    if (typeof data === 'string') {
      return {
        message: data,
        metaData,
      }
    }

    if (data && typeof data === 'object') {
      return {
        ...data,
        metaData: {
          ...metaData,
          ...(data.metaData || {}),
        },
      }
    }

    return { metaData }
  }
}
