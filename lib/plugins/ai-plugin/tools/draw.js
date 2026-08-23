import { MioFunction } from '../../../function.js'
import { imageService } from '../../../chat/image/ImageService.js'
import logger from '../../../../utils/logger.js'

/**
 * 产生与 AnyUI 完全一致的梦幻柔和流体与毛玻璃微标加载骨架卡片
 */
function getDrawSkeletonHtml() {
  return `
<div class="comic" style="
  width: 100%;
  max-width: 480px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(244, 114, 182, 0.12), 0 1px 3px rgba(0,0,0,0.05);
  border: 1px solid rgba(244, 114, 182, 0.25);
  background: #ffffff;
">
  <div class="ldr-box" style="
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: #fdf4ff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  ">
    <div class="balanced-liquid-container" style="
      position: absolute;
      inset: -30px;
      filter: blur(48px);
      opacity: 0.82;
      pointer-events: none;
      z-index: 1;
    ">
      <div class="soft-blob-1"></div>
      <div class="soft-blob-2"></div>
      <div class="soft-blob-center"></div>
      <div class="soft-blob-4"></div>
    </div>
    <div class="soft-overlay"></div>
    <div class="glass-spinner">
      <div class="ring"></div>
    </div>
  </div>
</div>
<style>
  .soft-blob-1 {
    position: absolute;
    top: -10%;
    left: -10%;
    width: 110%;
    height: 110%;
    border-radius: 50% 50% 60% 40% / 40% 60% 50% 50%;
    background: radial-gradient(circle at 45% 45%, #f472b6 0%, #fbcfe8 55%, rgba(251, 207, 232, 0.2) 80%);
    animation: flow-smooth-1 4.2s infinite ease-in-out alternate;
  }
  .soft-blob-2 {
    position: absolute;
    bottom: -15%;
    right: -15%;
    width: 115%;
    height: 115%;
    border-radius: 60% 40% 50% 50% / 50% 50% 60% 40%;
    background: radial-gradient(circle at 55% 55%, #38bdf8 0%, #bae6fd 55%, rgba(186, 230, 253, 0.2) 80%);
    animation: flow-smooth-2 3.8s infinite ease-in-out alternate;
  }
  .soft-blob-center {
    position: absolute;
    top: 5%;
    left: 10%;
    width: 90%;
    height: 90%;
    border-radius: 45% 55% 45% 55% / 55% 45% 55% 45%;
    background: radial-gradient(circle at center, #c084fc 0%, #e9d5ff 50%, rgba(233, 213, 255, 0.2) 80%);
    animation: flow-smooth-center 4.8s infinite ease-in-out alternate;
  }
  .soft-blob-4 {
    position: absolute;
    bottom: -10%;
    left: -10%;
    width: 105%;
    height: 105%;
    border-radius: 40% 60% 55% 45% / 50% 45% 55% 50%;
    background: radial-gradient(circle at 50% 50%, #fda4af 0%, #fecdd3 55%, rgba(254, 205, 211, 0.2) 80%);
    animation: flow-smooth-4 3.5s infinite ease-in-out alternate;
  }
  @keyframes flow-smooth-1 {
    0% { transform: translate(0, 0) scale(1) rotate(0deg); }
    50% { transform: translate(20%, 15%) scale(1.18) rotate(35deg); }
    100% { transform: translate(-10%, 10%) scale(0.92) rotate(-25deg); }
  }
  @keyframes flow-smooth-2 {
    0% { transform: translate(0, 0) scale(1) rotate(0deg); }
    50% { transform: translate(-22%, -18%) scale(1.2) rotate(-40deg); }
    100% { transform: translate(12%, -10%) scale(0.95) rotate(30deg); }
  }
  @keyframes flow-smooth-center {
    0% { transform: scale(0.95) translate(0, 0) rotate(0deg); }
    50% { transform: scale(1.22) translate(-10%, 12%) rotate(45deg); }
    100% { transform: scale(0.9) translate(15%, -10%) rotate(-35deg); }
  }
  @keyframes flow-smooth-4 {
    0% { transform: translate(0, 0) scale(1.05) rotate(0deg); }
    50% { transform: translate(25%, -15%) scale(0.9) rotate(-50deg); }
    100% { transform: translate(-12%, 18%) scale(1.15) rotate(25deg); }
  }
  .soft-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%);
    box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.85), inset 0 0 10px rgba(244, 114, 182, 0.1);
    pointer-events: none;
    z-index: 2;
  }
  .glass-spinner {
    position: absolute;
    z-index: 4;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.95);
    box-shadow: 0 6px 20px rgba(244, 114, 182, 0.18), 0 2px 6px rgba(0,0,0,0.03);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.35s ease, transform 0.35s ease;
    pointer-events: none;
  }
  .glass-spinner .ring {
    width: 20px;
    height: 20px;
    border: 2.5px solid rgba(244, 114, 182, 0.2);
    border-top-color: #ec4899;
    border-right-color: #38bdf8;
    border-radius: 50%;
    animation: g-spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  }
  @keyframes g-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
`
}

