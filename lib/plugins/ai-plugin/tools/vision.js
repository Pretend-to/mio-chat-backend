import { MioFunction } from '../../../function.js'
import { visionService } from '../../../chat/vision/VisionService.js'
import logger from '../../../../utils/logger.js'

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
    const rawParams = e.params || {}
    const paramList = Array.isArray(rawParams) ? rawParams : [rawParams]
    const startTime = Date.now()

    logger.info(`[Vision Tool] 接收到识图调用 (共 ${paramList.length} 张图片任务)`)

    try {
      const tasks = paramList.map(async (p, idx) => {
        const { image, prompt, provider, model } = p || {}
        if (!image) {
          return {
            error: `任务 #${idx + 1} 缺少图片链接 (image)`
          }
        }
        const res = await visionService.analyze({ image, prompt, provider, model })
        return {
          image,
          description: res.description,
          model: res.modelUsed,
          provider: res.providerUsed,
          durationMs: res.durationMs
        }
      })

      const results = await Promise.all(tasks)
      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2)
      logger.info(`[Vision Tool] 识图任务全部完成! 耗时 ${totalDuration}s, 成功数: ${results.filter(r => !r.error).length}/${paramList.length}`)

      if (paramList.length === 1) {
        if (results[0].error) {
          return { error: `[Vision Tool] 识图失败: ${results[0].error}` }
        }
        return {
          description: results[0].description,
          model: results[0].model,
          provider: results[0].provider,
          durationMs: results[0].durationMs
        }
      }

      // 多图并发分析结果整合
      const combinedDescription = results
        .map((r, idx) => {
          if (r.error) return `### 图片 ${idx + 1}: 识别失败 (${r.error})`
          return `### 图片 ${idx + 1} (${r.image}):\n${r.description}`
        })
        .join('\n\n')

      return {
        success: true,
        totalImages: results.length,
        results,
        description: combinedDescription,
        durationMs: Date.now() - startTime
      }
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      logger.error(`[Vision Tool] 识图失败 (耗时 ${duration}s):`, error.message)
      return { error: `[Vision Tool] 识图失败: ${error.message}` }
    }
  }
}
