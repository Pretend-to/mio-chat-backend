import { MioFunction } from '../../../function.js'

export default class ChannelModelTool extends MioFunction {
  constructor() {
    super({
      adminOnly: false,
      description: [
        '管理与查询当前渠道所使用的底层大模型 (Model) 与提供商 (Provider)。',
        '当用户询问系统当前使用了什么模型、有哪些可用模型、或者希望切换使用不同模型（如 Gemini、GPT-4o、Claude、DeepSeek）时调用此工具。',
        '支持 action：get (获取当前模型信息), list (列出所有可用模型), switch (切换使用的模型), reset (重置为默认模型)。',
      ].join('\n'),
      name: 'channel_model',
      parameters: {
        properties: {
          action: {
            default: 'get',
            description: '操作类型：get (获取当前模型), list (列出所有可用模型), switch (切换模型), reset (恢复默认)',
            enum: ['get', 'list', 'switch', 'reset'],
            type: 'string',
          },
          model: {
            description: '当 action 为 switch 时：目标模型名称（如 "gpt-4o" 或 "gemini-2.5-flash"）',
            type: 'string',
          },
          provider: {
            description: '当 action 为 switch 时：可选的提供商名称（如 "Vertex", "AIStdio", "OpenAI"）',
            type: 'string',
          },
        },
        required: ['action'],
        type: 'object',
      },
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const { action, model, provider } = e.params || {}
    const channel = e.channel || null
    const llmService = global.middleware?.llm

    try {
      if (action === 'get') {
        return {
          currentModel: channel?.model || '系统默认',
          currentProvider: channel?.provider || '系统默认',
          success: true,
        }
      }

      if (action === 'list') {
        const models = llmService?.getModelList ? llmService.getModelList(true) : {}
        const defaultProvider = llmService?._getDefaultProvider ? llmService._getDefaultProvider() : 'openai'
        return {
          availableModels: models,
          defaultProvider,
          success: true,
        }
      }

      if (action === 'switch') {
        if (!model && !provider) {
          return { error: '切换模型时必须指定 model 或 provider 参数', success: false }
        }
        if (channel) {
          if (provider) channel.provider = provider.trim()
          if (model) channel.model = model.trim()
          if (channel.memory) {
            if (provider) await channel.memory.setAgentMeta('provider', provider.trim())
            if (model) await channel.memory.setAgentMeta('model', model.trim())
          }
        }
        return {
          message: `当前渠道模型已成功切换为：${channel?.provider ? `${channel.provider}/` : ''}${channel?.model || model} ✅`,
          model: channel?.model || model,
          provider: channel?.provider || provider,
          success: true,
        }
      }

      if (action === 'reset') {
        if (channel) {
          channel.provider = channel.defaultProvider
          channel.model = channel.defaultModel
          if (channel.memory) {
            await channel.memory.setAgentMeta('provider', channel.defaultProvider || null)
            await channel.memory.setAgentMeta('model', channel.defaultModel || null)
          }
        }
        return {
          message: `已重置为渠道默认模型配置：${channel?.model || '系统默认'}`,
          success: true,
        }
      }

      return { error: `未知 action: ${action}`, success: false }
    } catch (err) {
      return { error: err.message, success: false }
    }
  }
}
