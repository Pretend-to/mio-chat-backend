import crypto from 'crypto'
import config from '../../../config.js'
import SystemSettingsService from '../../../database/services/SystemSettingsService.js'
import { normalizeUsage } from '../../../chat/llm/utils/usageHelper.js'
import { ChatEventFactory } from '../../../chat/llm/events/ChatEventFactory.js'

/**
 * 构造符合 OpenAI 标准协议的 Usage 对象（包含缓存和思考消耗）
 */
function buildOpenAIUsage(rawUsage) {
  if (!rawUsage) return null
  const u = normalizeUsage(rawUsage)
  const usage = {
    prompt_tokens: u.prompt_tokens,
    completion_tokens: u.completion_tokens,
    total_tokens: u.total_tokens,
  }

  const promptDetails = {}
  if (u.cached_tokens > 0) {
    promptDetails.cached_tokens = u.cached_tokens
  }
  if (u.prompt_tokens_details) {
    Object.assign(promptDetails, u.prompt_tokens_details)
  }
  if (Object.keys(promptDetails).length > 0) {
    usage.prompt_tokens_details = promptDetails
  }

  const completionDetails = {}
  if (u.reasoning_tokens > 0) {
    completionDetails.reasoning_tokens = u.reasoning_tokens
  }
  if (u.completion_tokens_details) {
    Object.assign(completionDetails, u.completion_tokens_details)
  }
  if (Object.keys(completionDetails).length > 0) {
    usage.completion_tokens_details = completionDetails
  }

  return usage
}

/**
 * 验证管理员 Token
 */
function validateAdminAuth(req) {
  const adminCode = process.env.ADMIN_CODE || config.web?.admin_code

  // 若系统未配置 admin_code，则允许直接访问（开发模式）
  if (!adminCode) {
    return true
  }

  // 从 Authorization 请求头（Bearer）或 x-admin-code、query、body 获取
  let providedCode = req.headers['x-admin-code'] || req.query?.admin_code || req.body?.admin_code

  if (!providedCode && req.headers.authorization) {
    const authHeader = req.headers.authorization
    if (authHeader.startsWith('Bearer ')) {
      providedCode = authHeader.substring(7)
    }
  }

  return providedCode === adminCode
}

/**
 * 查找对应的适配器实例和真实模型名
 */
async function resolveAdapterAndModel(modelName) {
  const llmService = global.middleware?.llm
  if (!llmService || !llmService.llms) {
    return { error: 'LLM 服务未初始化', statusCode: 500 }
  }

  let targetInstanceId = null
  let targetModelId = modelName

  // 1. 显式实例定位 (例如 OpenAI-1/gpt-4o)
  if (modelName.includes('/')) {
    const parts = modelName.split('/')
    const instanceName = parts[0]
    targetModelId = parts.slice(1).join('/')

    for (const [id, metadata] of Object.entries(llmService.instanceMetadata || {})) {
      if (metadata.displayName === instanceName || id === instanceName) {
        targetInstanceId = id
        break
      }
    }

    if (!targetInstanceId) {
      return { error: `未找到指定的适配器实例: "${instanceName}"`, statusCode: 400 }
    }
  } else {
    // 2. 自动匹配已启用适配器的模型列表
    for (const [id, adapter] of Object.entries(llmService.llms)) {
      const modelsList = adapter.models || []
      const hasModel = modelsList.some(group => group.models && group.models.includes(modelName))
      if (hasModel) {
        targetInstanceId = id
        break
      }

      const guestList = adapter.guestModels || []
      const hasGuestModel = guestList.some(group => group.models && group.models.includes(modelName))
      if (hasGuestModel) {
        targetInstanceId = id
        break
      }
    }

    // 3. Fallback: 使用系统默认的大模型通道
    if (!targetInstanceId) {
      const channelSetting = await SystemSettingsService.get('system_llm_channel')
      const defaultChannelId = channelSetting?.value
      if (defaultChannelId && llmService.llms[defaultChannelId]) {
        targetInstanceId = defaultChannelId
      }
    }

    // 4. 兜底中的兜底：使用第一个可用的实例
    if (!targetInstanceId) {
      const availableIds = Object.keys(llmService.llms)
      if (availableIds.length > 0) {
        targetInstanceId = availableIds[0]
      }
    }
  }

  if (!targetInstanceId || !llmService.llms[targetInstanceId]) {
    return { error: '系统中没有可用或匹配的大模型适配器实例', statusCode: 400 }
  }

  return {
    adapter: llmService.llms[targetInstanceId],
    instanceId: targetInstanceId,
    modelId: targetModelId
  }
}

