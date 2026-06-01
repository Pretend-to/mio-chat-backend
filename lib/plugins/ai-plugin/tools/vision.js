import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import llmChatService from '../../../chat/llm/index.js'

export default class vision extends MioFunction {
  constructor() {
    super({
      name: 'vision',
      description:
        'Analyze an image using a multimodal LLM. You can provide an image URL or a local file path. Optionally, specify a prompt to guide the analysis (e.g., "Extract all text from this receipt").',
      parameters: {
        type: 'object',
        properties: {
          image: {
            type: 'string',
            description:
              'The URL or local absolute path of the image to analyze.',
          },
          prompt: {
            type: 'string',
            description:
              'What you want the AI to do with the image. Defaults to a general description.',
            default: 'Describe this image in detail.',
          },
          provider: {
            type: 'string',
            description:
              'Optional: Manually specify a provider instance ID (e.g. "openai", "gemini", "mimo", "doubao"). Overrides plugin config and auto-search. Leave empty for auto.',
            default: '',
          },
          model: {
            type: 'string',
            description:
              'Optional: Manually specify a model name (e.g. "mimo-v2.5", "gpt-5.4-mini", "gemini-2.5-flash"). Overrides plugin config and auto-search. Leave empty for auto.',
            default: '',
          },
        },
        required: ['image'],
      },
      adminOnly: true,
    })
    this.func = this.analyze
  }

