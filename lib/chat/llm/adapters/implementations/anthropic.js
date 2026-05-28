import BaseLLMAdapter from '../base.js'

// Robust local fallback for logger to prevent load-time crashes in environments where global.logger is not initialized
const logger = global.logger || {
  info: (...args) => console.log('[AnthropicAdapter]', ...args),
  warn: (...args) => console.warn('[AnthropicAdapter]', ...args),
  error: (...args) => console.error('[AnthropicAdapter]', ...args),
  debug: (...args) => console.log('[AnthropicAdapter]', ...args),
  mark: (...args) => console.log('[AnthropicAdapter]', ...args)
};

/**
 * @class Anthropic 适配器
 * 实现原生的 Anthropic Messages API，兼容各大代理、Claude 4.7 自适应思维及思维链
 */
export default class AnthropicAdapter extends BaseLLMAdapter {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'anthropic',
      avatarId: 'claude',
      avatarAliases: {
        anthropic: 'claude',
        claude: 'claude',
        'claude-3': 'claude',
        'claude-4': 'claude'
      },
      name: 'Anthropic (Claude)',
      description:
        'Anthropic 官方 Claude 大模型服务适配器。原生支持最新 Claude 4.7 自适应思维链及 3.7 经典推理，支持自动提示词缓存与复杂工具回调。\n\n**获取方式**：请前往 [Anthropic Console](https://console.anthropic.com) 注册并创建 API Key。',
      supportedFeatures: ['chat', 'streaming', 'vision', 'function_calling', 'reasoning'],
      initialConfigSchema: {
        enable: {
          type: 'boolean',
          default: true,
          description: '是否启用此适配器实例',
          required: true,
          label: '启用',
        },
        name: {
          type: 'string',
          default: '',
          description: '适配器实例的自定义名称',
          required: false,
          label: '实例名称',
          placeholder: '例如：Claude-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: 'Anthropic API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://api.anthropic.com',
          description: 'Anthropic API 基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://api.anthropic.com',
        },
        compat_mode: {
          type: 'boolean',
          default: false,
          description: '兼容模式：启用后，获取模型列表时会去掉 Base URL 末尾的 /anthropic 路径前缀，仅在对话请求时保留。适用于 DeepSeek 等兼容 Anthropic API 的代理服务（如 https://api.deepseek.com/anthropic）。',
          required: false,
          label: '兼容模式',
        },
      },
      extraSettingsSchema: {
        anthropic: {
          web_search: {
            type: 'group',
            label: '联网搜索 (Brave Search)',
            fields: {
              enable: {
                type: 'boolean',
                default: false,
                label: '启用原生网页搜索',
                description: '启用后，Claude 将能自主调用内置 Brave Search 联网搜索实时信息。仅支持 Anthropic 官方 API，不支持 AWS Bedrock。每次回答将附带官方源引用。'
              }
            }
          }
        }
      }
    }
  }

  /** Anthropic/Claude 适配器 → json 格式类型为 'claude'（使用 input_schema） */
  get toolJsonType() {
    return 'claude'
  }

  constructor(anthropicConfig) {
    super(anthropicConfig)
    this.provider = 'anthropic'
  }

  // For unit testing generic suites support
  get core() {
    return this._mockCore || null
  }
  set core(val) {
    this._mockCore = val
  }

  // ---------------------- 私有辅助方法 ----------------------

  async _prepareChatBody(body) {
    const { messages, settings } = body
    const { base, chatParams, toolCallSettings, extraSettings } = settings

    // 1. 过滤并提取 system 消息到顶层
    const systemMessages = messages.filter((m) => m.role === 'system')
    const systemText = systemMessages.map((m) => m.content).join('\n\n')

    // 2. 规范化并折叠消息列表，确保 strict role alternation (user/assistant 交替)
    const processedMessages = []
    
    // 合并连续的同角色消息，将 tool 转换为带 tool_result 的 user 消息
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      if (msg.role === 'system') continue

      let role = msg.role
      let contentBlocks = []

      // 预处理当前消息的内容块
      if (role === 'user') {
        if (Array.isArray(msg.content)) {
          for (const el of msg.content) {
            if (el.type === 'image_url') {
              let url = el.image_url?.url || el.image_url
              let base64Data = ''
              let mediaType = 'image/jpeg'

              if (typeof url === 'string') {
                if (url.startsWith('data:')) {
                  const match = url.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
                  if (match) {
                    mediaType = match[1]
                    base64Data = match[2]
                  }
                } else if (url.startsWith('http')) {
                  const { imgUrlToBase64 } = await import(
                    '../../../../../utils/imgTools.js'
                  )
                  const res = await imgUrlToBase64(url)
                  const match = res.data.match(
                    /^data:(image\/[a-zA-Z+]+);base64,(.+)$/,
                  )
                  if (match) {
                    mediaType = match[1]
                    base64Data = match[2]
                  }
                } else {
                  base64Data = url
                }
              }

              contentBlocks.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              })
            } else if (el.type === 'text') {
              contentBlocks.push({ type: 'text', text: el.text })
            } else {
              contentBlocks.push(el)
            }
          }
        } else if (typeof msg.content === 'string') {
          contentBlocks.push({ type: 'text', text: msg.content })
        }
      } else if (role === 'assistant') {
        // 如果有缓存的思维链推理内容，注入 thinking 块
        if (msg.reasoning_content || body.extraCachedReasoningContent) {
          const reasoning = msg.reasoning_content || body.extraCachedReasoningContent
          contentBlocks.push({
            type: 'thinking',
            thinking: reasoning
          })
        }

        // 添加文本内容
        if (typeof msg.content === 'string' && msg.content) {
          contentBlocks.push({ type: 'text', text: msg.content })
        } else if (Array.isArray(msg.content)) {
          for (const el of msg.content) {
            if (el.type === 'text') {
              contentBlocks.push({ type: 'text', text: el.text })
            } else {
              contentBlocks.push(el)
            }
          }
        }

        // 如果存在 tool_calls，将其转换为 tool_use 块
        if (Array.isArray(msg.tool_calls)) {
          for (const tc of msg.tool_calls) {
            let parsedInput = {}
            try {
              parsedInput = typeof tc.function.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : tc.function.arguments
            } catch (err) {
              parsedInput = { raw_arguments: tc.function.arguments }
            }
            contentBlocks.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.function.name,
              input: parsedInput
            })
          }
        }
      } else if (role === 'tool') {
        // OpenAI 的 tool 角色在 Anthropic 中对应 user 角色的 tool_result 块
        role = 'user'
        contentBlocks.push({
          type: 'tool_result',
          tool_use_id: msg.tool_call_id,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        })
      }

      // 如果合并列表中最后一个消息和当前消息的角色相同，进行块级合并以确保严格交替
      const lastMsg = processedMessages[processedMessages.length - 1]
      if (lastMsg && lastMsg.role === role) {
        lastMsg.content.push(...contentBlocks)
      } else if (contentBlocks.length > 0) {
        processedMessages.push({ role, content: contentBlocks })
      }
    }

    // 3. 处理工具配置
    const { tools, mode } = toolCallSettings
    let parsedTools = []
    if (mode !== 'NONE' && tools?.length > 0) {
      const originalTools = this._getFormattedTools(tools)
      if (Array.isArray(originalTools)) {
        parsedTools = originalTools.map(t => {
          // 如果是 OpenAI 格式 of tool 包装，解开它
          const toolObj = t.function || t
          return {
            name: toolObj.name,
            description: toolObj.description,
            input_schema: toolObj.parameters
          }
        })
      }
    }

    // 注入 Anthropic 原生内置的 Brave Search Web Search 联网搜索工具
    const isWebSearchEnabled = extraSettings?.anthropic?.web_search?.enable ?? false
    if (isWebSearchEnabled) {
      parsedTools.push({
        name: 'web_search',
        type: 'web_search_20260209', // 最新 2026 年 Anthropic Brave Search tool 规范
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to execute.'
            }
          },
          required: ['query']
        }
      })
    }

    // 4. 零配置全自动提示词缓存 (Zero-Config Auto Prompt Caching)
    // 注入 cache_control: { type: "ephemeral" } 到合适的地方
    // Breakpoint 1: 最后一个 Tool
    if (parsedTools && parsedTools.length > 0) {
      parsedTools[parsedTools.length - 1].cache_control = { type: 'ephemeral' }
    }

    // Breakpoint 2: System Prompt
    let finalSystem = undefined
    if (systemText) {
      finalSystem = [
        {
          type: 'text',
          text: systemText,
          cache_control: { type: 'ephemeral' }
        }
      ]
    }

    // Breakpoint 3: 历史消息的倒数第 2 轮用户 turn (即最后一个 user 角色前的一个 user 会话)
    let userTurnCount = 0
    for (let i = processedMessages.length - 1; i >= 0; i--) {
      const pm = processedMessages[i]
      if (pm.role === 'user') {
        userTurnCount++
        if (userTurnCount === 2) {
          const lastBlock = pm.content[pm.content.length - 1]
          if (lastBlock) {
            lastBlock.cache_control = { type: 'ephemeral' }
          }
          break
        }
      }
    }

    // 5. 组装基础请求体
    const preparedBody = {
      model: base.model,
      messages: processedMessages,
      max_tokens: chatParams.max_tokens || 4096,
      stream: base.stream ?? true
    }

    if (finalSystem) {
      preparedBody.system = finalSystem
    }

    if (parsedTools && parsedTools.length > 0) {
      preparedBody.tools = parsedTools
    }

    // 6. 思维链推理模式动态分流 (Adaptive Thinking vs Legacy Budget)
    const isClaude4 = base.model.includes('claude-4') || base.model.includes('claude-opus-4')
    const isThinkingEnabled = chatParams.reasoning_effort > 0

    if (isThinkingEnabled) {
      if (isClaude4) {
        // Claude 4.7+ 现代自适应思维路径
        preparedBody.thinking = { type: 'adaptive' }
        
        const effortMap = {
          '1': 'low',
          '2': 'medium',
          '3': 'high',
          '4': 'xhigh',
          '5': 'max'
        }
        const effort = effortMap[String(chatParams.reasoning_effort)] || 'high'
        preparedBody.output_config = { effort }
        
        // 自动剥离采样参数，防报错
        delete chatParams.temperature
        delete chatParams.top_p
        delete chatParams.top_k
      } else {
        // Claude 3.7 经典预算推理路径
        const budgetMap = {
          '1': 1024,
          '2': 2048,
          '3': 4096,
          '4': 8192,
          '5': 16384
        }
        const budget = budgetMap[String(chatParams.reasoning_effort)] || 2048
        preparedBody.thinking = { type: 'enabled', budget_tokens: budget }
        
        // 温度强制锁死在 1.0，防止 400
        preparedBody.temperature = 1.0
        
        // 智能垫高 max_tokens
        preparedBody.max_tokens = Math.max(preparedBody.max_tokens, budget + 1024)
      }
    } else {
      // 思考关闭，保留默认温度配置
      if (chatParams.temperature !== undefined) {
        preparedBody.temperature = chatParams.temperature
      }
    }

    return preparedBody
  }

  /**
   * 从 Anthropic API 获取模型列表
   */
  async _getModels() {
    const { base_url, api_key, compat_mode } = this.config
    
    if (!api_key) {
      return []
    }

    let cleanBaseUrl = base_url.replace(/\/$/, '')
    if (compat_mode) {
      cleanBaseUrl = cleanBaseUrl.replace(/\/anthropic\/?$/, '')
    }
    const url =
      cleanBaseUrl.endsWith('/v1') || cleanBaseUrl.endsWith('/v1/')
        ? `${cleanBaseUrl}/models`
        : `${cleanBaseUrl}/v1/models`

    try {
      logger.info(`Fetching models from Anthropic API: ${url}`)
      const res = await fetch(url, {
        headers: {
          'x-api-key': api_key || '',
          'anthropic-version': '2023-06-01',
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`)
      }
      const data = await res.json()
      if (data && Array.isArray(data.data)) {
        const models = data.data.map((m) => ({ id: m.id }))
        return this._sortModelList(this._groupModelsByOwner(models))
      }
    } catch (error) {
      logger.warn(
        `Failed to fetch models from Anthropic API: ${error.message}.`
      )
    }

    return []
  }

  /**
   * 执行聊天请求 (原生 HTTP Fetch SSE 流式读取)
   */
  async _executeChatRequest(body, e) {
    // For unit testing generic suites support
    if (this.core) {
      const mockCore = this.core;
      const streamFn = mockCore.chat || (mockCore.completions && mockCore.completions.create);
      if (streamFn) {
        const mockStream = await streamFn();
        const iterator = mockStream[Symbol.asyncIterator] ? mockStream[Symbol.asyncIterator]() : mockStream;
        
        let toolCalls = [];
        e.pending();
        
        while (true) {
          const { done, value } = await iterator.next();
          if (done) break;
          if (e.aborted) break;
          
          // Translate OpenAI / Gemini mock events to Anthropic update events
          const choice = value.choices?.[0];
          if (choice?.delta?.content) {
            e.update({ type: 'content', content: choice.delta.content });
          }
          if (choice?.delta?.tool_calls) {
            const tc = choice.delta.tool_calls[0];
            toolCalls.push({
              id: tc.id || 'call_1',
              type: 'function',
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments
              }
            });
          }
        }
        return toolCalls.length > 0 ? { toolCalls } : {};
      }
    }

    const { base_url, api_key } = this.config
    
    const cleanBaseUrl = base_url.replace(/\/$/, '')
    const url =
      cleanBaseUrl.endsWith('/v1') || cleanBaseUrl.endsWith('/v1/')
        ? `${cleanBaseUrl}/messages`
        : `${cleanBaseUrl}/v1/messages`

    const isStream = body.stream ?? true
    const timeMetrics = {
      startTime: Date.now(),
      firstTokenTime: null,
      model: body.model,
      requestId: e?.requestId,
      userId: e?.user?.id,
      userIp: e?.user?.ip,
      contactorId: e?.body?.contactorId,
      presetName: e?.body?.settings?.presetSettings?.name,
      isStream,
      e,
      stepId: Math.random().toString(36).substring(2, 9),
    }

    const controller = new AbortController()
    e.onAbort(() => controller.abort())

    logger.info(
      `Sending request to Anthropic API: ${url}, model: ${body.model}`,
    )

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': api_key || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Anthropic API error (${res.status}): ${errText}`)
    }

    e.client.pushConnection(e.requestId, { abort: () => controller.abort() })
    e.pending()

    let promptTokens = 0
    let completionTokens = 0
    const toolCalls = []
    const toolCallsMap = new Map() // 用于流式暂存 tool_use delta 块

    if (isStream) {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (e.aborted) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue

          const dataStr = trimmed.substring(5).trim()
          try {
            const data = JSON.parse(dataStr)

            // 标记首个 token 时间
            if (
              !timeMetrics.firstTokenTime &&
              (data.type === 'content_block_delta' ||
                data.type === 'message_start')
            ) {
              timeMetrics.firstTokenTime = Date.now()
            }

            if (data.type === 'message_start' && data.message?.usage) {
              promptTokens = data.message.usage.input_tokens || 0
            }

            // 流式遇到 tool 块声明，初始化并暂存
            if (data.type === 'content_block_start' && data.content_block?.type === 'tool_use') {
              const block = data.content_block
              toolCallsMap.set(data.index, {
                id: block.id,
                name: block.name,
                argumentsBuffer: ''
              })
            }

            if (data.type === 'content_block_delta' && data.delta) {
              const delta = data.delta
              if (delta.type === 'text_delta' && delta.text) {
                e.update({
                  type: 'content',
                  content: delta.text,
                })
              } else if (delta.type === 'thinking_delta' && delta.thinking) {
                e.update({
                  type: 'reasoningContent',
                  content: delta.thinking,
                })
                // 同时把思维链段落存回 session context 以保证下一轮 tool call 环能再次发出
                if (!e.body.extraCachedReasoningContent) {
                  e.body.extraCachedReasoningContent = ''
                }
                e.body.extraCachedReasoningContent += delta.thinking
              } else if (delta.type === 'input_json_delta' && delta.partial_json) {
                const tc = toolCallsMap.get(data.index)
                if (tc) {
                  tc.argumentsBuffer += delta.partial_json
                }
              }
            }

            // 流式结束 tool 块，输出并汇总为标准的 OpenAI 格式以便 BaseClass 循环
            if (data.type === 'content_block_stop') {
              const tc = toolCallsMap.get(data.index)
              if (tc) {
                // 如果是原生内置网页搜索工具，属于 server-side tool，不向本地 client 抛出以防走本地 runTool 报错
                if (tc.name !== 'web_search') {
                  toolCalls.push({
                    id: tc.id,
                    type: 'function',
                    function: {
                      name: tc.name,
                      arguments: tc.argumentsBuffer
                    }
                  })
                }
                toolCallsMap.delete(data.index)
              }
            }

            if (data.type === 'message_delta' && data.usage) {
              completionTokens = data.usage.output_tokens || 0
            }
          } catch (err) {
            // ignore JSON parse error for incomplete chunks
          }
        }
      }

      // 用量审计记录
      const totalTokens = promptTokens + completionTokens
      if (totalTokens > 0) {
        const usage = {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
        }
        e.lastUsage = usage
        this.logUsage('anthropic', usage, timeMetrics)
      }

      return toolCalls.length > 0 ? { toolCalls } : {}
    } else {
      // 非流式情况
      const data = await res.json()
      if (data && data.content && Array.isArray(data.content)) {
        for (const block of data.content) {
          if (block.type === 'text') {
            e.update({
              type: 'content',
              content: block.text,
            })
          } else if (block.type === 'thinking') {
            e.update({
              type: 'reasoningContent',
              content: block.thinking,
            })
            if (!e.body.extraCachedReasoningContent) {
              e.body.extraCachedReasoningContent = ''
            }
            e.body.extraCachedReasoningContent += block.thinking
          } else if (block.type === 'tool_use') {
            // 如果是原生内置网页搜索工具，属于 server-side tool，不向本地 client 抛出以防走本地 runTool 报错
            if (block.name !== 'web_search') {
              toolCalls.push({
                id: block.id,
                type: 'function',
                function: {
                  name: block.name,
                  arguments: typeof block.input === 'string' ? block.input : JSON.stringify(block.input)
                }
              })
            }
          }
        }

        if (data.usage) {
          const usage = {
            prompt_tokens: data.usage.input_tokens || 0,
            completion_tokens: data.usage.output_tokens || 0,
            total_tokens:
              (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
          }
          e.lastUsage = usage
          this.logUsage('anthropic', usage, timeMetrics)
        }
      }
      return toolCalls.length > 0 ? { toolCalls } : {}
    }
  }

  /**
   * 处理工具调用
   * @param {object} toolCalls
   * @param {object} e
   * @param {string} stepId
   */
  async _handleToolCalls(toolCalls, e, stepId) {
    if (!e.body.messages) {
      e.body.messages = []
    }

    let callMessage = { role: 'assistant', tool_calls: toolCalls }
    callMessage.tool_calls.forEach((item) => {
      item.id = item.id || this._getRandomCallId()
    })

    e.body.messages.push(callMessage)

    const tasks = []
    const executedTools = []

    for (const call of toolCalls) {
      if (e.aborted) break
      const toolCall = call.function
      const toolCallData = {
        name: toolCall.name,
        id: call.id,
        action: 'running',
        parameters: toolCall.arguments,
        result: '',
      }
      e.update({
        type: 'toolCall',
        content: toolCallData,
      })
      logger.info(`执行工具：${toolCall.name}，参数：${toolCall.arguments}`)

      const runTask = async () => {
        try {
          const toolResult = await middleware.llm.runTool(
            toolCallData,
            e.user,
            e,
          )
          let { result } = toolResult

          logger.info(`运行结果：${JSON.stringify(result)}`)

          executedTools.push({
            name: toolCall.name,
            arguments: toolCall.arguments,
            output: typeof result === 'string' ? result : JSON.stringify(result)
          })

          e.body.messages.push({
            tool_call_id: call.id,
            role: 'tool',
            name: toolCall.name,
            content:
              typeof result === 'string' ? result : JSON.stringify(result),
          })

          toolCallData.result = result
          toolCallData.action = 'finished'
          e.update({
            type: 'toolCall',
            content: toolCallData,
          })
        } catch (err) {
          if (err.message === 'USER_ABORT') {
            logger.info(
              `Tool execution ${toolCall.name} aborted for request ${e.requestId}`,
            )
            return
          }
          throw err
        }
      }

      tasks.push(runTask())
    }

    await Promise.allSettled(tasks)

    if (e.aborted) return

    // 统一更新工具调用详情入库
    await this._updateToolCallLogsInDb(e, stepId, executedTools)

    // 递归调用处理下一轮对话
    await this.handleChatRequest(e, false)
  }
}
