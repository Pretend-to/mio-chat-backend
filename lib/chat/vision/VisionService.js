import fs from 'fs'
import path from 'path'
import modelRegistryService from '../llm/services/ModelRegistryService.js'
import { InternalEventFactory } from '../llm/utils/InternalEventFactory.js'
import logger from '../../../utils/logger.js'

/**
 * VisionService - 视觉识图与多模态路由调度中心
 * 直接复用已配置的 LLM 适配器，基于 LiteLLM 规格表精准过滤视觉模型
 */
export class VisionService {
  constructor() {
    this.config = {
      mode: 'auto', // 'auto' | 'custom'
      provider: '',
      model: '',
      defaultPrompt: '请详细描述这幅图片中的内容，提取主要主体、场景特征和文字信息。'
    }
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) return
    await this.loadConfig()
    this.initialized = true
  }

  async loadConfig() {
    try {
      const { default: pluginConfigService } = await import('../../database/services/PluginConfigService.js')
      await pluginConfigService.initialize()
      const record = await pluginConfigService.findByName('vision_settings')
      if (record && record.configData) {
        const saved = typeof record.configData === 'object' ? record.configData : JSON.parse(record.configData)
        if (saved && typeof saved === 'object') {
          this.config = { ...this.config, ...saved }
        }
      }
    } catch (err) {
      console.warn('[VisionService] Warning loading vision config:', err.message)
    }
  }

  async saveConfig(newConfig = {}) {
    try {
      this.config = { ...this.config, ...newConfig }
      const { default: pluginConfigService } = await import('../../database/services/PluginConfigService.js')
      await pluginConfigService.initialize()
      const exists = await pluginConfigService.exists('vision_settings')
      if (exists) {
        await pluginConfigService.update('vision_settings', this.config)
      } else {
        await pluginConfigService.create('vision_settings', this.config)
      }
      return this.config
    } catch (err) {
      throw new Error(`保存识图配置失败: ${err.message}`)
    }
  }

  /**
   * 扫描当前系统中所有已启用的、基于 LiteLLM 验证具备 Vision 能力的 LLM 渠道与模型
   */
  async getAvailableVisionModels() {
    const list = []
    const seen = new Set()

    try {
      // 1. 从内存中活跃的 LLM 实例中读取
      const llmService = global.middleware?.llm
      if (llmService?.llms) {
        for (const [instanceId, adapter] of Object.entries(llmService.llms)) {
          const metadata = llmService.instanceMetadata?.[instanceId]
          const displayName = metadata?.displayName || instanceId
          const modelsList = adapter.models || []

          for (const item of modelsList) {
            let modelIds = []
            if (item && Array.isArray(item.models)) {
              modelIds = item.models
            } else if (typeof item === 'string') {
              modelIds = [item]
            } else if (item && (item.id || item.name)) {
              modelIds = [item.id || item.name]
            }

            for (const modelId of modelIds) {
              if (!modelId || typeof modelId !== 'string') continue
              if (modelRegistryService.supportsVision(modelId)) {
                const key = `${instanceId}:::${modelId}`
                if (!seen.has(key)) {
                  seen.add(key)
                  list.push({
                    provider: instanceId,
                    providerName: displayName,
                    model: modelId,
                    label: `${displayName} - ${modelId}`
                  })
                }
              }
            }
          }
        }
      }

      // 2. 从数据库配置中补充扫描 (防止某些实例尚未触发连接或模型列表未加载)
      try {
        const { getFullConfig } = await import('../../server/http/services/configService.js')
        const fullConfig = await getFullConfig()
        const llmAdapters = fullConfig.llm_adapters || {}

        for (const [adapterType, instances] of Object.entries(llmAdapters)) {
          if (!Array.isArray(instances)) continue
          for (let i = 0; i < instances.length; i++) {
            const inst = instances[i]
            if (inst.enable === false) continue
            const instName = inst.name || `${adapterType}-${i + 1}`

            let candidateModels = []
            if (Array.isArray(inst.models)) {
              candidateModels = inst.models
            } else if (inst.default_model) {
              candidateModels = [inst.default_model]
            }

            for (const item of candidateModels) {
              let modelIds = []
              if (typeof item === 'string') {
                modelIds = [item]
              } else if (item && Array.isArray(item.models)) {
                modelIds = item.models
              } else if (item && (item.id || item.name)) {
                modelIds = [item.id || item.name]
              }

              for (const modelId of modelIds) {
                if (!modelId || typeof modelId !== 'string') continue
                if (modelRegistryService.supportsVision(modelId)) {
                  const key = `${instName}:::${modelId}`
                  if (!seen.has(key)) {
                    seen.add(key)
                    list.push({
                      provider: instName,
                      providerName: instName,
                      model: modelId,
                      label: `${instName} - ${modelId}`
                    })
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('[VisionService] DB config scan warning:', e.message)
      }
    } catch (err) {
      console.warn('[VisionService] Error scanning vision models:', err.message)
    }

    return list
  }

  /**
   * 核心分析接口
   */
  async analyze(options = {}) {
    if (!this.initialized) {
      await this.initialize()
    }

    const {
      image,
      prompt = this.config.defaultPrompt || '请详细描述这幅图片中的内容，提取主要主体、场景特征和文字信息。',
      provider: overrideProvider,
      model: overrideModel
    } = options

    if (!image) {
      throw new Error('[VisionService] 必须提供图片链接 (URL) 或文件路径')
    }

    const startTime = Date.now()
    const { imageData } = await this._prepareImageData(image)

    // 确定目标 Provider 和 Model
    let targetProvider = overrideProvider
    let targetModel = overrideModel

    if (!targetProvider || !targetModel) {
      if (this.config.mode === 'custom' && this.config.provider && this.config.model) {
        targetProvider = this.config.provider
        targetModel = this.config.model
      } else {
        const available = await this.getAvailableVisionModels()
        if (available.length > 0) {
          targetProvider = available[0].provider
          targetModel = available[0].model
        }
      }
    }

    if (!targetProvider || !targetModel) {
      throw new Error('[VisionService] 当前系统中未检测到可用的视觉大模型，请在「LLM 适配器」中配置并启用支持 Vision 的模型（如 Gemini、GPT-4o、Qwen-VL 等）')
    }

    // 定位 Adapter 实例
    const llmService = global.middleware?.llm
    let adapter = null

    if (llmService?.llms) {
      if (llmService.llms[targetProvider]) {
        adapter = llmService.llms[targetProvider]
      } else {
        for (const [id, inst] of Object.entries(llmService.llms)) {
          const meta = llmService.instanceMetadata?.[id]
          if (meta?.displayName === targetProvider || id === targetProvider) {
            adapter = inst
            break
          }
        }
      }
    }

    if (!adapter) {
      throw new Error(`[VisionService] 未能定位到已加载的适配器实例: "${targetProvider}"`)
    }

    logger.info(`[VisionService] 调度视觉识别: provider="${targetProvider}", model="${targetModel}", prompt="${prompt?.slice(0, 60)}..."`)

    // 执行 LLM 多模态聊天请求
    let accumulatedContent = ''
    await new Promise((resolve, reject) => {
      let isSettled = false

      const e = InternalEventFactory.createSimpleEvent({
        model: targetModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } }
            ]
          }
        ],
        requestId: `vision-${Date.now()}`,
        onContent: (content) => {
          accumulatedContent += content
        },
        onComplete: () => {
          if (!isSettled) {
            isSettled = true
            resolve(accumulatedContent)
          }
        },
        stream: true
      })

      // 补齐权限与防崩保护
      e.user = { id: 'vision-service', isAdmin: true }
      e.error = (err) => {
        if (!isSettled) {
          isSettled = true
          reject(err)
        }
      }

      adapter.handleChatRequest(e)
        .then(() => {
          if (!isSettled) {
            isSettled = true
            resolve(accumulatedContent)
          }
        })
        .catch((err) => {
          if (!isSettled) {
            isSettled = true
            reject(err)
          }
        })
    })

    const durationMs = Date.now() - startTime
    logger.info(`[VisionService] 识别完成 (耗时 ${(durationMs / 1000).toFixed(2)}s), 输出长度: ${accumulatedContent.length}`)

    return {
      description: accumulatedContent,
      modelUsed: targetModel,
      providerUsed: targetProvider,
      durationMs
    }
  }

  async _prepareImageData(image) {
    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,/)
      return { imageData: image, mimeType: match ? match[1] : 'image/jpeg' }
    }

    let mimeType = 'image/jpeg'
    let buffer

    if (image.startsWith('http://') || image.startsWith('https://')) {
      const response = await fetch(image, { signal: AbortSignal.timeout(15000) })
      if (!response.ok) {
        throw new Error(`下载网络图片失败 (${response.status}): ${image}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.startsWith('image/')) {
        mimeType = contentType
      } else {
        const ext = path.extname(new URL(image).pathname).toLowerCase()
        mimeType = this._getMimeType(ext)
      }
    } else {
      const absolutePath = path.isAbsolute(image) ? image : path.join(process.cwd(), image)
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`本地图片文件不存在: ${image}`)
      }
      buffer = await fs.promises.readFile(absolutePath)
      const ext = path.extname(absolutePath).toLowerCase()
      mimeType = this._getMimeType(ext)
    }

    const imageData = `data:${mimeType};base64,${buffer.toString('base64')}`
    return { imageData, mimeType }
  }

  _getMimeType(ext) {
    const map = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp'
    }
    return map[ext] || 'image/jpeg'
  }
}

export const visionService = new VisionService()
