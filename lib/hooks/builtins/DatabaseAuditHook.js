import { HOOK_POINTS } from '../types.js'
import BaseHook from '../BaseHook.js'
import prismaManager from '../../database/prisma.js'

export default class DatabaseAuditHook extends BaseHook {
  constructor() {
    super('system:database-audit')
  }

  async [HOOK_POINTS.LLM_AFTER_CHAT](ctx) {
    const { providerName, usage, model, user, timeMetrics } = ctx
    if (!usage) return true

    try {
      const prompt = usage.promptTokenCount || usage.prompt_tokens || usage.input_tokens || 0
      const candidates = usage.candidatesTokenCount || usage.completion_tokens || usage.output_tokens || 0
      const thoughts = usage.thoughtsTokenCount || 
                       usage.thinking_tokens || 
                       usage.completion_tokens_details?.reasoning_tokens || 
                       usage.output_tokens_details?.reasoning_tokens || 
                       usage.output_token_details?.reasoning_tokens || 
                       0
      const cached = usage.prompt_tokens_details?.cached_tokens || 
                     usage.input_tokens_details?.cached_tokens || 
                     usage.input_token_details?.cached_tokens || 
                     usage.prompt_cache_hit_tokens || 
                     usage.cachedContentTokenCount || 
                     usage.cached_content_token_count || 
                     0
      const cacheMiss = usage.prompt_cache_miss_tokens !== undefined 
                        ? usage.prompt_cache_miss_tokens 
                        : (usage.prompt_tokens_details || usage.input_tokens_details || usage.input_token_details || usage.prompt_cache_hit_tokens || usage.cachedContentTokenCount || usage.cached_content_token_count ? Math.max(0, prompt - cached) : 0)
      const total = usage.totalTokenCount || usage.total_tokens || (prompt + candidates)

      await prismaManager.initialize()
      const prisma = prismaManager.getClient()

      let sessionTitle = timeMetrics?.e?.metaData?.contactorName || null
      if (!sessionTitle && timeMetrics?.e?.body?.messages) {
        const messages = timeMetrics.e.body.messages
        const firstUser = messages.find(m => m.role === 'user')
        if (firstUser) {
          const content = typeof firstUser.content === 'string'
            ? firstUser.content
            : (Array.isArray(firstUser.content)
               ? firstUser.content.find(c => c.type === 'text')?.text || ''
               : '')
          if (content) {
            sessionTitle = content.trim().substring(0, 50)
          }
        }
      }

      const preset = timeMetrics?.presetName || ''
      if (preset.toLowerCase().startsWith('system_title') || preset.toLowerCase().includes('title') || timeMetrics?.requestId?.startsWith('system_title_')) {
        sessionTitle = '🏷️ 自动生成会话标题'
      }

      // 计算耗时与速度指标
      const startTime = timeMetrics?.startTime || Date.now()
      const firstTokenTime = timeMetrics?.firstTokenTime || null
      const now = Date.now()
      const latency = now - startTime

      let ttft = null
      let tps = null

      if (firstTokenTime) {
        ttft = firstTokenTime - startTime
        const generationMs = now - firstTokenTime
        const generationSec = generationMs / 1000
        if (generationSec > 0) {
          tps = candidates / generationSec
        }
      } else {
        const durationSec = latency / 1000
        if (durationSec > 0) {
          tps = candidates / durationSec
        }
      }

      // 异步写入数据库 (不阻塞主线程)
      prisma.lLMCallLog.create({
        data: {
          requestId: timeMetrics?.requestId || 'unknown',
          userId: timeMetrics?.userId || null,
          userIp: timeMetrics?.userIp || null,
          contactorId: timeMetrics?.contactorId || null,
          presetName: timeMetrics?.presetName || null,
          sessionTitle: sessionTitle || null,
          provider: (providerName || 'unknown').toLowerCase(),
          model: timeMetrics?.model || model || 'unknown',
          isStream: timeMetrics?.isStream !== undefined ? timeMetrics.isStream : true,
          trafficType: usage.trafficType || null,
          promptTokens: prompt,
          candidatesTokens: candidates,
          thinkingTokens: thoughts,
          toolsCalled: timeMetrics?.toolsCalled ? JSON.stringify(timeMetrics.toolsCalled) : '[]',
          cacheHitTokens: cached,
          cacheMissTokens: cacheMiss,
          totalTokens: total,
          latency,
          ttft,
          tps,
          status: 'SUCCESS'
        }
      }).catch(err => console.error('[DatabaseAuditHook] Failed to save log:', err))

    } catch (error) {
      console.error('[DatabaseAuditHook] Error processing log data:', error)
    }

    return true
  }
}
