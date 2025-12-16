/**
 * LogFilter - 日志过滤器类
 * 提供高级的日志过滤、搜索和高亮功能
 */
export class LogFilter {
  constructor(options = {}) {
    this.config = {
      // 日志级别优先级映射
      levels: {
        ERROR: 0,
        WARN: 1,
        MARK: 2,
        INFO: 3,
        DEBUG: 4
      },
      // 默认高亮标签
      highlightTags: {
        start: '<mark>',
        end: '</mark>'
      },
      // 搜索选项
      searchOptions: {
        caseSensitive: false,
        wholeWord: false,
        regex: false
      },
      ...options
    }
  }

  /**
   * 按日志级别过滤
   * @param {Array} logs - 日志数组
   * @param {string} level - 目标日志级别
   * @returns {Array} 过滤后的日志
   */
  filterByLevel(logs, level) {
    if (!level || !Array.isArray(logs)) {
      return logs
    }

    const targetLevel = this.config.levels[level.toUpperCase()]
    if (targetLevel === undefined) {
      return logs
    }

    return logs.filter(log => {
      const logLevel = this.config.levels[log.level?.toUpperCase()]
      return logLevel !== undefined && logLevel <= targetLevel
    })
  }

  /**
   * 按模块过滤
   * @param {Array} logs - 日志数组
   * @param {string|Array} modules - 模块名称或模块数组
   * @returns {Array} 过滤后的日志
   */
  filterByModule(logs, modules) {
    if (!modules || !Array.isArray(logs)) {
      return logs
    }

    const moduleArray = Array.isArray(modules) ? modules : [modules]
    if (moduleArray.length === 0) {
      return logs
    }

    return logs.filter(log => {
      return log.module && moduleArray.includes(log.module)
    })
  }

  /**
   * 按时间范围过滤
   * @param {Array} logs - 日志数组
   * @param {Date|string} startTime - 开始时间
   * @param {Date|string} endTime - 结束时间
   * @returns {Array} 过滤后的日志
   */
  filterByTimeRange(logs, startTime, endTime) {
    if (!Array.isArray(logs)) {
      return logs
    }

    if (!startTime && !endTime) {
      return logs
    }

    const start = startTime ? new Date(startTime) : null
    const end = endTime ? new Date(endTime) : null

    return logs.filter(log => {
      if (!log.timestamp) {
        return false
      }

      const logTime = new Date(log.timestamp)
      
      if (start && logTime < start) {
        return false
      }
      
      if (end && logTime > end) {
        return false
      }

      return true
    })
  }

  /**
   * 关键词搜索
   * @param {Array} logs - 日志数组
   * @param {string} keyword - 搜索关键词
   * @param {Object} options - 搜索选项
   * @returns {Array} 包含关键词的日志
   */
  searchByKeyword(logs, keyword, options = {}) {
    if (!keyword || !Array.isArray(logs)) {
      return logs
    }

    const searchOptions = {
      ...this.config.searchOptions,
      ...options
    }

    // 准备搜索模式
    let searchPattern
    if (searchOptions.regex) {
      try {
        const flags = searchOptions.caseSensitive ? 'g' : 'gi'
        searchPattern = new RegExp(keyword, flags)
      } catch {
        // 如果正则表达式无效，回退到普通搜索
        searchPattern = null
      }
    }

    const searchTerm = searchOptions.caseSensitive ? keyword : keyword.toLowerCase()

    return logs.filter(log => {
      // 构建可搜索的文本
      const searchableFields = [
        log.message,
        log.module,
        log.caller,
        log.level
      ].filter(Boolean)

      const searchableText = searchableFields.join(' ')
      
      if (searchPattern) {
        // 正则表达式搜索
        return searchPattern.test(searchableText)
      } else if (searchOptions.wholeWord) {
        // 全词匹配
        const text = searchOptions.caseSensitive ? searchableText : searchableText.toLowerCase()
        const wordBoundaryPattern = new RegExp(`\\b${this.escapeRegExp(searchTerm)}\\b`, searchOptions.caseSensitive ? 'g' : 'gi')
        return wordBoundaryPattern.test(text)
      } else {
        // 普通包含搜索
        const text = searchOptions.caseSensitive ? searchableText : searchableText.toLowerCase()
        return text.includes(searchTerm)
      }
    })
  }