/**
 * 构造标准 OpenAI 流式 Chunk
 */
function createOpenAIChunk(id, model, content, reasoningContent, finishReason = null, toolCalls = null) {
  const delta = {}
  if (content !== null && content !== undefined) {
    delta.content = content
  }
  if (reasoningContent !== null && reasoningContent !== undefined) {
    delta.reasoning_content = reasoningContent
  }
  if (toolCalls !== null && toolCalls !== undefined) {
    delta.tool_calls = toolCalls
  }

  return {
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finishReason
      }
    ],
    created: Math.floor(Date.now() / 1000),
    id,
    model,
    object: 'chat.completion.chunk'
  }
}

/**
 * 构造标准 OpenAI 非流式完整响应
 */
function createOpenAIResponse(id, model, content, reasoningContent, toolCalls = null) {
  const message = {
    content: content || '',
    role: 'assistant'
  }

  if (reasoningContent) {
    message.reasoning_content = reasoningContent
  }

  if (toolCalls && toolCalls.length > 0) {
    message.tool_calls = toolCalls.map(tc => ({
      function: {
        arguments: tc.function?.arguments || (typeof tc.parameters === 'string' ? tc.parameters : JSON.stringify(tc.parameters)),
        name: tc.function?.name || tc.name
      },
      id: tc.id,
      type: 'function'
    }))
  }

  return {
    choices: [
      {
        index: 0,
        message,
        finish_reason: toolCalls && toolCalls.length > 0 ? 'tool_calls' : 'stop'
      }
    ],
    created: Math.floor(Date.now() / 1000),
    id,
    model,
    object: 'chat.completion',
    usage: {
      completion_tokens: 0,
      prompt_tokens: 0,
      total_tokens: 0
    }
  }
}

/**
 * GET /oai-proxy/v1/models
 */
export async function listModels(req, res) {
  if (!validateAdminAuth(req)) {
    return res.status(403).json({
      error: {
        code: 'invalid_api_key',
        message: '验证失败：需要有效的管理员验证码 (ADMIN_CODE)',
        param: null,
        type: 'invalid_request_error'
      }
    })
  }

  const llmService = global.middleware?.llm
  if (!llmService || !llmService.llms) {
    return res.status(200).json({ data: [], object: 'list' })
  }

  const modelsData = []

  for (const [instanceId, adapter] of Object.entries(llmService.llms)) {
    const metadata = llmService.instanceMetadata[instanceId]
    const displayName = metadata?.displayName || instanceId
    const adapterType = metadata?.adapterType || 'unknown'

    const modelsList = adapter.models || []
    for (const group of modelsList) {
      if (!group.models) {continue}
      for (const modelId of group.models) {
        // 添加带有实例前缀的 ID (支持精准路由)
        const prefixedId = `${displayName}/${modelId}`
        modelsData.push({
          created: 1686935000,
          id: prefixedId,
          object: 'model',
          owned_by: adapterType
        })
      }
    }
  }

  res.status(200).json({
    data: modelsData,
    object: 'list'
  })
}

/**
 * 修复因流式重复导致的双份 JSON 字符串，例如 {"a":1}{"a":1} → {"a":1}
 * 只处理 string 类型，其他类型原样返回。
 * @param {string} str
 * @returns {string}
 */
function cleanDuplicatedJsonArgs(str) {
  if (typeof str !== 'string') {return str}
  const trimmed = str.trim()
  // 已经是合法 JSON，直接返回
  try {
    JSON.parse(trimmed)
    return trimmed
  } catch {}

  // 尝试找到第一个完整的 JSON 对象边界（括号匹配）
  let depth = 0
  let inString = false
  let escape = false
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) {continue}
    if (ch === '{') {depth++}
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        const candidate = trimmed.substring(0, i + 1)
        try {
          JSON.parse(candidate)
          return candidate
        } catch {}
      }
    }
  }
  return str
}