export default class draw extends MioFunction {
  constructor() {
    super({
      adminOnly: false,
      description: 'Generate or edit images based on text prompts or reference images. Supports synchronous streaming skeleton placeholders and instant rendering.',
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

    return `AI 图像生成与图像编辑工具。支持文生图以及通过 image 参数（传入图片 URL/Base64）进行图生图重绘与修改。\n内置 AnyUI 同款梦幻流体与毛玻璃微光骨架屏，调用即刻原地呈现视觉占位，画好后自动平滑原地替换为真实高清大图。\n【重要交互规范】：图片已自动由前端就地高清渲染，请【绝对不要】在回复中重复输出 markdown 图片语法（如 ![]()），直接针对生成的画面进行描述、互动或推进对话即可。\n\n【提示词规范】：${promptGuidance}${adapterListText}`
  }

  async generateImage(e) {
    const { prompt, image, size = '1024x1024', adapterId, negativePrompt, strength } = e.params || {}
    const startTime = Date.now()

    logger.info(`[Draw Tool] 接收到生图调用: prompt="${prompt?.slice(0, 100)}...", size="${size}", adapter="${adapterId || '默认'}"${image ? ', 包含参考图' : ''}`)

    // 阶段一：第 0.1 秒立即向前端推送 AnyUI 同款流体与毛玻璃微标骨架屏
    this.setOuterRender(e, [{
      type: 'html',
      html: getDrawSkeletonHtml()
    }])

    // 阶段二：后台同步调用生图服务 (期间前端一直生动呈现骨架屏动画)
    try {
      logger.info(`[Draw Tool] 正在同步请求生图服务...`)
      const results = await imageService.generate(
        { prompt, image, size, negativePrompt, strength },
        adapterId || null
      )

      const validImages = results
        .map(item => ({
          url: item.url,
          revisedPrompt: item.revisedPrompt
        }))
        .filter(img => img && img.url)

      if (!validImages || validImages.length === 0) {
        logger.warn(`[Draw Tool] 生图未成功获取到有效的图片地址`)
        this.setOuterRender(e, [{
          type: 'alert',
          alertType: 'error',
          title: '生图未获取到有效图片',
          description: '生图通道返回了空结果，请检查通道状态'
        }])
        return { error: '[Draw Tool] 生图未成功获取到有效的图片地址' }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      logger.info(`[Draw Tool] 生图成功! 耗时 ${duration}s, 生成图片数=${validImages.length}, 首图URL=${validImages[0]?.url}`)

      // 阶段三：生图完成，第二次调用 setOuterRender 将骨架屏原地替换为真实高清大图
      const finalRenders = validImages.map(img => ({
        type: 'image',
        url: img.url
      }))
      this.setOuterRender(e, finalRenders)

      return {
        success: true,
        message: '生图成功，图片已由前端在消息气泡下方直接完成高清渲染。请勿在回复正文中重复输出 Markdown 图片语法（如 ![]()），直接针对生成的画面进行生动解说、点评或推进对话即可。',
        imageUrl: validImages[0]?.url,
        revisedPrompt: validImages[0]?.revisedPrompt || null,
        count: validImages.length
      }
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      logger.error(`[Draw Tool] 生图执行异常 (耗时 ${duration}s):`, error.message)
      this.setOuterRender(e, [{
        type: 'alert',
        alertType: 'error',
        title: '生图失败',
        description: error.message
      }])
      return { error: `[Draw Tool] 生图失败: ${error.message}` }
    }
  }
}
