import { GoogleAuth } from 'google-auth-library'

/**
 * Vertex AI 认证策略
 * 支持两种认证模式：
 * 1. Express 模式（API Key）：无需 Authorization Header，密钥通过 Query 参数传递
 * 2. ADC 模式（Application Default Credentials）：通过 GoogleAuth 获取 Access Token 并注入 Bearer 头
 */
export class VertexAuthStrategy {
  constructor({ blockExpress = false } = {}) {
    this.blockExpress = Boolean(blockExpress)
    if (this.blockExpress) {
      this._googleAuth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      })
    }
  }

  async getAuthHeaders() {
    if (this.blockExpress) {
      try {
        const client = await this._googleAuth.getClient()
        const token = await client.getAccessToken()
        return {
          Authorization: `Bearer ${token.token}`,
        }
      } catch (error) {
        throw new Error(
          `Vertex AI ADC 认证失败: ${error.message}\n\n` +
            '请配置 Application Default Credentials (ADC)：\n' +
            '  方式一：export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json\n' +
            '  方式二：gcloud auth application-default login\n' +
            '  方式三：在 GCE / Cloud Run / GKE 上运行（自动使用 metadata server）',
          { cause: error },
        )
      }
    }
    return {}
  }
}
