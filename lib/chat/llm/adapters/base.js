/* eslint-disable no-unused-vars */
/**
 * @class OpenAI Bot 实现
 */
export default class BaseLLMAdapter {
  /**
   * 构造函数
   * @param {string} baseUrl - OpenAI API 的基础 URL
   * @param {string} apiKey - OpenAI API 的密钥
   * @throws {Error} 如果 baseUrl 或 apiKey 缺失，则抛出错误
   */
  constructor(adapterConfig) {
    this.config = adapterConfig
    this.apiKey = adapterConfig.api_key
    this.baseURL = adapterConfig.base_url
    this.core = null

    this.models = [] // 可用模型列表
    this.guestModels = [] // 访客可用的模型列表

    // 实例化时检测子类是否实现了必要的方法
    if (typeof this.loadModles !== 'function') {
      throw new Error('子类必须实现 initModels 方法')
    }

    if (typeof this.handleChatRequest!== 'function') {
      throw new Error('子类必须实现 chat 方法')  
    }

  }

  /**
   * 初始化模型列表
   * @returns {Promise<object>} 包含模型和所有者数量的对象
   * @throws {Error} 如果获取模型列表失败，则抛出错误
   */
  async loadModles() {

  }

  /**
   * 处理聊天请求
   * @param {object} e - 事件对象，包含聊天请求的详细信息
   * @param {boolean} [firstCall=true] - 是否是第一次调用（用于递归调用）
   */
  async handleChatRequest(e, firstCall) {

  }

}