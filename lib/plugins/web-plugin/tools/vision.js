import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import llmChatService from '../../../chat/llm/index.js'
import logger from '../../../../utils/logger.js'

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
        },
        required: ['image'],
      },
      adminOnly: true,
    })
    this.func = this.analyze
  }

  async analyze(e) {
    const { image, prompt = 'Describe this image in detail.' } = e.params
    const pluginConfig = this.getPluginConfig()
    const config = pluginConfig?.vision || { mode: 'auto' }

    try {
      let imageData = null
      let mimeType = 'image/jpeg'

      // 1. Prepare Image (Base64 or URL)
      if (image.startsWith('http')) {
        imageData = image
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

      // 2. Execution Mode
      if (config.mode === 'manual') {
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

    // Known vision models keywords (Priority: Gemini > GPT > Claude, based on pricing & capability in May 2026)
    const visionKeywords = [
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
    ]

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
    const { InternalEventFactory } = await import('../../../chat/llm/utils/InternalEventFactory.js')
    
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
        onContent: (content) => { resultText += content },
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
              google_search_retrieval: false
            },
            safetySettings: {}
          }
        }
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
