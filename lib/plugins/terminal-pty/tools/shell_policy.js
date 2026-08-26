import { MioFunction } from '../../../function.js'
import { shellPolicyService } from '../../../database/services/ShellPolicyService.js'

/**
 * Shell 自动审批策略管理工具（后端权威名单）
 *
 * 规则类型：
 *   - allow（默认）：自动放行名单，可绑定工作区 cwd（仅该目录及子目录内生效，留空=全局）
 *   - deny：高危黑名单（必须人工介入），deny 优先于 allow
 *
 * 约束：高危命令（rm/node/python/npm/curl/sudo 等）不允许加入 allow 名单，只能人工审批；
 *       deny 名单可增删，但删除后高危命令仍无法加入 allow（防呆）。
 */
export default class shell_policy extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description:
        '管理 Shell 命令自动审批策略（后端权威名单）。支持列出/新增/删除规则：' +
        '- deny（高危黑名单，必须人工介入，deny 优先）；' +
        '- allow（自动放行名单，可选绑定工作区 cwd 目录，仅在该目录及子目录内生效）。' +
        '高危命令不允许加入 allow 名单，只能人工审批。',
      name: 'shell_policy',
      parameters: {
        properties: {
          action: {
            description: 'list=列出全部规则; add=新增规则; remove=删除规则',
            enum: ['list', 'add', 'remove'],
            type: 'string',
          },
          matchType: {
            description: '匹配方式：command=命令全等；prefix=命令前缀。默认 command',
            enum: ['command', 'prefix'],
            type: 'string',
          },
          match: {
            description: '匹配串：具体命令（如 "git status"）或命令前缀（如 "git pull"）',
            type: 'string',
          },
          cwd: {
            description: '可选：工作区目录前缀（如 /www/fake_mio/servers/mio-chat-backend）。绑定后仅在该目录及子目录内生效；留空=全局生效',
            type: 'string',
          },
          deny: {
            description: 'true=高危黑名单（拒绝执行，必须人工介入）；false=自动放行名单。默认 false',
            type: 'boolean',
          },
          ruleId: {
            description: 'remove 时必填：要删除的规则 ID',
            type: 'number',
          },
        },
        required: ['action'],
        type: 'object',
      },
    })
    this.func = this.execute
  }
  async execute(e) {
    const { action } = e.params
    await shellPolicyService.initialize()
    switch (action) {
      case 'list': {
        const rules = await shellPolicyService.list()
        return {
          message: `系统当前共有 ${rules.length} 条 Shell 审批规则（deny 高风险 / allow 自动放行）`,
          rules,
          success: true,
        }
      }
      case 'add': {
        const rule = await shellPolicyService.add(e.params)
        const scopeText = rule.cwd ? `（工作区限定: ${rule.cwd}）` : '（全局生效）'
        return {
          message: `已添加${rule.deny ? '高危黑名单(deny)' : '自动放行(allow)'}规则「${rule.match}」${scopeText}`,
          rule,
          success: true,
        }
      }
      case 'remove': {
        if (!e.params.ruleId) throw new Error('remove 操作需要 ruleId')
        await shellPolicyService.remove(e.params.ruleId)
        return { message: `已删除规则 #${e.params.ruleId}`, success: true }
      }
      default:
        throw new Error(`不支持的 action: ${action}`)
    }
  }
}