/**
 * 清洗 messages 数组中 assistant 消息里 tool_calls[].function.arguments 的损坏内容。
 * 不修改原数组，返回新数组（浅拷贝，仅在有问题时深拷贝受影响的节点）。
 * @param {Array} messages
 * @returns {Array}
 */
function sanitizeMessages(messages) {
  return messages.map(msg => {
    if (msg.role !== 'assistant' || !Array.isArray(msg.tool_calls)) {return msg}
    let dirty = false
    const cleanedToolCalls = msg.tool_calls.map(tc => {
      if (!tc.function || typeof tc.function.arguments !== 'string') {return tc}
      const cleaned = cleanDuplicatedJsonArgs(tc.function.arguments)
      if (cleaned === tc.function.arguments) {return tc}
      dirty = true
      return { ...tc, function: { ...tc.function, arguments: cleaned } }
    })
    if (!dirty) {return msg}
    return { ...msg, tool_calls: cleanedToolCalls }
  })
}

/**
 * POST /oai-proxy/v1/chat/completions
 */
export async function chatCompletions(req, res) {
  if (!validateAdminAuth(req)) {
    return res.status(403).json({
      error: {
        code: 'invalid_api_key',
        message: '验证失败：需要有效的管理员验证码 (ADMIN_CODE)',
        param: null,
        type: 'invalid_request_error'
      }
    })
  }

  const { model, messages, stream } = req.body
  if (!model || !messages || !Array.isArray(messages)) {
    return res.status(400).json({
      error: {
        code: 'missing_required_parameter',
        message: '参数错误：必须提供 model 和 messages (数组) 字段',
        param: null,
        type: 'invalid_request_error'
      }
    })
  }

  // 1. 解析模型对应的适配器和真实模型ID
  const resolved = await resolveAdapterAndModel(model)
  if (resolved.error) {
    return res.status(resolved.statusCode || 400).json({
      error: {
        code: 'model_not_found',
        message: resolved.error,
        param: 'model',
        type: 'invalid_request_error'
      }
    })
  }

  const { adapter, modelId } = resolved
  const isStream = stream === true

  // 2. 清洗历史消息中损坏的 tool_calls arguments，再构建适配器请求体
  const sanitizedMessages = sanitizeMessages(messages)
  const adapterBody = {
    messages: sanitizedMessages,
    settings: {
      base: {
        model: modelId,
        stream: isStream
      },
      chatParams: {
        frequency_penalty: req.body.frequency_penalty,
        max_tokens: req.body.max_tokens,
        presence_penalty: req.body.presence_penalty,
        response_format: req.body.response_format,
        seed: req.body.seed,
        stop: req.body.stop,
        temperature: req.body.temperature,
        tool_choice: req.body.tool_choice,
        top_p: req.body.top_p,
        user: req.body.user
      },
      extraSettings: {},
      toolCallSettings: {
        mode: req.body.tools ? 'AUTO' : 'NONE',
        passthrough: true,
        tools: req.body.tools || []
      }
    }
  }

  // 3. 使用规范工厂构建 API 代理事件对象
  const e = ChatEventFactory.createForProxy({
    adapterBody,
    chunkFormatter: createOpenAIChunk,
    messages: sanitizedMessages,
    model,
    req,
    res,
    responseFormatter: createOpenAIResponse,
    stream: isStream,
    usageBuilder: buildOpenAIUsage,
  })

  req.on('close', () => {
    e.abort()
  })

  // 4. 使用 ES6 Proxy 装饰适配器，拦截 `_handleToolCalls` 方法以防止在服务端执行工具
  const decoratedAdapter = new Proxy(adapter, {
    get(target, prop, receiver) {
      if (prop === '_handleToolCalls') {
        return async function get(toolCalls, event) {
          // 捕获工具调用，不执行
          e.capturedToolCalls = toolCalls

          // 标记 aborted 为 true，阻断适配器继续递归调用 handleChatRequest
          event.aborted = true
        }
      }
      return Reflect.get(target, prop, receiver)
    }
  })

  // 5. 触发适配器请求
  try {
    await decoratedAdapter.handleChatRequest(e)
  } catch (error) {
    e.error(error)
  }
}
