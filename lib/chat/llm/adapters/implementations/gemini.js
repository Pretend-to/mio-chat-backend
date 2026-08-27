import BaseLLMAdapter from '../base.js'
import { Gemini } from '../lib/geminiHttpClient.js'
import { GEMINI_SAFETY_SETTINGS_SCHEMA } from '../lib/geminiSafetySettings.js'
import { base64ToImageUrl, imgUrlToBase64, resolveImageAsBase64 } from '../../../../../utils/imgTools.js'

function getMimeTypeFromBase64(base64Str) {
  try {
    const buffer = Buffer.from(base64Str, 'base64')
    if (buffer.length > 8) {
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return 'image/png'
      }
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'image/jpeg'
      }
      if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
        return 'image/gif'
      }
      if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
          buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return 'image/webp'
      }
    }
  } catch {
    // Ignore
  }
  return 'image/jpeg' // Fallback
}

/**
 * @class OpenAI Bot 实现
 */
export default class GeminiAdapter extends BaseLLMAdapter {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      avatarId: 'gemini',
      description:
        'Google AI Studio 专用适配器。提供对 Gemini 系列模型的快速访问，适合开发者原型设计与测试。支持多模态输入（图片、视频、长文本）及 Google Search 插件。\n\n**获取方式**：访问 [Google AI Studio](https://aistudio.google.com/app/apikey) 免费创建 API 密钥。',
      extraSettingsSchema: {
        gemini: {
          internalTools: {
            fields: {
              code_execution: {
                default: false,
                label: '代码执行 (Code Execution)',
                type: 'boolean',
              },
              google_search: {
                default: false,
                label: 'Google Search',
                type: 'boolean',
              },
              url_context: {
                default: false,
                label: '网页解析 (URL Context)',
                type: 'boolean',
              },
            },
            label: '内置工具',
            type: 'group',
          },
          ...GEMINI_SAFETY_SETTINGS_SCHEMA,
        },
      },
      initialConfigSchema: {
        api_key: {
          default: '',
          description: 'Google AI Studio API 密钥',
          label: 'API Key',
          placeholder: 'AIza...',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://generativelanguage.googleapis.com',
          description: 'Gemini API 的基础 URL',
          label: 'Base URL',
          placeholder: 'https://generativelanguage.googleapis.com',
          required: false,
          type: 'url',
        },
        enable: {
          default: true,
          description: '是否启用此适配器实例',
          label: '启用',
          required: true,
          type: 'boolean',
        },
        models: {
          default: [],
          description: '可用的模型列表，通常由系统自动获取',
          label: '模型列表',
          readonly: true,
          required: false,
          type: 'array',
        },
        name: {
          default: '',
          description: '适配器实例的自定义名称，用于区分多个实例',
          label: '实例名称',
          placeholder: '例如：Gemini-主要',
          required: false,
          type: 'string',
        },
      },
      name: 'Gemini',
      supportedFeatures: ['chat', 'streaming', 'vision', 'multimodal'],
      type: 'gemini',
    }
  }

  /** Gemini 适配器 → json 格式类型为 'gemini'（处理 oneOf 兼容） */
  get toolJsonType() {
    return 'gemini'
  }

  constructor(geminiConfig) {
    super(geminiConfig)
    this.provider = 'gemini'
  }

  get core() {
    const { base_url, api_key } = this.config

    if (!api_key) {
      throw new Error('Gemini API Key 未配置')
    }

    const apiKeys = api_key.split(',')
    const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)]
    logger.info(
      `使用Gemini API：${base_url} , 第${apiKeys.indexOf(selectedKey) + 1}个key`,
    )

    return new Gemini({ api_key: selectedKey, base_url })
  }

  // ---------------------- 私有辅助方法 ----------------------

  /**
   * 从 OpenAI API 获取模型列表
   * @returns {Promise<Array<object>>} 格式化后的模型列表
   * @throws {Error} 如果获取模型列表失败，则抛出错误
   */
  async _getModels() {
    const models = await this.core.models()
    const modelList = this._groupModelsByOwner(models)
    return this._sortModelList(modelList)
  }

  /**
   * 预处理消息（例如，将图片 URL 转换为 Base64）
   */
  async _processMessages(messages) {
    const processed = []
    for (const message of messages) {
      if (message.role === 'user' && Array.isArray(message.content)) {
        const processedContent = []
        for (const element of message.content) {
          if (element.type === 'image_url') {
            const url = element.image_url?.url || element.image_url
            const finalUrl = await resolveImageAsBase64(url)
            processedContent.push({
              image_url: { url: finalUrl },
              type: 'image_url',
            })
          } else if (element.type === 'text') {
            processedContent.push({
              text: element.text,
              type: 'text',
            })
          } else if (element.type === 'input_audio') {
            const res = await imgUrlToBase64(element.input_audio?.url)
            const base64 = typeof res === 'object' ? res.data : null
            if (base64) {
              processedContent.push({
                input_audio: {
                  data: base64,
                  format: element.input_audio?.format || 'wav',
                },
                type: 'input_audio',
              })
            }
          } else if (element.type === 'file_url') {
            const res = element.file_url?.url
              ? await imgUrlToBase64(element.file_url.url)
              : null
            const base64 = typeof res === 'object' ? res.data : null
            if (base64) {
              processedContent.push({
                file_url: { url: base64 },
                type: 'file_url',
              })
            }
          } else {
            processedContent.push(element)
          }
        }
        processed.push({ ...message, content: processedContent })
      } else {
        processed.push(message)
      }
    }
    return processed
  }

  /**
   * 执行 Gemini API 请求
   * @param {object} body
   * @param {object} e
   * @returns {object}
   */
  async _executeChatRequest(body, e) {
    const stepId = Math.random().toString(36).substring(2, 9)
    e._currentStepId = stepId

    const timeMetrics = {
      contactorId: e?.body?.contactorId,
      e: e,
      firstTokenTime: null,
      isStream: !!body.stream,
      model: body.model || e.body?.settings?.base?.model || 'unknown',
      presetName: e?.body?.settings?.presetSettings?.name,
      requestId: e?.requestId,
      startTime: Date.now(),
      stepId,
      userId: e?.user?.id,
      userIp: e?.user?.ip
    }

    let lastUsageMetadata = null
    const callMessage = []
    const cachedMessage = {
      role: 'assistant',
      content: '',
    }

    const stream = this.core.chat(body, e.aborted ? null : e)
    e.client.pushConnection(e.requestId, stream)

    for await (const chunk of stream) {
      if (e.aborted) {break}

      // 记录首字延迟 (TTFT)
      if (chunk.candidates && chunk.candidates.length > 0 && !timeMetrics.firstTokenTime) {
        timeMetrics.firstTokenTime = Date.now()
      }

      // 暂存最新的累积用量
      if (chunk.usageMetadata) {
        lastUsageMetadata = chunk.usageMetadata
        e.lastUsage = chunk.usageMetadata
      }
      if (!chunk.candidates || chunk.candidates.length === 0) {
        const { promptFeedback } = chunk
        if (promptFeedback) {
          const Tip = `\n\n本次对话已被强制结束，结束原因：${promptFeedback.blockReason}`
          e.update({
            content: Tip,
            type: 'content',
          })
        }

        continue
      }

      const { content, finishReason, groundingMetadata } = chunk.candidates[0]

      if (content?.parts) {
        for (let partIdx = 0; partIdx < content.parts.length; partIdx++) {
          const part = content.parts[partIdx]
          const {
            text,
            functionCall,
            inlineData,
            executableCode,
            codeExecutionResult,
            fileData,
            thought,
            thoughtSignature,
          } = part

          if (text) {
            e.update({
              content: text,
              type: thought ? 'reasoningContent' : 'content',
            })
            if (!thought) {
              cachedMessage.content += text
            }
          }

          if (functionCall) {
            // 防止流式响应中同一个工具调用被重复推入
            const isDuplicate = callMessage.some(
              (msg) => msg.functionCall.name === functionCall.name &&
                JSON.stringify(msg.functionCall.args) === JSON.stringify(functionCall.args)
            )
            if (!isDuplicate) {
              const toolCallElem = {
                functionCall,
                functionCallId: functionCall.id || null,
                partIdx: partIdx, // 记录对应的 part index
                thoughtSignature: null,
              }
              callMessage.push(toolCallElem)
            }
          }

          if (inlineData) {
            const { data, mimeType } = inlineData
            const availableTypes = ['image/png', 'image/jpeg', 'image/gif']
            if (availableTypes.includes(mimeType)) {
              const imageUrl = await base64ToImageUrl('', data)
              e.update({
                content: `\n![图片](${imageUrl})\n`,
                type: 'content',
              })
            } else {
              logger.warn(`未知的 inlineData 类型：${mimeType}`)
              e.update({
                content: `\n\n未知的 inlineData 类型：${mimeType}\n\n`,
                type: 'content',
              })
            }
          }
          if (executableCode) {
            const { code, language } = executableCode
            const mdCodeTip = `\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`
            e.update({
              content: mdCodeTip,
              type: 'content',
            })
          }
          if (codeExecutionResult) {
            const { outcome, output } = codeExecutionResult
            if (outcome === 'OUTCOME_OK') {
              const mdCodeTip = `\n\n\`\`\`\n${output}\n\`\`\`\n\n`
              e.update({
                content: mdCodeTip,
                type: 'content',
              })
            } else {
              const errorTip = `\n\n本次代码执行失败，错误信息：${output}\n\n`
              e.update({
                content: errorTip,
                type: 'content',
              })
            }
          }
          if (fileData) {
            const { _mimeType, fileUri } = fileData
            const fileTipTemplate = `\n\n文件下载链接：${fileUri}\n\n`
            e.update({
              content: fileTipTemplate,
              type: 'content',
            })
          }

          if (thoughtSignature) {
            const targetMsg = callMessage.find((msg) => msg.partIdx === partIdx && !msg.thoughtSignature)
            if (targetMsg) {
              targetMsg.thoughtSignature = thoughtSignature
            } else {
              // 容错兜底：如果找不到对应的 partIdx，则赋给最后一个尚未设置 ID 的工具调用
              const lastUnsigned = [...callMessage].toReversed().find((msg) => !msg.thoughtSignature)
              if (lastUnsigned) {
                lastUnsigned.thoughtSignature = thoughtSignature
              }
            }
          }
        }
      }

      if (finishReason && finishReason !== 'STOP') {
        const stopTip = `\n\n本次对话已被强制结束，结束原因：${chunk.candidates[0].finishReason}`
        e.update({
          content: stopTip,
          type: 'content',
        })
      }

      if (groundingMetadata) {
        logger.json(groundingMetadata)
      }
    }

    const finalUsage = lastUsageMetadata || { candidatesTokenCount: 0, promptTokenCount: 0, totalTokenCount: 0 }
    const providerName = this.constructor.getAdapterMetadata()?.name || this.provider
    if (callMessage && callMessage.length > 0) {
      timeMetrics.toolsCalled = callMessage.map(msg => msg.functionCall?.name).filter(Boolean)
    }
    this.logUsage(providerName, finalUsage, timeMetrics)

    // 在流式循环结束后，检查是否有工具需要调用
    if (callMessage.length > 0) {
      const normalizedToolCalls = callMessage.map((msg) => {
        let id
        if (msg.thoughtSignature || msg.functionCallId) {
          id = `gsig_${  Buffer.from(`${msg.thoughtSignature || ''}|${msg.functionCallId || ''}`).toString('hex')}`
        } else {
          id = `local_${  this._getRandomCallId()}`
        }
        return {
          function: {
            arguments: typeof msg.functionCall.args === 'string'
              ? msg.functionCall.args
              : (msg.functionCall.args ? JSON.stringify(msg.functionCall.args) : '{}'),
            name: msg.functionCall.name,
          },
          id,
          type: 'function',
        }
      })

      normalizedToolCalls.forEach((call) => {
        const toolCallData = {
          action: 'started',
          id: call.id,
          name: call.function.name,
          parameters: call.function.arguments,
          result: '',
        }
        e.update({
          content: toolCallData,
          type: 'toolCall',
        })
      })

      if (cachedMessage.content) {
        e.body.extraCachedContent = cachedMessage.content
      }
      return { stepId, toolCalls: normalizedToolCalls }
    }

    return {}
  }

  /**
   * 准备聊天请求的主体
   * @param {object} body
   * @returns {object}
   */
  async _prepareChatBody(body) {
    const { messages = [], settings = {} } = body || {}
    const processedMessages = await this._processMessages(messages)
    const { base = {}, chatParams = {}, toolCallSettings = {}, extraSettings = {} } = settings || {}

    const { tools, mode } = toolCallSettings
    const adapterType = this.constructor.getAdapterMetadata()?.type || this.provider
    const gemini = extraSettings[adapterType] || extraSettings['gemini'] || extraSettings['geminiOauth'] || extraSettings['agentPlatform'] || extraSettings || {}
    const internalTools = gemini.internalTools || extraSettings.internalTools || {}
    const { safetySettings = {} } = gemini
    const isImageModel = base.model.toLowerCase().includes('image')
    const parsedTools = []
    if (mode !== 'NONE' && !isImageModel) {
      const validTools = this._getFormattedTools(tools, toolCallSettings.passthrough)
      if (validTools.length > 0) {
        parsedTools.push({
          functionDeclarations: validTools,
        })
      }
    }

    const internalToolsMap = {
      code_execution: 'codeExecution',
      google_search: 'googleSearch',
      url_context: 'urlContext',
      web_search: 'googleSearch',
    }

    const isEnabled = (val) => {
      if (val === true || val === 'true' || val === 1) {return true}
      if (typeof val === 'object' && val !== null && (val.enable === true || val.enabled === true)) {return true}
      return false
    }

    Object.keys(internalTools).forEach((key) => {
      if (isEnabled(internalTools[key]) && internalToolsMap[key]) {
        const mappedName = internalToolsMap[key]
        if (!parsedTools.some((t) => t[mappedName])) {
          parsedTools.push({
            [mappedName]: {},
          })
        }
      }
    })

    const parsedSafeSettings = []

    if (safetySettings) {
      Object.keys(safetySettings).forEach((key) => {
        parsedSafeSettings.push({
          category: key,
          threshold: safetySettings[key],
        })
      })
    }

    const allowedFunctionNames = mode === 'ANY' ? tools : undefined

    const toolConfig = allowedFunctionNames
      ? {
          functionCallingConfig: {
            mode,
            allowedFunctionNames,
          },
        }
      : undefined

    const { temperature, reasoning_effort } = chatParams || {}

    const processedChatParams = {
      temperature,
    }

    const reasoningEffortTables = {
      flash: new Map([
        [-1, undefined],
        [0, undefined],
        [1, 0],           // 关闭
        [2, 1024],        // low
        [3, 1024],        // medium（flash medium 用 low budget）
        [4, 12800],       // high
        [5, 24576],       // max（flash 最大 budget）
      ]),
      level: new Map([    // Gemini 3.x
        [-1, undefined],
        [0, undefined],
        [1, 'MINIMAL'],
        [2, 'LOW'],
        [3, 'MEDIUM'],
        [4, 'HIGH'],
        [5, 'HIGH'],      // Gemini 3.x 无 xhigh/max，最高即 HIGH
      ]),
      pro: new Map([
        [-1, undefined],
        [0, undefined],
        [2, 8192],        // low
        [3, 16384],       // medium
        [4, 32768],       // high
        [5, 32768],       // max（pro 保持最大 budget）
      ]),
    }

    const modelLower = base.model.toLowerCase()
    const isNonGemini = !modelLower.includes('gemini')
    const isOldGemini =
      (modelLower.includes('2.0') && !modelLower.includes('thinking')) ||
      modelLower.includes('1.5') ||
      modelLower.includes('1.0')

    const isReasoningAvaliable = !isNonGemini && !isOldGemini && !isImageModel

    let rangeType = null
    if (isReasoningAvaliable) {
      if (modelLower.includes('2.5-pro')) {
        rangeType = 'pro'
      } else if (
        modelLower.includes('2.5-flash') ||
        modelLower.includes('2.5-flash-light')
      ) {
        rangeType = 'flash'
      } else {
        rangeType = 'level'
      }
    }

    if (isReasoningAvaliable) {
      const budgetTable = reasoningEffortTables[rangeType]

      const ThinkingConfig =
        reasoning_effort === 0
          ? undefined
          : (rangeType !== 'level'
            ? {
                includeThoughts: true,
                thinkingBudget: budgetTable.get(reasoning_effort),
              }
            : {
                includeThoughts: true,
                thinkingLevel: budgetTable.get(reasoning_effort),
              })

      processedChatParams.thinkingConfig = ThinkingConfig
    }

    if (isImageModel) {
      processedChatParams.responseModalities = ['Text', 'Image']
    }

    const preparedBody = {
      ...processedChatParams,
      messages: processedMessages,
      model: base.model,
      safetySettings: parsedSafeSettings,
      stream: base.stream,
      toolConfig,
      tools: parsedTools.length > 0 ? parsedTools : undefined,
    }

    return this.cleanUndefined(preparedBody)
  }
}
