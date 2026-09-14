import { HOOK_POINTS } from '../types.js'
import BaseHook from '../BaseHook.js'
import prismaManager from '../../database/prisma.js'
import { normalizeUsage } from '../../chat/llm/utils/usageHelper.js'

export function calculatePerformanceMetrics({
  candidates = 0,
  endTime = Date.now(),
  firstTokenTime = null,
  startTime = endTime,
} = {}) {
  const latency = Math.max(0, endTime - startTime)
  const ttft = firstTokenTime ? Math.max(0, firstTokenTime - startTime) : null
  const tps =
    candidates > 0 && latency > 0 ? candidates / (latency / 1000) : null

  return { latency, tps, ttft }
}

export default class DatabaseAuditHook extends BaseHook {
  constructor() {
    super('system:database-audit')
  }

  async [HOOK_POINTS.LLM_AFTER_CHAT](ctx) {
    const { providerName, usage, model, timeMetrics } = ctx
    if (!usage && !timeMetrics) {
      return true
    }

    try {
      const status = timeMetrics?.status || (usage ? 'SUCCESS' : 'FAILED')
      const errorMessage = timeMetrics?.errorMessage || null

      const u = normalizeUsage(usage)
      const prompt = u.prompt_tokens
      const candidates = u.completion_tokens
      const thoughts = u.reasoning_tokens
      const cached = u.cached_tokens
      const cacheMiss = u.cache_miss_tokens
      const total = u.total_tokens
      const trafficType = u.trafficType

      await prismaManager.initialize()
      const prisma = prismaManager.getClient()

      let sessionTitle = null
      if (timeMetrics?.sessionId) {
        const session = await prisma.session.findUnique({
          select: { title: true },
          where: { id: timeMetrics.sessionId },
        })
        sessionTitle = session?.title || null
      }
      const event = timeMetrics?.e
      sessionTitle ||= event?.member?.name || null
      const eventMessages = event?.messages || null
      if (!sessionTitle && eventMessages) {
        const firstUser = eventMessages.find((m) => m.role === 'user')
        if (firstUser) {
          const content =
            typeof firstUser.content === 'string'
              ? firstUser.content
              : Array.isArray(firstUser.content)
                ? firstUser.content.find((c) => c.type === 'text')?.text || ''
                : ''
          if (content) {
            sessionTitle = content.trim().substring(0, 50)
          }
        }
      }

      if (timeMetrics?.requestId?.startsWith('system_title_')) {
        sessionTitle = '🏷️ 自动生成会话标题'
      }

      // 计算耗时与速度指标
      const startTime = timeMetrics?.startTime || Date.now()
      const now = Date.now()
      // 部分供应商/代理会缓冲流式响应，首个可见 Chunk 到结束包仅相隔数毫秒。
      // 该区间不能代表真实生成耗时，因此统一使用客户端可观测的端到端输出吞吐：
      // completion tokens / request latency。这样不同协议间也具备可比性。
      const { latency, tps, ttft } = calculatePerformanceMetrics({
        candidates,
        endTime: now,
        firstTokenTime: timeMetrics?.firstTokenTime || null,
        startTime,
      })

      // 异步写入数据库 (不阻塞主线程)
      prisma.lLMCallLog
        .create({
          data: {
            adapterInstanceId: timeMetrics?.adapterInstanceId || null,
            adapterName: timeMetrics?.adapterName || null,
            adapterType: timeMetrics?.adapterType || null,
            cacheHitTokens: cached,
            cacheMissTokens: cacheMiss,
            candidatesTokens: candidates,
            channelId: timeMetrics?.channelId || null,
            contactorId: timeMetrics?.contactorId || null,
            errorMessage,
            isStream:
              timeMetrics?.isStream !== undefined ? timeMetrics.isStream : true,
            latency,
            model: timeMetrics?.model || model || 'unknown',
            presetName: timeMetrics?.presetName || null,
            promptTokens: prompt,
            provider: (providerName || 'unknown').toLowerCase(),
            requestId: timeMetrics?.requestId || 'unknown',
            sessionId: timeMetrics?.sessionId || null,
            sessionTitle: sessionTitle || null,
            sourceType: timeMetrics?.sourceType || null,
            status,
            thinkingTokens: thoughts,
            toolsCalled: timeMetrics?.toolsCalled
              ? JSON.stringify(timeMetrics.toolsCalled)
              : '[]',
            totalTokens: total,
            tps,
            trafficType,
            ttft,
            userId: timeMetrics?.userId || null,
            userIp: timeMetrics?.userIp || null,
          },
        })
        .catch((error) =>
          console.error('[DatabaseAuditHook] Failed to save log:', error),
        )
    } catch (error) {
      console.error('[DatabaseAuditHook] Error processing log data:', error)
    }

    return true
  }

  /**
   * 补全工具执行详情 (异步打补丁更新，不阻塞主流程，无需修改数据库 schema)
   */
  async [HOOK_POINTS.LLM_TOOL_RESULTS](ctx) {
    const { requestId, executedTools } = ctx
    if (!requestId || !executedTools || executedTools.length === 0) {
      return true
    }

    try {
      await prismaManager.initialize()
      const prisma = prismaManager.getClient()

      // 异步更新数据库中的 toolDetails 字段，不阻塞主线程
      prisma.lLMCallLog
        .updateMany({
          data: {
            toolDetails: JSON.stringify(executedTools),
          },
          where: { requestId: requestId },
        })
        .catch((error) =>
          console.error(
            '[DatabaseAuditHook] Failed to update tool details:',
            error,
          ),
        )
    } catch (error) {
      console.error('[DatabaseAuditHook] Error updating tool details:', error)
    }

    return true
  }
}
