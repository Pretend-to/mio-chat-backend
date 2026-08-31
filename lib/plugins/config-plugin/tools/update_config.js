import { MioFunction } from '../../../function.js'
import { updateConfig } from '../../../server/http/services/configService.js'

export default class UpdateSystemConfig extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: 'Update system configuration nodes (server, web, onebot, storage, llm_adapters). Partial updates are supported.',
      name: 'update_config',
      parameters: {
        properties: {
          updates: {
            description: 'The configuration object containing fields to update. Example: {"web": {"title": "MioChat Pro"}}',
            type: 'object'
          }
        },
        required: ['updates'],
        type: 'object'
      }
    })
    this.func = this.execute.bind(this)
  }

  getDisplayName(params) {
    const { updates } = params
    const keys = updates ? Object.keys(updates).join(', ') : ''
    return `Updating system config: ${keys || 'system'}`
  }

  async execute(e) {
    const { updates } = e.params

    const configStr = JSON.stringify(updates, null, 2)
    const approval = await this.requestUserApproval(
      e,
      `是否授权 LLM 更新以下系统配置？\n\`\`\`json\n${configStr}\n\`\`\``,
      { updates }
    )
    if (!approval.approved) {
      const reasonMsg = approval.reason ? ` 原因: ${approval.reason}` : ''
      return { error: `[执行终止] 用户拒绝授权此系统配置操作。${reasonMsg}`, success: false }
    }

    try {
      const result = await updateConfig(updates)
      return { result, success: true }
    } catch (error) {
      return { error: error.message, success: false }
    }
  }
}
