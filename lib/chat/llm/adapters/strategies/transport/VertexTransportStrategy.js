/**
 * Vertex AI 请求传输与 URL 构建策略
 * 支持 ADC 端点模式与 Express API Key 端点模式
 */
export class VertexTransportStrategy {
  constructor({
    baseUrl = 'https://aiplatform.googleapis.com',
    projectId,
    apiKey,
    blockExpress = false,
  } = {}) {
    this.baseUrl = baseUrl
    this.projectId = projectId
    this.apiKey = apiKey || ''
    this.blockExpress = Boolean(blockExpress)
  }

  getRequestUrl(model, stream) {
    if (this.blockExpress) {
      return `${this.baseUrl}/v1/projects/${this.projectId}/locations/global/publishers/google/models/${model}:${
        stream ? 'streamGenerateContent?alt=sse' : 'generateContent'
      }`
    }
    return `${this.baseUrl}/v1/projects/${this.projectId}/locations/global/publishers/google/models/${model}:${
      stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?'
    }key=${this.apiKey}`
  }

  getPublisherModelsUrl(region = 'us-central1') {
    let url = `https://${region}-aiplatform.googleapis.com/v1beta1/projects/${this.projectId}/locations/${region}/publishers/google/models`
    if (!this.blockExpress) {
      url += `?key=${this.apiKey}`
    }
    return url
  }
}
