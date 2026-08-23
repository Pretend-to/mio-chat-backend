import { MioFunction } from '../../../function.js'
import { visionService } from '../../../chat/vision/VisionService.js'

export default class vision extends MioFunction {
  constructor() {
    super({
      adminOnly: false,
      description:
        'Analyze, inspect, or extract information from an image using system-configured multimodal LLM vision capabilities.',
      name: 'vision',
      parameters: {
        properties: {
          image: {
            description: 'The URL, Base64 Data URI, or local absolute file path of the image to analyze.',
            type: 'string',
          },
          prompt: {
            default: '请详细描述这幅图片的内容',
            description: 'What you want the AI to analyze, extract, or answer about the image.',
            type: 'string',
          },
          model: {
            default: '',
            description: 'Optional: Manually specify a vision model name (e.g. "gemini-2.5-flash", "gpt-4o"). Overrides default auto selection.',
            type: 'string',
          },
          provider: {
            default: '',
            description: 'Optional: Manually specify a provider instance ID. Overrides default auto selection.',
            type: 'string',
          },
        },
        required: ['image'],
        type: 'object',
      },
    })
    this.func = this.analyze
  }

  getDescription() {
    const config = visionService?.config || {}
    let modeText = '自动扫描 (Auto)'
    let currentTarget = ''

    if (config.mode === 'custom' && config.provider && config.model) {
      modeText = '指定模型 (Custom)'
      currentTarget = `${config.provider} / ${config.model}`
    } else {
      const llmService = global.middleware?.llm
      if (llmService?.llms) {
        const models = []
        for (const [instName, adapter] of Object.entries(llmService.llms)) {
          if (adapter.supportsVision) {
            models.push(instName)
          }
        }
        if (models.length > 0) {
          currentTarget = `已检测到 ${models.length} 个多模态视觉适配器: ${models.slice(0, 3).join(', ')}`
        }
      }
    }

    const targetInfo = currentTarget ? ` (当前生效通道: ${currentTarget})` : ''
    return `多模态视觉识图与图像内容理解分析工具。用于分析图片内容、识别物体/文字/表格、图表解读或多模态问答。支持传入图片 URL、Base64 或本地文件路径。\n\n当前视觉识别模式：${modeText}${targetInfo}。`
  }

  async analyze(e) {
    const { image, prompt, provider, model } = e.params || {}
    try {
      const result = await visionService.analyze({ image, prompt, provider, model })
      return {
        description: result.description,
        model: result.model,
        provider: result.provider,
        durationMs: result.durationMs
      }
    } catch (error) {
      return { error: `[Vision Tool] 识图失败: ${error.message}` }
    }
  }
}
