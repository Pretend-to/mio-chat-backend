import { HOOK_POINTS } from './types.js';

/**
 * 责任链模式的 Hook 管理器
 * 支持预排序存储以保证执行性能
 */
export default class HookManager {
  constructor() {
    /** @type {Object.<string, Array>} 按挂载点存储的已排序钩子数组 */
    this.hooks = {};
  }

  /**
   * 注册一个钩子实例
   * @param {import('./BaseHook').default} hookInstance 
   */
  async register(hookInstance) {
    // 1. 查找所有动态实现的钩子挂载点
    let registeredPointsCount = 0;

    for (const point of Object.values(HOOK_POINTS)) {
      if (typeof hookInstance[point] === 'function') {
        if (!this.hooks[point]) {
          this.hooks[point] = [];
        }
        if (!this.hooks[point].includes(hookInstance)) {
          this.hooks[point].push(hookInstance);
          registeredPointsCount++;
        }
      }
    }

    // 2. 兼容传统方式 (显式指定 hookPoint)
    if (hookInstance.hookPoint) {
      const point = hookInstance.hookPoint;
      if (!this.hooks[point]) {
        this.hooks[point] = [];
      }
      if (!this.hooks[point].includes(hookInstance)) {
        this.hooks[point].push(hookInstance);
        registeredPointsCount++;
      }
    }

    // 3. 对涉及的所有挂载点重新进行优先级排序
    for (const point in this.hooks) {
      this.hooks[point].sort((a, b) => {
        const prioA = typeof a.getPriority === 'function' ? a.getPriority() : (a.priority ?? 50);
        const prioB = typeof b.getPriority === 'function' ? b.getPriority() : (b.priority ?? 50);
        return prioB - prioA;
      });
    }

    if (typeof hookInstance.initialize === 'function') {
      await hookInstance.initialize();
    }
    
    return hookInstance;
  }

  /**
   * 执行指定挂载点的所有钩子
   * @param {string} hookPoint 
   * @param {object} ctx 
   * @returns {Promise<boolean>} 是否允许继续后续流程
   */
  async execute(hookPoint, ctx) {
    const chain = this.hooks[hookPoint] || [];
    
    for (const hook of chain) {
      if (!hook.enabled) continue;

      // 避免在同一次工具执行生命周期中，同一个钩子在相同挂载点被重复执行
      ctx.executedHooks = ctx.executedHooks || new Set();
      const hookKey = `${hookPoint}:${hook.namespace || 'global'}:${hook.name}`;
      if (ctx.executedHooks.has(hookKey)) {
        logger.debug(`[HookManager] 跳过在挂载点 ${hookPoint} 重复执行的钩子: ${hookKey}`);
        continue;
      }
      ctx.executedHooks.add(hookKey);

      try {
        let result;
        if (typeof hook[hookPoint] === 'function') {
          result = await hook[hookPoint](ctx);
        } else if (typeof hook.execute === 'function') {
          result = await hook.execute(ctx);
        } else {
          continue;
        }

        // 语义 1: 明确返回 false，拦截执行
        if (result === false) {
          return false;
        }

        // 语义 2: 返回 consumed 对象，短路返回
        if (result && typeof result === 'object' && result.consumed) {
          ctx.consumed = true;
          ctx.result = result.result;
          return false;
        }
      } catch (error) {
        logger.error(`[HookManager] Hook "${hook.name}" execution failed:`, error);
        // 除非是关键逻辑，否则不应因为单个 Hook 失败而中断主链
      }
    }

    return true;
  }

  /**
   * 根据命名空间批量卸载钩子 (用于插件热重载)
   * @param {string} namespace 
   */
  /**
   * 根据名称卸载单个钩子 (用于热重载覆盖)
   * @param {string} name 
   */
  unregister(name) {
    if (!name) return;
    for (const point in this.hooks) {
      this.hooks[point] = this.hooks[point].filter(h => h.name !== name);
    }
  }

  async unregisterByNamespace(namespace) {
    if (!namespace) return;

    for (const point in this.hooks) {
      const remaining = [];
      const targets = [];

      for (const hook of this.hooks[point]) {
        if (hook.namespace === namespace) {
          targets.push(hook);
        } else {
          remaining.push(hook);
        }
      }

      this.hooks[point] = remaining;

      // 执行清理逻辑
      for (const hook of targets) {
        try {
          await hook.destroy();
        } catch (e) {
          logger.error(`[HookManager] Error destroying hook "${hook.name}":`, e);
        }
      }
    }
  }

  /**
   * 合并另一个管理器中的钩子 (不合并已存在的同名 Hook)
   * @param {HookManager} otherManager 
   */
  absorb(otherManager) {
    if (!otherManager || !otherManager.hooks) return;

    for (const point in otherManager.hooks) {
      if (!this.hooks[point]) this.hooks[point] = [];
      
      const newHooks = otherManager.hooks[point];
      for (const hook of newHooks) {
        // 简单的去重逻辑：相同 namespace 下的同名 hook 不重复注册
        const exists = this.hooks[point].some(h => h.name === hook.name && h.namespace === hook.namespace);
        if (!exists) {
          this.hooks[point].push(hook);
        }
      }
      
      // 重新排序
      this.hooks[point].sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * 列出所有已注册的钩子 (调试用)
   */
  list() {
    const list = {};
    for (const point in this.hooks) {
      list[point] = this.hooks[point].map(h => ({
        name: h.name,
        priority: h.priority,
        namespace: h.namespace,
        enabled: h.enabled
      }));
    }
    return list;
  }
}
