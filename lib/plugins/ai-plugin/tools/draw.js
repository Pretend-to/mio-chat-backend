import { MioFunction } from '../../../function.js'
import { imageService } from '../../../chat/image/ImageService.js'

export default class draw extends MioFunction {
  constructor() {
    super({
      adminOnly: false,
      description: 'Generate or edit images based on text prompts or reference images. Supports synchronous and asynchronous rendering.',
      name: 'draw',
      parameters: {
        properties: {
          prompt: {
            description: 'Text prompt describing the image you want to generate or instructions for editing.',
            type: 'string',
          },
          image: {
            description: 'Optional reference image (URL, Base64 Data URI, or local file path) for image-to-image (img2img) editing.',
            type: 'string',
          },
          async: {
            default: false,
            description: 'Whether to generate image asynchronously. If true, returns immediately with a taskId and data-task-id placeholder for AnyUI/Galgame templates to render instantly.',
            type: 'boolean',
          },
          size: {
            default: '1024x1024',
            description: 'Image size/aspect ratio ("square", "portrait", "landscape", or "1024x1024").',
            type: 'string',
          },
          adapterId: {
            default: '',
            description: 'Optional: Specific image adapter instance name (e.g. "Google-Gemini", "OpenAI-DallE", "SD-WebUI"). Leave empty to use system default.',
            type: 'string',
          },
          negativePrompt: {
            default: '',
            description: 'Optional negative prompt describing elements to avoid in the generated image.',
            type: 'string',
          },
          strength: {
            default: 0.7,
            description: 'Denoising strength / transformation degree for img2img (0.0 to 1.0).',
            type: 'number',
          }
        },
        required: ['prompt'],
        type: 'object',
      },
    })
    this.func = this.generateImage
  }

  getDescription() {
    const instances = []
    const seen = new Set()

    if (imageService?.instances) {
      for (const [key, adapter] of imageService.instances.entries()) {
        const name = adapter.instanceName || adapter.name || key
        if (!seen.has(name)) {
          seen.add(name)
          const isDefault = name === imageService.defaultInstanceId || adapter.isDefault
          const type = adapter.constructor?.getAdapterMetadata?.()?.type || adapter.name || ''
          const isTagStyle = type === 'tukuai-image' || type === 'sd-webui'
          const styleNote = isTagStyle
            ? 'SD/NovelAI 词组标签风格 (如: 1girl, solo, masterpiece, anime style)'
            : '自然语言详细描述或词组'
          instances.push(`- 「${name}」(${type})${isDefault ? ' [当前默认]' : ''}: 提示词格式建议为【${styleNote}】`)
        }
      }
    }

    const defaultAdapter = imageService?.defaultInstanceId
      ? imageService.instances?.get(imageService.defaultInstanceId)
      : (imageService?.instances?.size > 0 ? Array.from(imageService.instances.values())[0] : null)

    const defaultType = defaultAdapter?.constructor?.getAdapterMetadata?.()?.type || defaultAdapter?.name || ''
    const isDefaultTagStyle = defaultType === 'tukuai-image' || defaultType === 'sd-webui'

    const promptGuidance = isDefaultTagStyle
      ? '当前默认生图通道为 SD/NovelAI 类模型，提示词 (prompt) 请务必优先使用以英文逗号分隔的 Tag 标签/词组 (例如: "1girl, solo, masterpiece, anime aesthetic, high resolution")。'
      : '当前默认生图通道支持使用中/英文自然语言详细描述画面（亦可配合风格词组）。'

    const adapterListText = instances.length > 0
      ? `\n\n系统当前已加载并启用的生图通道：\n${instances.join('\n')}`
      : '\n\n当前使用环境变量配置的默认生图通道。'

    return `AI 图像生成与图像编辑工具。支持文生图以及通过 image 参数（传入图片 URL/Base64）进行图生图重绘与修改。\n支持 AnyUI / Galgame 模板异步生图（传入 async: true 可立即返回 taskId 与 data-task-id 占位，前端自动通过 WebSocket/轮询实时回填渲染完成的图片）。\n\n【提示词规范】：${promptGuidance}${adapterListText}`
  }

  async generateImage(e) {
    const { prompt, image, size = '1024x1024', adapterId, negativePrompt, strength, async: isAsync = false } = e.params || {}
    try {
      if (isAsync) {
        const task = await imageService.createTask(
          { prompt, image, size, negativePrompt, strength },
          adapterId || null
        )
        return {
          message: '异步生图任务已提交',
          taskId: task.taskId,
          status: 'pending',
          htmlPlaceholder: `<div class="async-image-placeholder" data-task-id="${task.taskId}"><span class="loading-spin">🎨</span> 正在异步渲染画面...</div>`
        }
      }

      const results = await imageService.generate(
        { prompt, image, size, negativePrompt, strength },
        adapterId || null
      )

      if (!results || results.length === 0) {
        return { error: '[Draw Tool] 未能生成有效的图片' }
      }

      const images = results.map(item => ({
        url: item.url,
        revisedPrompt: item.revisedPrompt
      }))

      const mdImages = images
        .filter(img => img.url)
        .map(img => `![${prompt}](${img.url})`)
        .join('\n\n')

      return {
        message: '生图成功',
        markdown: mdImages,
        images,
        primaryUrl: images[0]?.url
      }
    } catch (error) {
      return { error: `[Draw Tool] 生图失败: ${error.message}` }
    }
  }
}
