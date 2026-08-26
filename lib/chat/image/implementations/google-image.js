import BaseImageAdapter from '../BaseImageAdapter.js'
import { GoogleAuth } from 'google-auth-library'

/**
 * GoogleImageAdapter - Google Gemini / Imagen 原生图像生成适配器
 * 统一采用与 LLM 对话一致的 generateContent / predict 原生协议
 */
export default class GoogleImageAdapter extends BaseImageAdapter {
  constructor(config = {}) {
    super(config)
    this.name = 'google-image'
    this.platform = config.platform || 'aistudio'

    if (config.expressMode !== undefined) {
      this.expressMode = Boolean(config.expressMode)
    } else if (config.blockExpress !== undefined) {
      this.expressMode = !config.blockExpress
    } else {
      this.expressMode = true
    }

    if (this.platform === 'vertex' && !this.expressMode) {
      this._googleAuth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      })
    }
  }

  async _getAuthHeaders() {
    if (this.platform === 'vertex' && !this.expressMode) {
      try {
        const client = await this._googleAuth.getClient()
        const token = await client.getAccessToken()
        return {
          Authorization: `Bearer ${token.token}`
        }
      } catch (error) {
        throw new Error(`[GoogleImageAdapter] Vertex AI ADC 认证失败: ${error.message}`)
      }
    }
    return {}
  }

  async generate(options = {}) {
    const { prompt, image, size = '1024x1024', n = 1, aspectRatio = '1:1' } = options
    const platform = this.config.platform || 'aistudio'
    const model = this.config.model || (platform === 'vertex' ? 'gemini-3.1-flash-image' : 'gemini-3.1-flash-image')
    const apiKey = this.config.apiKey || process.env.GEMINI_API_KEY

    // 计算宽高比
    let targetAspectRatio = aspectRatio
    if (size === 'portrait' || size === '768x1024' || size === '1024x1792' || size === '512x768') {
      targetAspectRatio = '3:4'
    } else if (size === 'landscape' || size === '1024x768' || size === '1792x1024' || size === '768x512') {
      targetAspectRatio = '4:3'
    }

    if (platform === 'vertex') {
      return this._generateVertex({ prompt, image, model, apiKey, n, targetAspectRatio })
    } else {
      return this._generateAIStudio({ prompt, image, model, apiKey, n, targetAspectRatio })
    }
  }

  async _generateAIStudio({ prompt, image, model, apiKey, n, targetAspectRatio }) {
    if (!apiKey) {
      throw new Error('[GoogleImageAdapter] 缺少 AI Studio Gemini API Key')
    }

    const baseUrl = (this.config.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
    const imgInfo = image ? await this._resolveImageBase64(image) : null

    // 1. Imagen 专用模型走 :predict
    if (model.startsWith('imagen-')) {
      const url = `${baseUrl}/v1beta/models/${model}:predict?key=${apiKey}`
      const instance = { prompt }
      if (imgInfo) {
        instance.image = { bytesBase64Encoded: imgInfo.base64 }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [instance],
          parameters: {
            sampleCount: Math.min(n, 4),
            aspectRatio: targetAspectRatio,
            outputOptions: { mimeType: 'image/jpeg' }
          }
        }),
        signal: AbortSignal.timeout(30000)
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`[GoogleImageAdapter] Imagen API Error (${response.status}): ${errText}`)
      }

      const data = await response.json()
      const predictions = data.predictions || []
      return predictions.map(p => ({
        base64: `data:image/jpeg;base64,${p.bytesBase64Encoded || p.image?.imageBytes || p.image}`
      }))
    }

    // 2. Gemini 画图系列：支持多模态图生图 (通过 parts 携带 inlineData)
    const parts = [{ text: prompt }]
    if (imgInfo) {
      parts.push({
        inlineData: {
          mimeType: imgInfo.mimeType,
          data: imgInfo.base64
        }
      })
    }

    const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts
          }
        ]
      }),
      signal: AbortSignal.timeout(35000)
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`[GoogleImageAdapter] Gemini API Error (${response.status}): ${errText}`)
    }

    const data = await response.json()
    return this._parseGeminiResponse(data)
  }

  async _generateVertex({ prompt, image, model, apiKey, n, targetAspectRatio }) {
    const projectId = this.config.projectId
    if (!projectId) {
      throw new Error('[GoogleImageAdapter] Vertex AI 模式下必须配置 Google Cloud 项目 ID (projectId)')
    }

    if (this.expressMode && !apiKey) {
      throw new Error('[GoogleImageAdapter] Vertex AI Express 模式下必须配置 API Key')
    }

    const location = this.config.location || 'us-central1'
    const defaultBaseUrl = `https://${location}-aiplatform.googleapis.com`
    const baseUrl = (this.config.baseUrl || defaultBaseUrl).replace(/\/$/, '')

    const headers = {
      'Content-Type': 'application/json',
      ...(await this._getAuthHeaders())
    }

    const imgInfo = image ? await this._resolveImageBase64(image) : null

    // 1. Imagen 专用模型走 :predict
    if (model.startsWith('imagen-') || model.startsWith('imagegeneration')) {
      let url = `${baseUrl}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`
      if (this.expressMode) {
        url += `?key=${apiKey}`
      }

      const instance = { prompt }
      if (imgInfo) {
        instance.image = { bytesBase64Encoded: imgInfo.base64 }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          instances: [instance],
          parameters: {
            sampleCount: Math.min(n, 4),
            aspectRatio: targetAspectRatio,
            outputOptions: { mimeType: 'image/jpeg' }
          }
        }),
        signal: AbortSignal.timeout(30000)
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`[GoogleImageAdapter] Vertex Imagen Error (${response.status}): ${errText}`)
      }

      const data = await response.json()
      const predictions = data.predictions || []
      return predictions.map(p => ({
        base64: `data:image/jpeg;base64,${p.bytesBase64Encoded || p.image?.imageBytes || p.image}`
      }))
    }

    // 2. Gemini 画图系列：支持多模态图生图 (通过 parts 携带 inlineData)
    const parts = [{ text: prompt }]
    if (imgInfo) {
      parts.push({
        inlineData: {
          mimeType: imgInfo.mimeType,
          data: imgInfo.base64
        }
      })
    }

    let url = `${baseUrl}/v1beta1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
    if (this.expressMode) {
      url += `?key=${apiKey}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts
          }
        ]
      }),
      signal: AbortSignal.timeout(35000)
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`[GoogleImageAdapter] Vertex Gemini Error (${response.status}): ${errText}`)
    }

    const data = await response.json()
    return this._parseGeminiResponse(data)
  }

  _parseGeminiResponse(data) {
    const results = []

    // 1. 检查 inlineData / inline_data (标准二进制图片返回)
    const candidates = data.candidates || []
    for (const cand of candidates) {
      for (const part of cand.content?.parts || []) {
        const inlineData = part.inlineData || part.inline_data
        if (inlineData?.data) {
          const mime = inlineData.mimeType || inlineData.mime_type || 'image/png'
          results.push({
            base64: `data:${mime};base64,${inlineData.data}`
          })
        } else if (part.text) {
          // 检查 markdown 图片语法
          const mdMatch = part.text.match(/!\[.*?\]\((https?:\/\/[^\s\)]+|data:image\/[^\s\)]+)\)/)
          if (mdMatch) {
            const src = mdMatch[1]
            if (src.startsWith('data:')) {
              results.push({ base64: src })
            } else {
              results.push({ url: src })
            }
          }
        }
      }
    }

    if (results.length > 0) return results

    // 2. 检查 predictions
    if (data.predictions && Array.isArray(data.predictions)) {
      return data.predictions.map(p => ({
        base64: `data:image/jpeg;base64,${p.bytesBase64Encoded || p.image?.imageBytes || p.image}`
      }))
    }

    // 3. 检查 generatedImages
    if (data.generatedImages && Array.isArray(data.generatedImages)) {
      return data.generatedImages.map(img => ({
        base64: `data:image/jpeg;base64,${img.image?.imageBytes || img.image?.image_bytes}`
      }))
    }

    throw new Error('[GoogleImageAdapter] 模型已成功响应但未包含图像数据，请确认所选模型具备直接图像生成输出能力')
  }

  static getAdapterMetadata() {
    return {
      type: 'google-image',
      name: 'Google Gemini',
      description: 'Google 原生图像生成（支持 AI Studio 与 Vertex AI Gemini 系列画图模型）',
      configSchema: {
        platform: {
          type: 'string',
          label: '接入平台',
          default: 'aistudio',
          options: ['aistudio', 'vertex']
        },
        apiKey: {
          type: 'string',
          label: 'API Key',
          required: true,
          secret: true
        },
        projectId: {
          type: 'string',
          label: '项目 ID',
          placeholder: 'Google Cloud 项目 ID (Vertex 必填)',
          default: ''
        },
        location: {
          type: 'string',
          label: '部署区域',
          default: 'us-central1',
          options: ['us-central1', 'us-east4', 'europe-west4', 'asia-northeast1', 'asia-east1', 'global']
        },
        expressMode: {
          type: 'boolean',
          label: '启用 Express 模式',
          tip: '使用 API Key 直连（关闭则使用 ADC 凭证）',
          default: true
        },
        baseUrl: {
          type: 'string',
          label: 'Base URL',
          default: 'https://generativelanguage.googleapis.com'
        },
        model: {
          type: 'string',
          label: '模型名称',
          default: 'gemini-3.1-flash-image',
          options: [
            'gemini-3.1-flash-image',
            'gemini-3.1-flash-lite-image',
            'gemini-2.5-flash-image',
            'gemini-2.5-flash',
            'gemini-2.5-pro',
            'imagen-3.0-generate-002',
            'imagen-3.0-fast-generate-001'
          ]
        }
      }
    }
  }
}
