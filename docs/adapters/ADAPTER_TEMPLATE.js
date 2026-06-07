/**
 * Mio-Chat V3 标准适配器模版
 * 适用场景：接入任何第三方 LLM API
 */

import BaseLLMAdapter from '../base.js'
import logger from '../../../../logger.js'

export default class CustomAdapter extends BaseLLMAdapter {
  static getAdapterMetadata() {
    return {
      type: 'custom-provider',
      name: '自定义大模型',
      description: '这是一个标准的适配器模板',
      supportedFeatures: ['chat', 'streaming'],
      initialConfigSchema: {
        api_key: { type: 'password', label: 'API Key', required: true },
        base_url: { type: 'url', label: 'Base URL', default: 'https://api.example.com' }
      }
    }
  }

  constructor(config) {
    super(config)
    this.provider = 'custom-provider'
    // 在这里初始化你的客户端
    // this.client = new SomeSDK(config.api_key)
  }

  /**
   * 获取模型列表
   */
  async _getModels() {
    // 模拟从 API 获取模型
    return [
      { id: 'model-1', name: '模型 1', owner: 'Custom' },
      { id: 'model-2', name: '模型 2', owner: 'Custom' }
    ]
  }

  /**
   * 核心对话入口
   */
  async handleChatRequest(e) {
    const timeMetrics = {
      startTime: Date.now(),
      model: e.body.settings?.base?.model,
      isStream: true,
      e
    }

    try {
      // 1. 发送请求给 LLM
      // const response = await this.client.chat(...)

      // 2. 处理流式返回 (伪代码示例)
      /*
      for await (const chunk of response) {
        if (chunk.content) {
          e.update({ type: 'content', content: chunk.content })
        }
        if (!timeMetrics.firstTokenTime) timeMetrics.firstTokenTime = Date.now()
        if (chunk.usage) e.lastUsage = chunk.usage // 非常重要，用于后续审计
      }
      */

      // 3. 统一审计 (自动触发 Hook、记录数据库、打印日志表格)
      this.logUsage(this.provider, e.lastUsage, timeMetrics)

      // 4. 检查是否需要触发结晶压缩
      await this._checkAndCrystallize(e)

    } catch (err) {
      logger.error(`[${this.provider}] 请求失败:`, err)
      e.error(err)
    }
  }
}