  /**
   * 高亮搜索关键词
   * @param {string} text - 原始文本
   * @param {string} keyword - 搜索关键词
   * @param {Object} options - 高亮选项
   * @returns {string} 高亮后的文本
   */
  highlightKeyword(text, keyword, options = {}) {
    if (!text || !keyword) {
      return text
    }

    const highlightOptions = {
      ...this.config.searchOptions,
      ...options
    }

    const tags = {
      ...this.config.highlightTags,
      ...options.tags
    }

    let result = text

    try {
      if (highlightOptions.regex) {
        // 正则表达式高亮
        const flags = highlightOptions.caseSensitive ? 'g' : 'gi'
        const pattern = new RegExp(keyword, flags)
        result = text.replace(pattern, match => `${tags.start}${match}${tags.end}`)
      } else if (highlightOptions.wholeWord) {
        // 全词高亮
        const flags = highlightOptions.caseSensitive ? 'g' : 'gi'
        const pattern = new RegExp(`\\b${this.escapeRegExp(keyword)}\\b`, flags)
        result = text.replace(pattern, match => `${tags.start}${match}${tags.end}`)
      } else {
        // 普通高亮
        const flags = highlightOptions.caseSensitive ? 'g' : 'gi'
        const pattern = new RegExp(this.escapeRegExp(keyword), flags)
        result = text.replace(pattern, match => `${tags.start}${match}${tags.end}`)
      }
    } catch {
      // 如果高亮失败，返回原始文本
      return text
    }

    return result
  }

  /**
   * 高亮日志条目中的关键词
   * @param {Object} logEntry - 日志条目
   * @param {string} keyword - 搜索关键词
   * @param {Object} options - 高亮选项
   * @returns {Object} 高亮后的日志条目
   */
  highlightLogEntry(logEntry, keyword, options = {}) {
    if (!logEntry || !keyword) {
      return logEntry
    }

    const highlightedEntry = { ...logEntry }

    // 高亮消息内容
    if (highlightedEntry.message) {
      highlightedEntry.message = this.highlightKeyword(highlightedEntry.message, keyword, options)
    }

    // 高亮模块名称
    if (highlightedEntry.module) {
      highlightedEntry.module = this.highlightKeyword(highlightedEntry.module, keyword, options)
    }

    // 高亮调用者信息
    if (highlightedEntry.caller) {
      highlightedEntry.caller = this.highlightKeyword(highlightedEntry.caller, keyword, options)
    }

    return highlightedEntry
  }

  /**
   * 综合过滤方法
   * @param {Array} logs - 日志数组
   * @param {Object} filters - 过滤条件
   * @returns {Array} 过滤后的日志
   */
  applyFilters(logs, filters = {}) {
    if (!Array.isArray(logs)) {
      return []
    }

    let filteredLogs = [...logs]

    // 按日志级别过滤
    if (filters.level) {
      filteredLogs = this.filterByLevel(filteredLogs, filters.level)
    }

    // 按模块过滤
    if (filters.modules && filters.modules.length > 0) {
      filteredLogs = this.filterByModule(filteredLogs, filters.modules)
    }

    // 按时间范围过滤
    if (filters.startTime || filters.endTime) {
      filteredLogs = this.filterByTimeRange(filteredLogs, filters.startTime, filters.endTime)
    }

    // 关键词搜索
    if (filters.keyword) {
      filteredLogs = this.searchByKeyword(filteredLogs, filters.keyword, filters.searchOptions)
    }

    return filteredLogs
  }

  /**
   * 应用过滤并高亮
   * @param {Array} logs - 日志数组
   * @param {Object} filters - 过滤条件
   * @returns {Array} 过滤并高亮后的日志
   */
  filterAndHighlight(logs, filters = {}) {
    let filteredLogs = this.applyFilters(logs, filters)

    // 如果有关键词，进行高亮
    if (filters.keyword && filteredLogs.length > 0) {
      filteredLogs = filteredLogs.map(log => 
        this.highlightLogEntry(log, filters.keyword, filters.highlightOptions)
      )
    }

    return filteredLogs
  }

  /**
   * 按IP地址过滤
   * @param {Array} logs - 日志数组
   * @param {string|Array} ips - IP地址或IP数组
   * @returns {Array} 过滤后的日志
   */
  filterByIP(logs, ips) {
    if (!ips || !Array.isArray(logs)) {
      return logs
    }

    const ipArray = Array.isArray(ips) ? ips : [ips]
    if (ipArray.length === 0) {
      return logs
    }

    return logs.filter(log => {
      return log.ip && ipArray.includes(log.ip)
    })
  }

  /**
   * 按日志ID过滤
   * @param {Array} logs - 日志数组
   * @param {string|Array} ids - 日志ID或ID数组
   * @returns {Array} 过滤后的日志
   */
  filterByIds(logs, ids) {
    if (!ids || !Array.isArray(logs)) {
      return logs
    }

    const idArray = Array.isArray(ids) ? ids : [ids]
    if (idArray.length === 0) {
      return logs
    }

    return logs.filter(log => {
      return log.id && idArray.includes(log.id)
    })
  }

