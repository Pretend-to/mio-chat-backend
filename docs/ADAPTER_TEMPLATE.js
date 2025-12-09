/**
 * 新适配器模板示例
 * 将此文件复制到 lib/chat/llm/adapters/ 目录并重命名
 */

import BaseLLMAdapter from './base.js'
import logger from '../../../../utils/logger.js'

export default class NewAdapter extends BaseLLMAdapter {
  /**
   * 【必需】声明适配器元数据
   * 系统会自动扫描并注册此适配器
   */
  static getAdapterMetadata() {
    return {
      type: 'new-adapter',           // 适配器类型标识,必须与文件名对应
      requiresSpecialAuth: false     // true=需要特殊认证(如Vertex), false=标准API Key认证
    }
  }

  /**
   * 构造函数
   */
  constructor(config) {
    super(config)
    this.provider = 'new-adapter'  // 应与 type 保持一致
  }

  /**
   * 【必需】获取 API 客户端实例
   * 返回用于调用 LLM API 的客户端对象
   */
  get core() {
    const { base_url, api_key } = this.config
    
    if (!api_key) {
      throw new Error('API Key 未配置')
    }
    
    // 示例:创建你的 API 客户端
    // return new YourAPIClient({
    //   baseURL: base_url,
    //   apiKey: api_key
    // })
  }

  /**
   * 【必需】获取模型列表
   * 从 API 获取可用模型并按 owner 分组
   */
  async _getModels() {
    try {
      // 示例:调用你的 API 获取模型列表
      // const response = await this.core.models.list()
      // const models = response.data
      
      const models = [] // 替换为实际的 API 调用
      
      // 按 owner 分组模型
      const groupedModels = this._groupModelsByOwner(models, this.owners)
      
      return this._sortModelList(groupedModels)
    } catch (error) {
      logger.error('获取模型列表失败:', error)
      throw error
    }
  }

  /**
   * 【必需】处理聊天请求
   * 实现与 LLM 的实际交互逻辑
   */
  async _executeChatRequest(processedBody, e) {
    try {
      // 示例:调用你的 API 进行聊天
      // const response = await this.core.chat.completions.create({
      //   model: processedBody.model,
      //   messages: processedBody.messages,
      //   stream: true
      // })
      
      // 处理流式响应
      // for await (const chunk of response) {
      //   e.chunk(chunk)
      // }
      
      logger.warn('_executeChatRequest 需要实现')
      throw new Error('未实现')
    } catch (error) {
      logger.error('聊天请求失败:', error)
      throw error
    }
  }

  /**
   * 【可选】准备聊天请求体
   * 在发送请求前对请求体进行预处理
   */
  async _prepareChatBody(body) {
    // 可以在这里做一些特殊处理,例如:
    // - 转换消息格式
    // - 处理图片
    // - 添加特殊参数
    
    return body
  }
}

/**
 * 配置示例 (添加到 config/config/config.yaml):
 * 
 * llm_adapters:
 *   new-adapter:  # 必须与 getAdapterMetadata().type 一致
 *     - enable: true
 *       name: new-adapter-1
 *       api_key: your_api_key_here
 *       base_url: https://api.example.com
 *       models: []  # 可选:手动指定模型列表
 *       default_model: your-default-model
 *       guest_models:  # 可选:访客可用的模型
 *         keywords: []
 *         full_name: []
 */
