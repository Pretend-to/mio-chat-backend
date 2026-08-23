import BaseImageAdapter from '../BaseImageAdapter.js'
import OpenAI from 'openai'
import logger from '../../../../utils/logger.js'

/**
 * OpenAIImageAdapter - 基于官方 OpenAI SDK 实现的图像生成适配器
 * 支持最新的 GPT Image 2 系列、GPT Image 1.5、DALL-E 3 以及各类兼容 OpenAI 协议的第三方网关（如 APIMart、OneAPI、NewAPI）
 */
export default class OpenAIImageAdapter extends BaseImageAdapter {
  constructor(config = {}) {
    super(config)
    this.name = 'openai-image'
  }

  async generate(options = {}) {
    const {
      prompt,
      image,
      size = '1024x1024',
      n = 1,
      style = 'vivid',
      quality = 'standard'
    } = options

    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('[OpenAIImageAdapter] Missing API Key in configuration')
    }

    const baseURL = (this.config.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
    const model = this.config.model || 'gpt-image-2'
    const imgInfo = image ? await this._resolveImageBase64(image) : null

    const openai = new OpenAI({
      apiKey,
      baseURL,
      timeout: 90000,
      maxRetries: 2
    })

    // 格式化尺寸
    let targetSize = size
    if (size === 'square') targetSize = '1024x1024'
    else if (size === 'portrait') targetSize = '1024x1792'
    else if (size === 'landscape') targetSize = '1792x1024'

    const requestParams = {
      model,
      prompt,
      n: model.includes('dall-e-3') ? 1 : Math.min(n, 4),
      size: targetSize,
      response_format: this.config.responseFormat || 'b64_json'
    }

    if (model.includes('dall-e-3')) {
      requestParams.style = style === 'anime' ? 'vivid' : style
      requestParams.quality = quality
    }

    logger.info(`[OpenAIImageAdapter] 请求生图: model="${model}", size="${targetSize}", prompt="${prompt?.slice(0, 80)}...", baseURL="${baseURL}"`)

    let response
    try {
      response = await openai.images.generate(requestParams)
    } catch (err) {
      // 某些第三方网关如果只支持 url 格式，尝试降级为 url
      if (err.message && (err.message.includes('response_format') || err.message.includes('b64_json'))) {
        logger.warn(`[OpenAIImageAdapter] 目标网关不支持 b64_json，正在降级为 url 格式重试...`)
        requestParams.response_format = 'url'
        response = await openai.images.generate(requestParams)
      } else {
        logger.error(`[OpenAIImageAdapter] API 调用失败:`, err.message)
        throw err
      }
    }

    const data = response

    // 1. 处理第三方网关异步任务（如 APIMart、中转站任务型生图）
    const firstItem = Array.isArray(data?.data) ? data.data[0] : (data?.data || data)
    const possibleTaskId = firstItem?.task_id || data?.task_id || (firstItem?.status === 'submitted' ? firstItem?.task_id || firstItem?.id : null)

    if (possibleTaskId && (!firstItem.url && !firstItem.b64_json)) {
      logger.info(`[OpenAIImageAdapter] 目标网关返回了排队任务 ID: ${possibleTaskId}，转入后台轮询等待...`)
      return await this._pollAsyncTask(baseURL, apiKey, possibleTaskId)
    }

    // 2. 处理标准 OpenAI 返回结构
    let items = []
    if (Array.isArray(data?.data)) {
      items = data.data
    } else if (Array.isArray(data?.images)) {
      items = data.images
    } else if (data?.url || data?.b64_json) {
      items = [data]
    }

    if (!items || items.length === 0) {
      throw new Error(`[OpenAIImageAdapter] 未能从 OpenAI 响应中提取到有效数据: ${JSON.stringify(data)}`)
    }

    return items.map((item) => {
      let rawUrl = item.url || item.image_url || item.image
      if (Array.isArray(rawUrl)) rawUrl = rawUrl[0]

      return {
        url: typeof rawUrl === 'string' ? rawUrl : null,
        base64: item.b64_json || item.base64 || (typeof rawUrl === 'string' && rawUrl.startsWith('data:') ? rawUrl : null),
        revisedPrompt: item.revised_prompt || item.revisedPrompt
      }
    })
  }

  /**
   * 针对 APIMart / 异步转发网关的任务轮询
   */
  async _pollAsyncTask(baseURL, apiKey, taskId, maxWaitSeconds = 120) {
    const startTime = Date.now()
    const taskUrl = `${baseURL}/tasks/${taskId}`

    while (Date.now() - startTime < maxWaitSeconds * 1000) {
      await new Promise((r) => setTimeout(r, 2000))

      try {
        const res = await fetch(taskUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(15000)
        })

        if (!res.ok) continue

        const taskJson = await res.json()
        const taskData = taskJson.data || taskJson
        const status = taskData.status

        logger.debug(`[OpenAIImageAdapter] 轮询任务 ${taskId} 状态: ${status}, 耗时: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)

        if (status === 'completed' || status === 'succeeded' || status === 'success') {
          const result = taskData.result || taskData.output || taskData
          let images = result.images || result.data || []
          if (!Array.isArray(images) && (result.url || result.image)) {
            images = [result]
          }

          if (Array.isArray(images) && images.length > 0) {
            logger.info(`[OpenAIImageAdapter] 异步任务 ${taskId} 渲染成功! 获取到 ${images.length} 张图片`)
            return images.map((img) => {
              let url = img.url || img.image || img.image_url
              if (Array.isArray(url)) url = url[0]
              return {
                url: typeof url === 'string' ? url : null,
                base64: img.b64_json || img.base64 || null,
                revisedPrompt: img.revised_prompt || null
              }
            })
          }
        } else if (status === 'failed' || status === 'error' || status === 'cancelled') {
          logger.error(`[OpenAIImageAdapter] 异步任务 ${taskId} 失败:`, taskData.error || taskData.message)
          throw new Error(`[OpenAIImageAdapter] 任务执行失败 (${status}): ${taskData.error || taskData.message || '未知错误'}`)
        }
      } catch (err) {
        if (err.message.includes('[OpenAIImageAdapter] 任务执行失败')) {
          throw err
        }
      }
    }

    logger.error(`[OpenAIImageAdapter] 任务 ${taskId} 轮询超时（超过 ${maxWaitSeconds}s）`)
    throw new Error(`[OpenAIImageAdapter] 任务 ${taskId} 轮询超时（超过 ${maxWaitSeconds}s）`)
  }

  static getAdapterMetadata() {
    return {
      type: 'openai-image',
      name: 'OpenAI (GPT Image / DALL-E)',
      description: '基于官方 OpenAI SDK。支持最新 GPT Image 2、GPT Image 1.5、DALL-E 3 及各类兼容网关',
      configSchema: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        baseUrl: { type: 'string', label: 'Base URL', default: 'https://api.openai.com/v1' },
        model: {
          type: 'string',
          label: '模型名称',
          default: 'gpt-image-2',
          options: [
            'gpt-image-2',
            'gpt-image-1.5',
            'gpt-image-1.5-mini',
            'dall-e-3',
            'dall-e-2'
          ]
        }
      }
    }
  }
}
