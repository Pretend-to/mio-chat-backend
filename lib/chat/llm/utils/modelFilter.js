/**
 * LLM 模型文本过滤器 (Model Filter)
 *
 * 策略原则：黑名单精准排除 + 默认放行 (Default Allow)
 * 1. 优先依据厂商元数据（如 Gemini supportedGenerationMethods、OpenAI allow_sampling 等）严格判定；
 * 2. 依据专用非对话模型黑名单（Embedding / TTS / Whisper / 图像生成 / 审核 / Realtime 等）排除；
 * 3. 对海量第三方 OpenAI 兼容厂商及未知模型默认一律放行，杜绝误杀。
 */

/** 专用非对话模型的名称正则特征黑名单 */
const NON_TEXT_PATTERNS = [
  // Embedding / Rerank 向量检索专用
  /(^|[-_./])(embed|embedding|embeddings|text-embedding|bge|rerank|reranker)([-_./]|$)/i,
  // 语音识别与合成 (TTS / Whisper / Speech / Audio)
  /(^|[-_./])(tts|whisper|speech|voice|music|transcribe|audio)([-_./]|$)/i,
  // 独立图像/视频生成 (DALL-E / Flux / Stable Diffusion / CogVideo 等)
  /(^|[-_./])(dall-e|dalle|flux|midjourney|stable-diffusion|sdxl|imagen|cogvideox)([-_./]|$)/i,
  // 内容审查过滤
  /(^|[-_./])(moderation|guard)([-_./]|$)/i,
  // 实时端到端语音协议 (Realtime WebSocket)
  /(^|[-_./])(realtime)([-_./]|$)/i,
  // 机器人与桌面模拟专用
  /(^|[-_./])(robotics|computer-use|lyria)([-_./]|$)/i,
]

/**
 * 判断单个模型是否为文本/对话模型
 * @param {string|object} model - 模型 ID 字符串或包含元数据的对象
 * @returns {boolean}
 */
export function isTextChatModel(model) {
  if (!model) {
    return false
  }

  // 1. 解析模型 ID 与元数据
  let id = ''
  let meta = null

  if (typeof model === 'string') {
    id = model
  } else if (typeof model === 'object') {
    id = model.id || model.name || ''
    meta = model
  }

  if (!id) {
    return false
  }

  // 2. 协议级元数据精确判定
  if (meta) {
    // 2.1 Gemini 协议：若显式声明了 supportedGenerationMethods，必须包含 generateContent
    if (
      Array.isArray(meta.supportedGenerationMethods) &&
      meta.supportedGenerationMethods.length > 0 &&
      !meta.supportedGenerationMethods.includes('generateContent')
    ) {
      return false
    }

    // 2.2 OpenAI / 兼容协议：若显式标注不可采样（allow_sampling === false）
    if (meta.allow_sampling === false || meta.capabilities?.chat === false) {
      return false
    }

    // 2.3 显式声明的非 chat 类型
    const explicitType = String(meta.type || meta.object || '').toLowerCase()
    if (
      explicitType === 'embedding' ||
      explicitType === 'audio' ||
      explicitType === 'moderation'
    ) {
      return false
    }
  }

  // 3. 特征黑名单模式精确匹配
  const cleanId = id.toLowerCase()
  if (NON_TEXT_PATTERNS.some((pattern) => pattern.test(cleanId))) {
    return false
  }

  // 4. 默认放行 (Default Allow)
  return true
}

/**
 * 过滤模型列表（支持扁平数组、对象数组与分组数组结构）
 * @param {Array<string|object>} models - 待过滤的模型集合
 * @returns {Array<string|object>} 过滤后的文本模型集合
 */
export function filterTextChatModels(models) {
  if (!Array.isArray(models)) {
    return []
  }

  return models
    .map((item) => {
      // 分组结构：{ owner: '...', models: [...] }
      if (item && typeof item === 'object' && Array.isArray(item.models)) {
        const filteredGroupModels = item.models.filter(isTextChatModel)
        if (filteredGroupModels.length === 0) {
          return null
        }
        return {
          ...item,
          models: filteredGroupModels,
        }
      }

      // 扁平结构：字符串或模型对象
      return isTextChatModel(item) ? item : null
    })
    .filter(Boolean)
}
