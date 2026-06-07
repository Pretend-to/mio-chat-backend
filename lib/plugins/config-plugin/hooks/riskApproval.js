import BaseHook from '../../../../lib/hooks/BaseHook.js';
import { HOOK_POINTS } from '../../../../lib/hooks/types.js';

/**
 * 高危配置操作授权 Hook
 * 统一拦截 config-plugin 中的修改/重载操作
 */
export default class RiskApprovalHook extends BaseHook {
  constructor(options) {
    super({
      name: 'config-risk-approval',
      description: '对高危系统配置操作进行二次授权确认',
      hookPoint: HOOK_POINTS.TOOL_BEFORE_EXECUTE,
      priority: 70, // 在权限检查(90)之后，业务逻辑之前执行
      namespace: options.namespace
    });
    
    // 需要拦截的工具名列表
    this.highRiskTools = ['update_config', 'reload'];
  }

  async execute(ctx) {
    const { tool, event, params } = ctx;

    // 检查是否是当前插件的高危工具 (注意工具名带有 hash，需匹配前缀)
    const isHighRisk = this.highRiskTools.some(name => tool.name.startsWith(name));
    if (!isHighRisk) return true;

    console.log(`[RiskApprovalHook] 拦截到高危操作: ${tool.name}`);

    // 构建提示词
    let prompt = '是否授权 LLM 执行此系统配置操作？';
    if (tool.name.startsWith('update_config')) {
      prompt = `是否授权 LLM 更新系统配置？\n\`\`\`json\n${JSON.stringify(params.updates, null, 2)}\n\`\`\``;
    } else if (tool.name.startsWith('reload')) {
      prompt = '是否授权 LLM 执行系统热重载（可能会导致短暂的服务连接中断）？';
    }

    // 调用工具实例上的 requestUserApproval 方法
    // ctx.tool 是 MioFunction 的实例
    const approval = await tool.requestUserApproval(event, prompt, { params });
    
    if (!approval.approved) {
      const reasonMsg = approval.reason ? ` 原因: ${approval.reason}` : '';
      ctx.error = `[执行终止] 用户拒绝授权。${reasonMsg}`;
      return false; // 拦截执行
    }

    return true;
  }
}
