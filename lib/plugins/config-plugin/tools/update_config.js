import { MioFunction } from '../../../function.js'
import { updateConfig } from '../../../server/http/services/configService.js'

export default class UpdateSystemConfig extends MioFunction {
  constructor() {
    super({
      name: 'update_config',
      description: 'Update system configuration nodes (server, web, onebot, storage, llm_adapters). Partial updates are supported.',
      parameters: {
        type: 'object',
        properties: {
          updates: {
            type: 'object',
            description: 'The configuration object containing fields to update. Example: {"web": {"title": "MioChat Pro"}}'
          }
        },
        required: ['updates']
      },
      adminOnly: true
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
    
    // 二次授权确认
    const updatesStr = JSON.stringify(updates, null, 2)
    const approval = await this.requestUserApproval(
      e,
      `是否授权 LLM 更新系统配置？\n\`\`\`json\n${updatesStr}\n\`\`\``,
      { updates }
    )
    if (!approval.approved) {
      const reasonMsg = approval.reason ? ` 原因: ${approval.reason}` : ''
      return { success: false, error: `[执行终止] 用户拒绝授权更新系统配置。${reasonMsg}` }
    }

    try {
      const result = await updateConfig(updates)
      return { success: true, result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
