/**
 * 统一多模型用量结构归一化
 * 将各大模型供应商（OpenAI, Gemini, Anthropic, DeepSeek, Volcengine 等）的用量统一转换为标准结构
 * @param {object} usage 原始用量对象
 * @returns {object} 归一化后的标准用量对象
 */
export function normalizeUsage(usage) {
  if (!usage || typeof usage !== 'object') {
    return {
      cached_tokens: 0,
      cache_miss_tokens: 0,
      completion_tokens: 0,
      prompt_tokens: 0,
      reasoning_tokens: 0,
      total_tokens: 0,
      trafficType: null,
    }
  }

  const prompt =
    usage.prompt_tokens ??
    usage.promptTokenCount ??
    usage.input_tokens ??
    0

  const candidates =
    usage.completion_tokens ??
    usage.candidatesTokenCount ??
    usage.output_tokens ??
    0

  const thoughts =
    usage.reasoning_tokens ??
    usage.completion_tokens_details?.reasoning_tokens ??
    usage.output_tokens_details?.reasoning_tokens ??
    usage.output_token_details?.reasoning_tokens ??
    usage.thoughtsTokenCount ??
    usage.thinking_tokens ??
    0

  const cached =
    usage.cached_tokens ??
    usage.prompt_tokens_details?.cached_tokens ??
    usage.input_tokens_details?.cached_tokens ??
    usage.input_token_details?.cached_tokens ??
    usage.prompt_cache_hit_tokens ??
    usage.cachedContentTokenCount ??
    usage.cached_content_token_count ??
    0

  const cacheMiss =
    usage.cache_miss_tokens ??
    usage.prompt_cache_miss_tokens ??
    (cached > 0 ? Math.max(0, prompt - cached) : 0)

  const total =
    usage.total_tokens ??
    usage.totalTokenCount ??
    (prompt + candidates)

  const trafficType = usage.trafficType || null

  return {
    ...usage,
    cached_tokens: cached,
    cache_miss_tokens: cacheMiss,
    completion_tokens: candidates,
    prompt_tokens: prompt,
    reasoning_tokens: thoughts,
    total_tokens: total,
    trafficType,
    prompt_tokens_details: {
      cached_tokens: cached,
      ...(usage.prompt_tokens_details || usage.input_tokens_details || {})
    },
    completion_tokens_details: {
      reasoning_tokens: thoughts,
      ...(usage.completion_tokens_details || usage.output_tokens_details || {})
    }
  }
}