  /**
   * 自定义过滤器
   * @param {Array} logs - 日志数组
   * @param {Function} predicate - 过滤函数
   * @returns {Array} 过滤后的日志
   */
  filterByCustom(logs, predicate) {
    if (!Array.isArray(logs) || typeof predicate !== 'function') {
      return logs
    }

    return logs.filter(predicate)
  }

  /**
   * 排序日志
   * @param {Array} logs - 日志数组
   * @param {string} field - 排序字段
   * @param {string} order - 排序顺序 ('asc' | 'desc')
   * @returns {Array} 排序后的日志
   */
  sortLogs(logs, field = 'timestamp', order = 'desc') {
    if (!Array.isArray(logs)) {
      return logs
    }

    const sortedLogs = [...logs]

    sortedLogs.sort((a, b) => {
      let valueA = a[field]
      let valueB = b[field]

      // 处理时间戳
      if (field === 'timestamp') {
        valueA = new Date(valueA).getTime()
        valueB = new Date(valueB).getTime()
      }

      // 处理日志级别
      if (field === 'level') {
        valueA = this.config.levels[valueA] || 999
        valueB = this.config.levels[valueB] || 999
      }

      // 处理字符串
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        valueA = valueA.toLowerCase()
        valueB = valueB.toLowerCase()
      }

      if (order === 'asc') {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0
      } else {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0
      }
    })

    return sortedLogs
  }

  /**
   * 分页
   * @param {Array} logs - 日志数组
   * @param {number} page - 页码（从1开始）
   * @param {number} pageSize - 每页大小
   * @returns {Object} 分页结果
   */
  paginate(logs, page = 1, pageSize = 50) {
    if (!Array.isArray(logs)) {
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 0
      }
    }

    const total = logs.length
    const totalPages = Math.ceil(total / pageSize)
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize

    return {
      data: logs.slice(startIndex, endIndex),
      total,
      page,
      pageSize,
      totalPages
    }
  }

  /**
   * 获取日志统计信息
   * @param {Array} logs - 日志数组
   * @returns {Object} 统计信息
   */
  getLogStatistics(logs) {
    if (!Array.isArray(logs)) {
      return {}
    }

    const stats = {
      total: logs.length,
      byLevel: {},
      byModule: {},
      timeRange: {
        earliest: null,
        latest: null
      }
    }

    // 统计各级别日志数量
    Object.keys(this.config.levels).forEach(level => {
      stats.byLevel[level] = 0
    })

    // 统计各模块日志数量
    logs.forEach(log => {
      // 按级别统计
      if (log.level && stats.byLevel.hasOwnProperty(log.level)) {
        stats.byLevel[log.level]++
      }

      // 按模块统计
      if (log.module) {
        stats.byModule[log.module] = (stats.byModule[log.module] || 0) + 1
      }

      // 时间范围统计
      if (log.timestamp) {
        const logTime = new Date(log.timestamp)
        if (!stats.timeRange.earliest || logTime < stats.timeRange.earliest) {
          stats.timeRange.earliest = logTime
        }
        if (!stats.timeRange.latest || logTime > stats.timeRange.latest) {
          stats.timeRange.latest = logTime
        }
      }
    })

    return stats
  }

  /**
   * 转义正则表达式特殊字符
   * @param {string} string - 要转义的字符串
   * @returns {string} 转义后的字符串
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * 验证过滤条件
   * @param {Object} filters - 过滤条件
   * @returns {Object} 验证结果
   */
  validateFilters(filters) {
    const errors = []
    const warnings = []

    if (filters.level && !this.config.levels.hasOwnProperty(filters.level.toUpperCase())) {
      errors.push(`无效的日志级别: ${filters.level}`)
    }

    if (filters.startTime && filters.endTime) {
      const start = new Date(filters.startTime)
      const end = new Date(filters.endTime)
      if (start > end) {
        errors.push('开始时间不能晚于结束时间')
      }
    }

    if (filters.keyword && filters.searchOptions?.regex) {
      try {
        new RegExp(filters.keyword)
      } catch {
        errors.push(`无效的正则表达式: ${filters.keyword}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 重置配置
   */
  resetConfig() {
    this.config = {
      levels: {
        ERROR: 0,
        WARN: 1,
        MARK: 2,
        INFO: 3,
        DEBUG: 4
      },
      highlightTags: {
        start: '<mark>',
        end: '</mark>'
      },
      searchOptions: {
        caseSensitive: false,
        wholeWord: false,
        regex: false
      }
    }
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    }
  }
}

export default LogFilter