import BaseHook from '../../../../lib/hooks/BaseHook.js';
import { HOOK_POINTS } from '../../../../lib/hooks/types.js';
import path from 'path';

/**
 * 文件路径安全守卫 Hook
 * 防止 LLM 越权访问项目外的敏感文件
 */
export default class PathGuardHook extends BaseHook {
  constructor(options) {
    super({
      name: 'file-path-guard',
      description: '防止越权访问敏感文件路径',
      hookPoint: HOOK_POINTS.TOOL_BEFORE_EXECUTE,
      priority: 95, // 优先级非常高，在权限检查之后立即执行
      namespace: options.namespace
    });

    // 敏感文件/目录黑名单 (相对路径)
    this.blackList = [
      '.env',
      'node_modules',
      '.git',
      'prisma/dev.db'
    ];
  }

  async execute(ctx) {
    const { params } = ctx;
    
    // 自动检测多种可能的路径参数名
    const pathKeys = ['filePath', 'localPath', 'path', 'src', 'dest'];
    const key = pathKeys.find(k => params[k]);
    if (!key) return true;

    let targetPath = params[key];
    const rootPath = process.cwd();
    const absolutePath = path.isAbsolute(targetPath) ? targetPath : path.resolve(rootPath, targetPath);

    // 1. 检查是否越出了项目根目录 (Path Traversal 攻击)
    if (!absolutePath.startsWith(rootPath)) {
      ctx.error = `[安全拦截] 禁止访问项目根目录以外的路径: ${filePath}`;
      return false;
    }

    // 2. 检查黑名单文件
    const relativePath = path.relative(rootPath, absolutePath);
    const isBlacklisted = this.blackList.some(item => 
      relativePath === item || relativePath.startsWith(item + path.sep)
    );

    if (isBlacklisted) {
      ctx.error = `[安全拦截] 禁止访问系统敏感文件: ${relativePath}`;
      return false;
    }

    return true;
  }
}
