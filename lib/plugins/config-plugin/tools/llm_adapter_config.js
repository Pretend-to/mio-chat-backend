import { MioFunction } from '../../../function.js'
import {
  addLLMInstance,
  updateLLMInstance,
  deleteLLMInstance,
  maskSecret
} from '../../../server/http/services/configService.js'

export default class ManageLLMAdapter extends MioFunction {
  constructor() {
    super({
      name: 'llm_adapter_config',
      description: 'Manage LLM adapter configurations. Supports adding, updating, or deleting adapter instances.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add', 'update', 'delete'],
            description: 'The action to perform.'
          },
          adapterType: {
            type: 'string',
            description: 'The type of the adapter (e.g., openai, gemini, vertex).'
          },
          index: {
            type: 'integer',
            description: 'The 0-based index of the instance (required for update and delete).'
          },
          instanceConfig: {
            type: 'object',
            description: 'The configuration object for the instance (required for add and update). Supports partial updates — only pass the fields you want to change.'
          }
        },
        required: ['action', 'adapterType']
      },
      adminOnly: true
    })
    this.func = this.execute.bind(this)
  }

  getDisplayName(params) {
    const { action, adapterType, index } = params
    if (action === 'add') {
      return `Adding LLM adapter: ${adapterType || 'llm'}`
    } else if (action === 'update') {
      return `Updating LLM adapter: ${adapterType || 'llm'}#${index ?? ''}`
    } else if (action === 'delete') {
      return `Deleting LLM adapter: ${adapterType || 'llm'}#${index ?? ''}`
    }
    return 'Managing LLM adapter config'
  }

  /**
   * Tool 层脱敏：mask api_key，不影响前端管理面板
   */
  _maskResultApiKeys(result) {
    if (!result) return result
    const copy = JSON.parse(JSON.stringify(result))

    if (copy.instance && copy.instance.api_key) {
      copy.instance.api_key = maskSecret(copy.instance.api_key)
    }

    if (copy.llm_adapters && typeof copy.llm_adapters === 'object') {
      for (const instances of Object.values(copy.llm_adapters)) {
        if (Array.isArray(instances)) {
          instances.forEach(inst => {
            if (inst.api_key) inst.api_key = maskSecret(inst.api_key)
          })
        }
      }
    }

    return copy
  }

  async execute(e) {
    const { action, adapterType, index, instanceConfig } = e.params

    let approvalPrompt = ''
    let approvalMeta = { action, adapterType, index, instanceConfig }

    if (action === 'add') {
      if (!instanceConfig) throw new Error('instanceConfig is required for add action')
      const configStr = JSON.stringify(instanceConfig, null, 2)
      approvalPrompt = `是否授权 LLM 添加新的 ${adapterType} 适配器实例？\n\`\`\`json\n${configStr}\n\`\`\``
    } else if (action === 'update') {
      if (index === undefined) throw new Error('index is required for update action')
      if (!instanceConfig) throw new Error('instanceConfig is required for update action')
      const configStr = JSON.stringify(instanceConfig, null, 2)
      approvalPrompt = `是否授权 LLM 更新 ${adapterType} 适配器实例 #${index} 的配置？\n\`\`\`json\n${configStr}\n\`\`\``
    } else if (action === 'delete') {
      if (index === undefined) throw new Error('index is required for delete action')
      approvalPrompt = `是否授权 LLM 删除 ${adapterType} 适配器实例 #${index}？`
    } else {
      throw new Error(`Unknown action: ${action}`)
    }

    const approval = await this.requestUserApproval(e, approvalPrompt, approvalMeta)
    if (!approval.approved) {
      const reasonMsg = approval.reason ? ` 原因: ${approval.reason}` : ''
      return { success: false, error: `[执行终止] 用户拒绝授权此 LLM 适配器配置操作。${reasonMsg}` }
    }

    try {
      let result
      if (action === 'add') {
        result = await addLLMInstance(adapterType, instanceConfig)
      } else if (action === 'update') {
        result = await updateLLMInstance(adapterType, index, instanceConfig)
      } else if (action === 'delete') {
        result = await deleteLLMInstance(adapterType, index)
      }
      return { success: true, result: this._maskResultApiKeys(result) }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
