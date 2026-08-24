/**
 * 通用滑动窗口限流器（纯基础设施，与业务解耦）
 *
 * 用法：
 *   const limiter = new SlidingWindowLimiter({ windowMs: 3600_000 })
 *   const r = limiter.consume('user:123', 20)   // 检查并计数
 *   // r.allowed === false 时，r.retryAfterMs 表示"最早可再次调用还需等待的毫秒数"
 *
 * 支持两种调用模式：
 *   - consume(key, limit)：检查 + 计数一步完成（"允许 N 次"语义）
 *   - check(key, limit) / hit(key)：分离模式，适合"多维度都通过才计数"的场景
 *     （被拦截的那次调用不消耗任何维度配额）
 *
 * 存储为进程内存滑动窗口。单实例部署可用；多实例需替换为 Redis 等外部存储。
 */
export class SlidingWindowLimiter {
  /**
   * @param {object} [options]
   * @param {number} [options.windowMs=60000] 窗口时长（毫秒）
   * @param {number} [options.cleanupIntervalMs=600000] 自动清理过期 key 的最小间隔（毫秒）
   */
  constructor(options = {}) {
    this.windowMs = options.windowMs ?? 60_000
    this._cleanupIntervalMs = options.cleanupIntervalMs ?? 10 * 60_000
    /** @type {Map<string, number[]>} key -> 升序时间戳数组 */
    this._hits = new Map()
    this._lastCleanup = Date.now()
  }

  /**
   * 取窗口内的命中列表（顺带清理窗口外旧记录，空 key 直接删除防止泄漏）
   * @private
   */
  _windowList(key, now) {
    const list = (this._hits.get(key) || []).filter(t => now - t < this.windowMs)
    if (list.length === 0) this._hits.delete(key)
    else this._hits.set(key, list)
    return list
  }

  /**
   * 只读检查：当前 key 是否超限（不计数）
   * @returns {{allowed: boolean, count: number, limit: number, retryAfterMs: number, windowMs: number}}
   */
  check(key, limit, now = Date.now()) {
    const list = this._windowList(key, now)
    if (list.length >= limit) {
      // 滑动窗口语义：最早一次命中 + 窗口期 = 可再次调用的时刻
      const retryAfterMs = Math.max(0, list[0] + this.windowMs - now)
      return { allowed: false, count: list.length, limit, retryAfterMs, windowMs: this.windowMs }
    }
    return { allowed: true, count: list.length, limit, retryAfterMs: 0, windowMs: this.windowMs }
  }

  /**
   * 记录一次命中（调用前应已通过 check，或使用 consume）
   */
  hit(key, now = Date.now()) {
    const list = this._windowList(key, now)
    list.push(now)
    this._hits.set(key, list)
  }

  /**
   * 检查并计数一步完成
   * @returns 同 check()；allowed=false 时不会计数
   */
  consume(key, limit, now = Date.now()) {
    const result = this.check(key, limit, now)
    if (result.allowed) this.hit(key, now)
    return result
  }

  /**
   * 查询当前窗口命中数（只读，不计数）
   */
  peek(key, now = Date.now()) {
    return this._windowList(key, now).length
  }

  /**
   * 强制清理所有窗口外记录（一般无需手动，check/hit 已顺带清理）
   */
  cleanup(now = Date.now()) {
    for (const key of this._hits.keys()) {
      this._windowList(key, now)
    }
  }

  /** 当前活跃 key 数（调试用） */
  get size() {
    return this._hits.size
  }
}