  async analyze(e) {
    const {
      image,
      prompt = 'Describe this image in detail.',
      provider: paramProvider,
      model: paramModel,
    } = e.params
    const pluginConfig = this.getPluginConfig()
    const config = pluginConfig?.vision || { mode: 'auto' }

    // Resolve provider & model: param > plugin config > auto
    const resolvedProvider = paramProvider || config.provider || ''
    const resolvedModel = paramModel || config.model || ''

    try {
      let imageData = null
      let mimeType = 'image/jpeg'

      // 1. Prepare Image (Always Base64 for maximum compatibility)
      if (image.startsWith('http')) {
        logger.info(`[Vision] Downloading remote image: ${image}`)
        const response = await fetch(image, {
          signal: AbortSignal.timeout(10000),
        })
        if (!response.ok) {
          throw new Error(
            `Failed to fetch image: ${response.statusText} (${response.status})`,
          )
        }
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Use Content-Type from header, fallback to extension
        let contentType = response.headers.get('content-type')
        if (!contentType || contentType === 'application/octet-stream') {
          const ext = path.extname(new URL(image).pathname).toLowerCase()
          mimeType = this._getMimeType(ext)
        } else {
          mimeType = contentType
        }

        imageData = `data:${mimeType};base64,${buffer.toString('base64')}`
      } else {
        // Assume local path
        const absolutePath = path.isAbsolute(image)
          ? image
          : path.join(process.cwd(), image)
        if (!fs.existsSync(absolutePath)) {
          return { error: `Local image file not found: ${image}` }
        }
        const buffer = fs.readFileSync(absolutePath)
        const ext = path.extname(absolutePath).toLowerCase()
        mimeType = this._getMimeType(ext)
        imageData = `data:${mimeType};base64,${buffer.toString('base64')}`
      }

      // 2. Check if current model is vision-capable (Optimization)
      const currentModel = e.body?.settings?.base?.model
      if (!resolvedProvider && !resolvedModel && this._isVisionModel(currentModel)) {
        logger.info(
          `[Vision] Current model "${currentModel}" is vision-capable. Injecting image directly as post-message.`,
        )
        return {
          result:
            'I have prepared the image for you. It is attached in the following user message.',
          _postMessages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: `[Vision Tool Input] ${prompt}` },
                { type: 'image_url', image_url: { url: imageData } },
              ],
            },
          ],
        }
      }

      // 3. Execution Mode: resolvedProvider/Model > manual > auto
      if (resolvedProvider || resolvedModel) {
        return await this._analyzeWithSpecified(
          imageData, prompt, resolvedProvider, resolvedModel,
        )
      } else if (config.mode === 'manual') {
        return await this._analyzeManual(imageData, prompt, config.manual)
      } else {
        return await this._analyzeAuto(imageData, prompt)
      }
    } catch (err) {
      logger.error('[Vision] Analysis failed:', err)
      return { error: `Vision analysis failed: ${err.message}` }
    }
  }

  /**
   * Specified mode: Use a specific provider instance and/or model
   * Priority: param provider > param model > match by provider name
   */
  async _analyzeWithSpecified(imageData, prompt, provider, model) {
    const allLlms = llmChatService.llms
    let targetInstance = null
    let targetModel = null
    let targetInstanceId = null

    if (provider) {
      const providerLower = provider.toLowerCase()
      const exactMatch = Object.entries(allLlms).find(
        ([id]) => id.toLowerCase() === providerLower,
      )
      if (exactMatch) {
        targetInstanceId = exactMatch[0]
        targetInstance = exactMatch[1]
      } else {
        const partialMatch = Object.entries(allLlms).find(([id]) => {
          const displayName =
            llmChatService.instanceMetadata[id]?.displayName || id
          return (
            id.toLowerCase().includes(providerLower) ||
            displayName.toLowerCase().includes(providerLower)
          )
        })
        if (partialMatch) {
          targetInstanceId = partialMatch[0]
          targetInstance = partialMatch[1]
        }
      }

      if (!targetInstance) {
        return {
          error: `Specified provider "${provider}" not found among active providers.`,
          hint: `Available: ${Object.keys(allLlms).join(', ')}`,
        }
      }
    }

    // If model is specified, find it within the matched instance (or all instances)
    if (model) {
      const modelLower = model.toLowerCase()
      const searchInstances = targetInstance
        ? [[targetInstanceId, targetInstance]]
        : Object.entries(allLlms)

      for (const [id, instance] of searchInstances) {
        const groups = instance.models || []
        const allModelIds = groups.flatMap((g) => g.models || [])
        const match = allModelIds.find((m) =>
          m.toLowerCase().includes(modelLower),
        )
        if (match) {
          targetInstanceId = id
          targetInstance = instance
          targetModel = match
          break
        }
      }

      if (!targetModel) {
        return {
          error: `Model "${model}" not found${provider ? ` in provider "${provider}"` : ''} among active providers.`,
          hint: provider
            ? `Available models in ${targetInstanceId || provider}: ${(targetInstance?.models || []).flatMap((g) => g.models || []).join(', ')}`
            : 'Please check the model name or omit model to auto-pick.',
        }
      }
    }

    // If only provider was specified (no model), auto-pick a vision model from it
    if (!targetModel && targetInstance) {
      const visionKeywords = this._getVisionKeywords()
      const groups = targetInstance.models || []
      const allModelIds = groups.flatMap((g) => g.models || [])
      for (const keyword of visionKeywords) {
        const match = allModelIds.find((m) =>
          m.toLowerCase().includes(keyword),
        )
        if (match) {
          targetModel = match
          break
        }
      }
    }

    if (!targetInstance || !targetModel) {
      return {
        error: 'Could not resolve a vision-capable model with the given specification.',
      }
    }

    const displayName =
      llmChatService.instanceMetadata[targetInstanceId]?.displayName ||
      targetInstanceId
    logger.info(
      `[Vision] Using specified: ${targetModel} from ${displayName}`,
    )

    const { InternalEventFactory } =
      await import('../../../chat/llm/utils/InternalEventFactory.js')

    return new Promise((resolve) => {
      let resultText = ''
      const requestId = `vision-specified-${Date.now()}`

      const event = InternalEventFactory.createSimpleEvent({
        model: targetModel,
        requestId,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } },
            ],
          },
        ],
        onContent: (content) => {
          resultText += content
        },
        onComplete: () => {
          resolve({
            success: true,
            provider: 'specified',
            instance: displayName,
            model: targetModel,
            result: resultText || 'No description returned.',
          })
        },
        extraSettings: {
          gemini: {
            imageGeneration: { enabled: false },
            internalTools: {
              code_execution: false,
              google_search_retrieval: false,
            },
            safetySettings: {},
          },
        },
      })

      event.error = (err) => {
        logger.error(`[Vision-Specified] Adapter execution failed:`, err)
        resolve({ error: `Adapter execution failed: ${err.message}` })
      }

      targetInstance.handleChatRequest(event)
    })
  }

  _getVisionKeywords() {
    return [
      // 1. Gemini (Most cost-effective, native video/image support)
      'gemini-3-flash-preview',
      'gemini-3.1-pro-preview',
      'gemini-2.5-flash',
      'gemini-2.5-pro',

      // 2. OpenAI (Industry standard, highly reliable)
      'gpt-5.4-mini',
      'gpt-5.3-chat-latest',
      'gpt-5-chat-latest',

      // 3. Anthropic (Deep reasoning, document experts)
      'claude-4.6-sonnet',
      'claude-4.5-haiku',
      'claude-3-5-sonnet',
      'claude-3-opus',

      // 4. Mimo
      'mimo-v2.5',
    ]
  }

  /**
   * Check if a model name refers to a vision-capable model
   */
  _isVisionModel(modelName) {
    if (!modelName) return false
    const name = modelName.toLowerCase()
    const visionKeywords = [
      'gpt-4',
      'gpt-5',
      'gemini',
      'claude-3',
      'claude-4',
      'doubao',
      'mimo',
    ]
    return visionKeywords.some((kw) => name.includes(kw))
  }

  /**
   * Manual mode: Use standard OpenAI protocol to call external API
   */
  async _analyzeManual(imageData, prompt, settings) {
    const { baseUrl, apiKey, model } = settings
    if (!apiKey) return { error: 'Manual vision mode requires an apiKey.' }

    logger.info(`[Vision] Using manual mode: ${model} at ${baseUrl}`)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`External API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    return {
      success: true,
      provider: 'manual',
      model: model,
      result: data.choices?.[0]?.message?.content || 'No description returned.',
    }
  }

  /**
   * Auto mode: Find a vision-capable model in the current system
   */
  async _analyzeAuto(imageData, prompt) {
    const allLlms = llmChatService.llms
    let targetInstance = null
    let targetModel = null
    let targetInstanceId = null

    // Use shared vision keywords list (includes mimo-v2.5, Gemini, GPT, Claude)
    const visionKeywords = this._getVisionKeywords()

    // 1. Search for a matching instance and model
    // We iterate keywords first to respect the priority order
    for (const keyword of visionKeywords) {
      for (const [id, instance] of Object.entries(allLlms)) {
        // Models are grouped by owner: [{ owner: '...', models: ['gpt-4o', ...] }]
        const groups = instance.models || []
        const allModelIds = groups.flatMap((g) => g.models || [])
        const match = allModelIds.find((m) => m.toLowerCase().includes(keyword))

        if (match) {
          targetInstance = instance
          targetModel = match
          targetInstanceId = id
          break
        }
      }
      if (targetInstance) break
    }

    if (!targetInstance) {
      return {
        error:
          'No vision-capable model found in active providers (Gemini/OpenAI/Claude). Please add one or use manual mode.',
        hint: 'Expected models: gemini-3-flash, gpt-5.4-mini, claude-4.6, etc.',
      }
    }

    const displayName =
      llmChatService.instanceMetadata[targetInstanceId]?.displayName ||
      targetInstanceId
    logger.info(
      `[Vision] Auto-selected model: ${targetModel} from ${displayName}`,
    )

    // 3. Call the adapter directly (internal bridge)
    const { InternalEventFactory } =
      await import('../../../chat/llm/utils/InternalEventFactory.js')

    return new Promise((resolve) => {
      let resultText = ''
      const requestId = `vision-bridge-${Date.now()}`

      const event = InternalEventFactory.createSimpleEvent({
        model: targetModel,
        requestId,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } },
            ],
          },
        ],
        onContent: (content) => {
          resultText += content
        },
        onComplete: () => {
          resolve({
            success: true,
            provider: 'auto',
            instance: displayName,
            model: targetModel,
            result: resultText || 'No description returned.',
          })
        },
        extraSettings: {
          gemini: {
            imageGeneration: { enabled: false },
            internalTools: {
              code_execution: false,
              google_search_retrieval: false,
            },
            safetySettings: {},
          },
        },
      })

      // 覆盖默认的 error 处理以适应 Promise resolve
      event.error = (err) => {
        logger.error(`[Vision-Bridge] Adapter execution failed:`, err)
        resolve({ error: `Adapter execution failed: ${err.message}` })
      }

      targetInstance.handleChatRequest(event)
    })
  }

  _getMimeType(ext) {
    const mimeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    }
    return mimeMap[ext] || 'image/jpeg'
  }
}
