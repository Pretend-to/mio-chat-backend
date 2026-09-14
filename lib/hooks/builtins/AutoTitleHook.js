import { HOOK_POINTS } from '../types.js'
import BaseHook from '../BaseHook.js'
import sessions from '../../server/socket.io/services/sessions.js'
import logger from '../../../utils/logger.js'

export default class AutoTitleHook extends BaseHook {
  constructor() {
    super('system:auto-title')
  }

  getPriority() {
    // 优先级 10：紧随鉴权、技能注入、预设合并等核心前置之后
    return 10
  }

  async [HOOK_POINTS.LLM_BEFORE_CHAT](ctx) {
    const { event, llmService } = ctx
    if (!event || !llmService) {
      return true
    }

    // 仅针对具有 contactorId 的 Web 对话，且排除系统标题生成自身的内部请求
    if (!event.contactorId) {
      logger.debug('[AutoTitleHook] 跳过: 请求无 contactorId')
      return true
    }
    if (event.requestId?.startsWith('system_title_')) {
      logger.debug('[AutoTitleHook] 跳过: 自身为系统标题生成请求')
      return true
    }

    const namePolicy = event.extraMetadata?.namePolicy ?? 0
    const messages = event.messages || []
    const history = event.settings?.presetSettings?.history || []

    const userMessages = messages.filter((m) => m.role === 'user')
    const historyUsers = history.filter((m) => m.role === 'user')
    const currentUserCount = userMessages.length - historyUsers.length

    logger.info(
      `[AutoTitleHook] 收到对话请求: contactorId=${event.contactorId}, namePolicy=${namePolicy} (0=MODEL, 1=CUSTOM, 2=SUMMARY), userCount=${currentUserCount}, requestId=${event.requestId}`,
    )

    // 仅在命名策略为 SUMMARY (2) 时自动总结
    if (Number(namePolicy) !== 2) {
      logger.info(
        `[AutoTitleHook] 拦截跳过: 会话 ${event.contactorId} 当前命名策略为 ${namePolicy} (非 2/SUMMARY 摘要模式)，跳过标题自动生成`,
      )
      return true
    }

    // 触发频次：用户第 1 次输入即触发；后续每隔 3 轮 (第 4 次、第 7 次...) 触发一次
    if (
      currentUserCount === 1 ||
      (currentUserCount > 1 && (currentUserCount - 1) % 3 === 0)
    ) {
      logger.info(
        `[AutoTitleHook] 🎯 会话 ${event.contactorId} 满足生成条件 (userCount=${currentUserCount})，启动后台异步生成...`,
      )
      // 必须是非阻塞异步执行 (fire-and-forget)，绝不阻塞主对话流与首字延迟 (TTFT)
      this._triggerSummarize(event, llmService, [...messages]).catch(
        (error) => {
          logger.error('[AutoTitleHook] 异步生成会话标题失败:', error)
        },
      )
    } else {
      logger.info(
        `[AutoTitleHook] 会话 ${event.contactorId} 处于轮次节流期 (userCount=${currentUserCount})，跳过生成`,
      )
    }

    return true
  }

  async _triggerSummarize(event, llmService, messages) {
    logger.info(
      `[AutoTitleHook] 开始为会话 ${event.contactorId} 调用 LLM 生成标题...`,
    )
    const newTitle = await llmService.generateChatTitle(messages)
    if (!newTitle) {
      logger.warn(`[AutoTitleHook] 会话 ${event.contactorId} 标题生成结果为空`)
      return
    }

    logger.info(
      `[AutoTitleHook] 会话 ${event.contactorId} 成功生成新标题: "${newTitle}"，准备向客户端推送...`,
    )
    const allClients = sessions.getClientsByUserId(event.principalId, true)
    let pushedCount = 0
    if (allClients && allClients.length > 0) {
      allClients.forEach((c) => {
        c.sendSystemMessage('chat_title_updated', {
          contactorId: event.contactorId,
          title: newTitle,
        })
        pushedCount++
      })
    } else if (event.client?.sendSystemMessage) {
      event.client.sendSystemMessage('chat_title_updated', {
        contactorId: event.contactorId,
        title: newTitle,
      })
      pushedCount = 1
    }
    logger.info(
      `[AutoTitleHook] 已向 ${pushedCount} 个客户端推送 chat_title_updated 事件 (title="${newTitle}")`,
    )
  }
}
