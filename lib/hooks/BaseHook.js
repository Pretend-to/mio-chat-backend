/**
 * Hook 基类
 * 所有内置 Hook 和插件自定义 Hook 必须继承此类
 */
export default class BaseHook {
  constructor(options = {}) {
    /** @type {string} 钩子名称 */
    this.name = options.name || 'unnamed-hook';
    
    /** @type {string} 钩子描述 */
    this.description = options.description || '';
    
    /** @type {string} 挂载点 (来自 HOOK_POINTS) */
    this.hookPoint = options.hookPoint;
    
    /** @type {number} 优先级 (0-100)，越大越先执行 */
    this.priority = options.priority ?? 50;
    
    /** @type {string} 命名空间 (插件名或 '__builtin__') */
    this.namespace = options.namespace || '';
    
    /** @type {boolean} 是否启用 */
    this.enabled = true;

    if (!this.hookPoint) {
      throw new Error(`Hook "${this.name}" must specify a hookPoint.`);
    }
  }

  /**
   * 执行钩子逻辑
   * @param {object} ctx 执行上下文
   * @returns {Promise<boolean|object|void>} 
   *    - 返回 false: 中断 Hook 链并拦截核心逻辑执行
   *    - 返回 { consumed: true, result }: 中断 Hook 链并直接返回 result (短路)
   *    - 返回 undefined/true: 继续执行下一钩子
   */
  async execute(ctx) {
    throw new Error(`Hook "${this.name}" must implement execute() method.`);
  }

  /**
   * 注册时的初始化逻辑 (可选)
   */
  async initialize() {}

  /**
   * 销毁或卸载时的清理逻辑 (可选)
   */
  async destroy() {}
}
