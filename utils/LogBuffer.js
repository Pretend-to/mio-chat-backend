/**
 * LogBuffer - 循环缓冲区实现
 * 用于高效管理内存中的日志条目，支持自动清理和快速查询
 */
export class LogBuffer {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000
    this.buffer = []
    this.currentIndex = 0
    this.totalCount = 0
    this.isFull = false
  }

  /**
   * 添加日志条目到缓冲区
   * @param {Object} logEntry - 日志条目对象
   */
  addLog(logEntry) {
    // 确保日志条目有唯一ID和时间戳
    const entry = {
      id: logEntry.id || this.generateId(),
      timestamp: logEntry.timestamp || new Date(),
      level: logEntry.level,
      module: logEntry.module,
      message: logEntry.message,
      caller: logEntry.caller,
      ip: logEntry.ip,
      extra: logEntry.extra || {}
    }

    // 循环缓冲区逻辑
    this.buffer[this.currentIndex] = entry
    this.currentIndex = (this.currentIndex + 1) % this.maxSize
    this.totalCount++

    // 标记缓冲区是否已满
    if (this.totalCount >= this.maxSize) {
      this.isFull = true
    }

    return entry
  }

  /**
   * 获取指定范围的日志条目
   * @param {number} startIndex - 起始索引
   * @param {number} endIndex - 结束索引
   * @returns {Array} 日志条目数组
   */
  getLogs(startIndex = 0, endIndex = -1) {
    const logs = this.getAllLogs()
    
    if (endIndex === -1) {
      endIndex = logs.length
    }

    return logs.slice(startIndex, endIndex)
  }

  /**
   * 获取所有日志条目（按时间顺序）
   * @returns {Array} 所有日志条目
   */
  getAllLogs() {
    if (!this.isFull) {
      // 缓冲区未满，直接返回已有条目
      return this.buffer.slice(0, this.currentIndex)
    } else {
      // 缓冲区已满，需要重新排序
      const olderLogs = this.buffer.slice(this.currentIndex)
      const newerLogs = this.buffer.slice(0, this.currentIndex)
      return [...olderLogs, ...newerLogs]
    }
  }

  /**
   * 按条件过滤日志
   * @param {Function} predicate - 过滤函数
   * @returns {Array} 过滤后的日志条目
   */
  filterLogs(predicate) {
    return this.getAllLogs().filter(predicate)
  }

  /**
   * 按日志级别过滤
   * @param {string} level - 日志级别
   * @returns {Array} 过滤后的日志条目
   */
  filterByLevel(level) {
    const levels = {
      ERROR: 0,
      WARN: 1,
      MARK: 2,
      INFO: 3,
      DEBUG: 4
    }

    const targetLevel = levels[level] || 3
    return this.filterLogs(log => levels[log.level] <= targetLevel)
  }

  /**
   * 按模块过滤
   * @param {string|Array} modules - 模块名称或模块数组
   * @returns {Array} 过滤后的日志条目
   */
  filterByModule(modules) {
    const moduleArray = Array.isArray(modules) ? modules : [modules]
    return this.filterLogs(log => moduleArray.includes(log.module))
  }

  /**
   * 按时间范围过滤
   * @param {Date} startTime - 开始时间
   * @param {Date} endTime - 结束时间
   * @returns {Array} 过滤后的日志条目
   */
  filterByTimeRange(startTime, endTime) {
    return this.filterLogs(log => {
      const logTime = new Date(log.timestamp)
      return logTime >= startTime && logTime <= endTime
    })
  }

  /**
   * 搜索包含关键词的日志
   * @param {string} keyword - 搜索关键词
   * @returns {Array} 包含关键词的日志条目
   */
  searchLogs(keyword) {
    const lowerKeyword = keyword.toLowerCase()
    return this.filterLogs(log => 
      log.message.toLowerCase().includes(lowerKeyword) ||
      (log.module && log.module.toLowerCase().includes(lowerKeyword)) ||
      (log.caller && log.caller.toLowerCase().includes(lowerKeyword))
    )
  }

  /**
   * 清理缓冲区（重置到初始状态）
   */
  cleanup() {
    this.buffer = []
    this.currentIndex = 0
    this.totalCount = 0
    this.isFull = false
  }

  /**
   * 获取缓冲区统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      maxSize: this.maxSize,
      currentSize: this.isFull ? this.maxSize : this.currentIndex,
      totalCount: this.totalCount,
      isFull: this.isFull,
      oldestIndex: this.isFull ? this.currentIndex : 0,
      newestIndex: this.isFull ? (this.currentIndex - 1 + this.maxSize) % this.maxSize : this.currentIndex - 1
    }
  }

  /**
   * 调整缓冲区大小
   * @param {number} newSize - 新的缓冲区大小
   */
  resize(newSize) {
    if (newSize <= 0) {
      throw new Error('缓冲区大小必须大于0')
    }

    const currentLogs = this.getAllLogs()
    this.maxSize = newSize
    this.buffer = []
    this.currentIndex = 0
    this.totalCount = 0
    this.isFull = false

    // 重新添加日志（保留最新的条目）
    const logsToKeep = currentLogs.slice(-newSize)
    logsToKeep.forEach(log => this.addLog(log))
  }

  /**
   * 生成唯一ID
   * @returns {string} 唯一标识符
   */
  generateId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取最新的N条日志
   * @param {number} count - 日志数量
   * @returns {Array} 最新的日志条目
   */
  getLatestLogs(count) {
    const allLogs = this.getAllLogs()
    return allLogs.slice(-count)
  }

  /**
   * 获取最旧的N条日志
   * @param {number} count - 日志数量
   * @returns {Array} 最旧的日志条目
   */
  getOldestLogs(count) {
    const allLogs = this.getAllLogs()
    return allLogs.slice(0, count)
  }

  /**
   * 检查缓冲区是否为空
   * @returns {boolean} 是否为空
   */
  isEmpty() {
    return this.totalCount === 0
  }

  /**
   * 检查缓冲区是否已满
   * @returns {boolean} 是否已满
   */
  isBufferFull() {
    return this.isFull
  }
}

export default LogBuffer