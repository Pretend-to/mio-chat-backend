/**
 * lib/chat/llm/events/normalizers/ProxyNormalizer.js
 * 边界标准化层：将 HTTP API 代理 (/oai-proxy) 请求标准化为规范事件入参
 */

import {
  CONVERSATION_KIND,
  EVENT_SOURCE,
  TRIGGER_KIND,
} from '../constants.js'

export class ProxyNormalizer {
  /**
   * @param {object} param0
   * @param {import('express').Request} param0.req
   * @param {import('express').Response} param0.res
   * @param {string} param0.model
   * @param {Array<object>} param0.messages
   * @param {boolean} param0.stream
   * @param {object} [param0.adapterBody]
   * @param {Function} param0.chunkFormatter
   * @param {Function} param0.responseFormatter
   * @param {Function} param0.usageBuilder
   * @returns {object}
   */
  static normalize({
    adapterBody = {},
    chunkFormatter,
    messages = [],
    model,
    req,
    res,
    responseFormatter,
    stream = true,
    usageBuilder,
  }) {
    const callerIp = req.ip || req.socket?.remoteAddress || '127.0.0.1'
    const eventId = `chatcmpl-${Date.now()}`

    return {
      actorId: `proxy:${callerIp}`,
      adapterBody,
      auditContext: {
        actorId: `proxy:${callerIp}`,
        channelId: null,
        contactorId: null,
        principalId: 'proxy_admin',
        sessionId: null,
        sourceType: EVENT_SOURCE.PROXY,
      },
      cacheOwnerIds: [],
      channel: null,
      channelId: null,
      chunkFormatter,
      client: null,
      contactorId: null,
      conversationKind: CONVERSATION_KIND.NONE,
      isStream: stream,
      member: null,
      memory: null,
      messageId: eventId,
      messages,
      modelName: model,
      principalId: 'proxy_admin',
      requestId: eventId,
      requestStartTime: Date.now(),
      res,
      responseFormatter,
      sessionId: null,
      settings: adapterBody.settings || { base: { model, stream } },
      source: EVENT_SOURCE.PROXY,
      triggerKind: TRIGGER_KIND.INTERACTIVE,
      usageBuilder,
      user: {
        id: 'proxy_admin',
        ip: callerIp,
        isAdmin: true,
        origin: 'proxy',
        role: 'admin',
      },
    }
  }
}
