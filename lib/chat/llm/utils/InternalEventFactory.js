
/**
 * 内部 LLM 事件工厂
 * 用于生成符合适配器接口要求的虚拟事件对象，防止因缺少字段导致的崩溃。
 */
export class InternalEventFactory {
  /**
   * 创建一个用于简单内部任务（如起标题、摘要）的虚拟事件
   * @param {Object} options 
   * @param {string} options.model - 模型名称
   * @param {Array} options.messages - 消息历史
   * @param {string} options.requestId - 请求ID
   * @param {Function} options.onContent - 内容更新回调
   * @param {Object} options.chatParams - 自定义聊天参数
   * @param {Object} options.extraSettings - 适配器特定设置
   * @returns {Object} 伪装后的 Event 对象
   */
  static createSimpleEvent({ model, messages, requestId, onContent, onComplete, chatParams, extraSettings, stream = false }) {
    const id = requestId || `internal-${Date.now()}`;
    
    return {
      requestId: id,
      body: {
        messages: messages || [],
        settings: {
          base: { 
            model: model, 
            stream: stream 
          },
          chatParams: chatParams || { 
            reasoning_effort: 0 
          },
          toolCallSettings: { 
            mode: 'NONE' 
          },
          extraSettings: extraSettings || {}
        }
      },
      // 核心钩子补全
      onAbort: () => {
        logger.debug(`[InternalEvent] Request ${id} aborted (noop)`);
      },
      pending: () => {
        logger.debug(`[InternalEvent] Request ${id} pending`);
      },
      reply: (chunk) => {
        logger.debug(`[InternalEvent] Request ${id} reply`);
      },
      update: (data) => {
        if (data.type === 'content' && typeof onContent === 'function') {
          onContent(data.content);
        }
      },
      complete: () => {
        logger.debug(`[InternalEvent] Request ${id} completed`);
        if (typeof onComplete === 'function') {
          onComplete();
        }
      },
      error: (err) => {
        logger.error(`[InternalEvent] Request ${id} failed:`, err);
        throw err;
      },
      // 客户端接口 Mock
      client: {
        pushEvent: () => {},
        popEvent: () => {},
        pushConnection: () => {}, // 补上这个 Mock，防止后台任务报错
        popConnection: () => {},
        sendOpenaiMessage: () => {}
      }
    };
  }

  /**
   * 补全标准请求体（用于 TaskRunner 等需要实例化 LLMMessageEvent 的场景）
   */
  static createFullReq(baseReq = {}) {
    const defaultSettings = {
      base: { stream: true },
      chatParams: { reasoning_effort: 0 },
      toolCallSettings: { mode: 'AUTO', tools: [] },
      extraSettings: {}
    };

    return {
      ...baseReq,
      data: {
        ...baseReq.data,
        settings: {
          ...defaultSettings,
          ...(baseReq.data?.settings)
        }
      }
    };
  }
}
