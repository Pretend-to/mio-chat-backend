/* eslint-disable camelcase */
import config from '../../../config.js'
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
    this.owners = config.getModelsOwners()
    this.models = [] // 可用模型列表
    this.guestModels = [] // 访客可用的模型列表

    // 实例化时检测子类是否实现了必要的方法
    if (typeof this.loadModels !== 'function') {
      throw new Error('子类必须实现 initModels 方法')
    }

    if (typeof this.handleChatRequest !== 'function') {
      throw new Error('子类必须实现 handleChatRequest 方法')
    }
  }

  /**
   * 初始化模型列表
   * @returns {Promise<object>} 包含模型和所有者数量的对象
   * @throws {Error} 如果获取模型列表失败，则抛出错误
   */
  async loadModels() {
    try {
      this.models = await this._getModels()
      this.guestModels = this._filterGuestModels()

      return {
        ownerCount: this.models.length,
        modelsCount: this._calculateTotalModels(this.models),
        guestOwnerCount: this.guestModels.length,
        guestModelsCount: this._calculateTotalModels(this.guestModels),
      }
    } catch (error) {
      logger.error('Failed to initialize models:', error)
      throw error // 重新抛出错误，以便上层处理
    }
  }

  /**
   * 处理聊天请求
   * @param {object} e - 事件对象，包含聊天请求的详细信息
   * @param {boolean} [firstCall=true] - 是否是第一次调用（用于递归调用）
   */
  async handleChatRequest(e, firstCall = true) {
    try {
      const processedBody = await this._prepareChatBody(e.body)
      logger.json(processedBody)
      const response = await this._executeChatRequest(processedBody, e)

      if (response.toolCalls) {
        // 重置工具模式，防止无限调用
        e.body.settings.toolCallSettings.mode = 'AUTO'

        await this._handleToolCalls(response.toolCalls, e)
      }

      if (firstCall) e.complete()
    } catch (error) {
      e.error(error) //直接抛出，让调用方处理
    } finally {
      // e.client.popConnection(e.request_id)
    }
  }

  /**
   * 获取格式化后的工具配置
   * @private
   * @param {object} body - 请求体
   * @returns {object|null} 格式化后的工具配置，如果没有工具则返回 null
   */
  _getFormattedTools(tools) {
    // 假设middleware.getOpenaiTools存在，且根据tools获取openai可以使用的工具
    if (tools?.length > 0) {
      return middleware.llm.getLLMTools(tools, this.provider)
    }
    return {}
  }

  /**
   * 生成随机的调用 ID
   * @private
   * @returns {string} 随机的调用 ID
   */
  _getRandomCallId() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    )
  }

  /**
   * 根据配置过滤访客可用的模型
   * @private
   * @returns {Array<object>} 过滤后的访客模型列表
   */
  _filterGuestModels() {
    const guestConfig = this.config.guest_models || {}
    return this.models.reduce((acc, item) => {
      const allowedModels = this._filterAllowedModels(item.models, guestConfig)
      if (allowedModels.length > 0) {
        acc.push({ owner: item.owner, models: allowedModels })
      }
      return acc
    }, [])
  }

  /**
   * 过滤允许的模型列表
   * @private
   * @param {Array<string>} models - 要过滤的模型名称列表
   * @param {object} guestConfig - 访客模型的配置
   * @returns {Array<string>} 允许的模型名称列表
   */
  _filterAllowedModels(models, guestConfig) {
    return models.filter((modelName) =>
      this._isModelAllowed(modelName, guestConfig),
    )
  }

  /**
   * 检查模型是否被允许
   * @private
   * @param {string} modelName - 要检查的模型名称
   * @param {object} guestConfig - 访客模型的配置
   * @returns {boolean} 如果模型被允许，则返回 true，否则返回 false
   */
  _isModelAllowed(modelName, guestConfig) {
    const { keywords = [], full_name = [] } = guestConfig
    return (
      keywords.some((keyword) => modelName.includes(keyword)) ||
      full_name.some((name) => modelName === name)
    )
  }

  /**
   * 计算模型列表中的模型总数
   * @private
   * @param {Array<object>} modelList - 模型列表
   * @returns {number} 模型总数
   */
  _calculateTotalModels(modelList) {
    return modelList.reduce((acc, cur) => acc + cur.models.length, 0)
  }

  /**
   * 根据所有者对模型进行分组
   * @private
   * @param {Array<object>} models - 从 API 获取的模型数据
   * @param {Array<object>} ownerList - 所有者列表
   * @returns {Array<object>} 按所有者分组的模型列表
   */
  _groupModelsByOwner(models, ownerList) {
    return models.reduce((acc, model) => {
      const owner = this._determineModelOwner(model.id, ownerList)
      const existingOwner = acc.find((item) => item.owner === owner)

      if (existingOwner) {
        existingOwner.models.push(model.id)
      } else {
        acc.push({ owner, models: [model.id] })
      }
      return acc
    }, [])
  }

  /**
   * 确定模型的所有者
   * @private
   * @param {string} modelId - 模型 ID
   * @param {Array<object>} ownerList - 所有者列表
   * @returns {string} 模型的所有者
   */
  _determineModelOwner(modelId, ownerList) {
    const modelIdLower = modelId.toLowerCase()
    const matchedOwner = ownerList.find(({ keywords }) =>
      keywords.some((keyword) => modelIdLower.includes(keyword)),
    )
    return matchedOwner?.owner || 'Custom'
  }

  /**
   * 对模型列表进行排序（字母表降序，"Custom" 最后）
   * @private
   * @param {Array<object>} modelList - 模型列表
   * @returns {Array<object>} 排序后的模型列表
   */
  _sortModelList(modelList) {
    return modelList.sort((a, b) => {
      if (a.owner === 'Custom') return 1
      if (b.owner === 'Custom') return -1
      return b.owner.localeCompare(a.owner)
    })
  }
}
