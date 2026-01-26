import logStreamService from '../services/logStream.js'
import LogFilter from '../services/logFilter.js'
import logger from '../../../../utils/logger.js'


/**
 * LogStreamController - 日志流控制器
 * 处理日志订阅、搜索、导出和配置管理的 Socket.IO 事件
 */
export class LogStreamController {
  constructor() {
    this.logFilter = new LogFilter()
    this.activeExports = new Map() // 跟踪活跃的导出任务
    this.exportCounter = 0
  }

  /**
   * 处理日志订阅请求
   * @param {Object} socket - Socket.IO socket 实例
   * @param {Object} data - 订阅数据
   * @param {string} requestId - 请求ID
   */
  handleLogSubscription(socket, data, requestId) {
    try {
      // 验证权限
      if (!this.validateAdminPermission(socket)) {
        this.sendError(socket, requestId, 'PERMISSION_DENIED', '权限不足，只有管理员可以查看日志')
        return
      }

      // 验证订阅参数
      const validation = this.validateSubscriptionOptions(data)
      if (!validation.valid) {
        this.sendError(socket, requestId, 'INVALID_PARAMS', validation.errors.join(', '))
        return
      }

      const clientId = this.getClientId(socket)
      const options = {
        level: data.level || 'INFO',
        modules: data.modules || [],
        realtime: data.realtime !== false,
        bufferSize: Math.min(data.bufferSize || 1000, 5000), // 限制最大缓冲区大小
        searchQuery: data.searchQuery || null,
        timeRange: data.timeRange || null,
        sendHistory: data.sendHistory !== false
      }

      // 执行订阅
      const result = logStreamService.subscribe(clientId, socket, options)

      if (result.success) {
        this.sendSuccess(socket, requestId, 'SUBSCRIBED', {
          clientId: result.clientId,
          subscriberCount: result.subscriberCount,
          bufferStats: result.bufferStats,
          options: options
        })

        logger.info(`客户端 ${clientId} 成功订阅日志流`, { 
          ip: socket.userInfo?.ip,
          options 
        })
      } else {
        this.sendError(socket, requestId, 'SUBSCRIPTION_FAILED', result.error)
      }

    } catch (error) {
      logger.error('处理日志订阅请求失败', error, { 
        clientId: this.getClientId(socket),
        data 
      })
      this.sendError(socket, requestId, 'INTERNAL_ERROR', '订阅处理失败')
    }
  }

  /**
   * 处理取消订阅请求
   * @param {Object} socket - Socket.IO socket 实例
   * @param {Object} data - 请求数据
   * @param {string} requestId - 请求ID
   */
  handleLogUnsubscription(socket, data, requestId) {
    try {
      const clientId = this.getClientId(socket)
      const success = logStreamService.unsubscribe(clientId)

      if (success) {
        this.sendSuccess(socket, requestId, 'UNSUBSCRIBED', { clientId })
        logger.info(`客户端 ${clientId} 已取消订阅日志流`)
      } else {
        this.sendError(socket, requestId, 'NOT_SUBSCRIBED', '客户端未订阅日志流')
      }

    } catch (error) {
      logger.error('处理取消订阅请求失败', error, { 
        clientId: this.getClientId(socket) 
      })
      this.sendError(socket, requestId, 'INTERNAL_ERROR', '取消订阅处理失败')
    }
  }

  /**
   * 处理日志搜索请求
   * @param {Object} socket - Socket.IO socket 实例
   * @param {Object} data - 搜索数据
   * @param {string} requestId - 请求ID
   */
  handleLogSearch(socket, data, requestId) {
    try {
      // 验证权限
      if (!this.validateAdminPermission(socket)) {
        this.sendError(socket, requestId, 'PERMISSION_DENIED', '权限不足，只有管理员可以搜索日志')
        return
      }

      // 验证搜索参数
      const validation = this.validateSearchQuery(data)
      if (!validation.valid) {
        this.sendError(socket, requestId, 'INVALID_PARAMS', validation.errors.join(', '))
        return
      }

      const clientId = this.getClientId(socket)
      const query = {
        keyword: data.keyword || '',
        level: data.level || null,
        modules: data.modules || [],
        timeRange: data.timeRange || null,
        page: Math.max(1, data.page || 1),
        pageSize: Math.min(data.pageSize || 50, 200), // 限制最大页面大小
        sortBy: data.sortBy || 'timestamp',
        sortOrder: data.sortOrder || 'desc'
      }

      // 执行搜索
      const result = logStreamService.searchLogs(clientId, query)

      if (result.success) {
        // 如果有关键词，进行高亮处理
        if (query.keyword) {
          result.data.logs = result.data.logs.map(log => 
            this.logFilter.highlightLogEntry(log, query.keyword)
          )
        }

        this.sendSuccess(socket, requestId, 'SEARCH_RESULTS', result.data)

        logger.debug(`客户端 ${clientId} 搜索日志`, {
          query,
          resultCount: result.data.logs.length
        })
      } else {
        this.sendError(socket, requestId, 'SEARCH_FAILED', result.error)
      }

    } catch (error) {
      logger.error('处理日志搜索请求失败', error, { 
        clientId: this.getClientId(socket),
        data 
      })
      this.sendError(socket, requestId, 'INTERNAL_ERROR', '搜索处理失败')
    }
  }

  /**
   * 处理日志导出请求
   * @param {Object} socket - Socket.IO socket 实例
   * @param {Object} data - 导出数据
   * @param {string} requestId - 请求ID
   */
  handleLogExport(socket, data, requestId) {
    try {
      // 验证权限
      if (!this.validateAdminPermission(socket)) {
        this.sendError(socket, requestId, 'PERMISSION_DENIED', '权限不足，只有管理员可以导出日志')
        return
      }

      // 验证导出参数
      const validation = this.validateExportOptions(data)
      if (!validation.valid) {
        this.sendError(socket, requestId, 'INVALID_PARAMS', validation.errors.join(', '))
        return
      }

      const clientId = this.getClientId(socket)
      const exportId = `export_${++this.exportCounter}_${Date.now()}`
      
      const exportOptions = {
        format: data.format || 'json',
        filters: {
          level: data.level || null,
          modules: data.modules || [],
          keyword: data.keyword || null,
          timeRange: data.timeRange || null
        },
        maxRecords: Math.min(data.maxRecords || 10000, 50000), // 限制最大导出记录数
        includeMetadata: data.includeMetadata !== false
      }

      // 记录审计日志
      this.logAuditAction(socket, 'LOG_EXPORT', {
        exportId,
        options: exportOptions
      })

      // 开始导出处理
      this.processLogExport(socket, requestId, exportId, exportOptions)
        .then(result => {
          if (result.success) {
            this.sendSuccess(socket, requestId, 'EXPORT_COMPLETED', {
              exportId,
              ...result.data
            })
          } else {
            this.sendError(socket, requestId, 'EXPORT_FAILED', result.error)
          }
        })
        .catch(error => {
          logger.error('日志导出处理失败', error, { clientId, exportId })
          this.sendError(socket, requestId, 'EXPORT_FAILED', '导出处理异常')
        })
        .finally(() => {
          this.activeExports.delete(exportId)
        })

      // 立即返回导出开始响应
      this.sendSuccess(socket, requestId, 'EXPORT_STARTED', {
        exportId,
        message: '导出任务已开始，请等待完成通知'
      })

    } catch (error) {
      logger.error('处理日志导出请求失败', error, { 
        clientId: this.getClientId(socket),
        data 
      })
      this.sendError(socket, requestId, 'INTERNAL_ERROR', '导出处理失败')
    }
  }

  /**
   * 处理配置更新请求
   * @param {Object} socket - Socket.IO socket 实例
   * @param {Object} data - 配置数据
   * @param {string} requestId - 请求ID
   */
  handleConfigUpdate(socket, data, requestId) {
    try {
      // 验证权限
      if (!this.validateAdminPermission(socket)) {
        this.sendError(socket, requestId, 'PERMISSION_DENIED', '权限不足，只有管理员可以更新配置')
        return
      }

      // 验证配置参数
      const validation = this.validateConfigOptions(data)
      if (!validation.valid) {
        this.sendError(socket, requestId, 'INVALID_PARAMS', validation.errors.join(', '))
        return
      }

      const clientId = this.getClientId(socket)
      const configType = data.type
      const configValue = data.value

      // 记录审计日志
      this.logAuditAction(socket, 'CONFIG_UPDATE', {
        type: configType,
        value: configValue
      })

      let success = false
      let message = ''

      switch (configType) {
        case 'bufferSize':
          // 更新缓冲区大小
          success = this.updateBufferSize(configValue)
          message = success ? '缓冲区大小已更新' : '缓冲区大小更新失败'
          break

        case 'refreshRate':
          // 更新刷新频率
          success = this.updateRefreshRate(clientId, configValue)
          message = success ? '刷新频率已更新' : '刷新频率更新失败'
          break

        case 'logSources':
          // 更新日志源配置
          success = this.updateLogSources(clientId, configValue)
          message = success ? '日志源配置已更新' : '日志源配置更新失败'
          break

        case 'filterSettings':
          // 更新过滤器设置
          success = this.updateFilterSettings(clientId, configValue)
          message = success ? '过滤器设置已更新' : '过滤器设置更新失败'
          break

        default:
          this.sendError(socket, requestId, 'INVALID_CONFIG_TYPE', `不支持的配置类型: ${configType}`)
          return
      }

      if (success) {
        this.sendSuccess(socket, requestId, 'CONFIG_UPDATED', {
          type: configType,
          value: configValue,
          message
        })

        logger.info(`客户端 ${clientId} 更新配置`, {
          type: configType,
          value: configValue
        })
      } else {
        this.sendError(socket, requestId, 'CONFIG_UPDATE_FAILED', message)
      }

    } catch (error) {
      logger.error('处理配置更新请求失败', error, { 
        clientId: this.getClientId(socket),
        data 
      })
      this.sendError(socket, requestId, 'INTERNAL_ERROR', '配置更新处理失败')
    }
  }

  /**
   * 处理获取日志统计请求
   * @param {Object} socket - Socket.IO socket 实例
   * @param {Object} data - 请求数据
   * @param {string} requestId - 请求ID
   */
  handleGetLogStats(socket, data, requestId) {
    try {
      // 验证权限
      if (!this.validateAdminPermission(socket)) {
        this.sendError(socket, requestId, 'PERMISSION_DENIED', '权限不足，只有管理员可以查看统计信息')
        return
      }

      const stats = logStreamService.getLogStats()
      
      this.sendSuccess(socket, requestId, 'LOG_STATS', stats)

    } catch (error) {
      logger.error('获取日志统计失败', error, { 
        clientId: this.getClientId(socket) 
      })
      this.sendError(socket, requestId, 'INTERNAL_ERROR', '获取统计信息失败')
    }
  }

  /**
   * 验证管理员权限
   * @param {Object} socket - Socket.IO socket 实例
   * @returns {boolean} 是否有管理员权限
   */
  validateAdminPermission(socket) {
    return socket.userInfo && socket.userInfo.isAdmin === true
  }

  /**
   * 验证订阅选项
   * @param {Object} options - 订阅选项
   * @returns {Object} 验证结果
   */
  validateSubscriptionOptions(options) {
    const errors = []

    if (options.level && !['ERROR', 'WARN', 'MARK', 'INFO', 'DEBUG'].includes(options.level)) {
      errors.push(`无效的日志级别: ${options.level}`)
    }

    if (options.bufferSize && (options.bufferSize < 10 || options.bufferSize > 5000)) {
      errors.push('缓冲区大小必须在 10-5000 之间')
    }

    if (options.modules && !Array.isArray(options.modules)) {
      errors.push('模块列表必须是数组')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证搜索查询
   * @param {Object} query - 搜索查询
   * @returns {Object} 验证结果
   */
  validateSearchQuery(query) {
    const errors = []

    if (query.page && (query.page < 1 || query.page > 10000)) {
      errors.push('页码必须在 1-10000 之间')
    }

    if (query.pageSize && (query.pageSize < 1 || query.pageSize > 200)) {
      errors.push('页面大小必须在 1-200 之间')
    }

    if (query.level && !['ERROR', 'WARN', 'MARK', 'INFO', 'DEBUG'].includes(query.level)) {
      errors.push(`无效的日志级别: ${query.level}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证导出选项
   * @param {Object} options - 导出选项
   * @returns {Object} 验证结果
   */
  validateExportOptions(options) {
    const errors = []

    if (options.format && !['json', 'csv', 'txt'].includes(options.format)) {
      errors.push(`不支持的导出格式: ${options.format}`)
    }

    if (options.maxRecords && (options.maxRecords < 1 || options.maxRecords > 50000)) {
      errors.push('最大记录数必须在 1-50000 之间')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证配置选项
   * @param {Object} config - 配置选项
   * @returns {Object} 验证结果
   */
  validateConfigOptions(config) {
    const errors = []

    if (!config.type) {
      errors.push('配置类型不能为空')
    }

    if (config.value === undefined || config.value === null) {
      errors.push('配置值不能为空')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 处理日志导出
   * @param {Object} socket - Socket.IO socket 实例
   * @param {string} requestId - 请求ID
   * @param {string} exportId - 导出ID
   * @param {Object} options - 导出选项
   * @returns {Promise<Object>} 导出结果
   */
  async processLogExport(socket, requestId, exportId, options) {
    try {
      // 标记导出任务为活跃状态
      this.activeExports.set(exportId, {
        socket,
        requestId,
        startTime: new Date(),
        status: 'processing'
      })

      // 获取要导出的日志
      const clientId = this.getClientId(socket)
      const searchResult = logStreamService.searchLogs(clientId, {
        ...options.filters,
        page: 1,
        pageSize: options.maxRecords
      })

      if (!searchResult.success) {
        throw new Error(searchResult.error)
      }

      const logs = searchResult.data.logs
      let exportData

      // 根据格式生成导出数据
      switch (options.format) {
        case 'json':
          exportData = this.generateJSONExport(logs, options)
          break
        case 'csv':
          exportData = this.generateCSVExport(logs, options)
          break
        case 'txt':
          exportData = this.generateTXTExport(logs, options)
          break
        default:
          throw new Error(`不支持的导出格式: ${options.format}`)
      }

      return {
        success: true,
        data: {
          format: options.format,
          recordCount: logs.length,
          size: exportData.length,
          data: exportData,
          generatedAt: new Date().toISOString()
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 生成 JSON 格式导出
   * @param {Array} logs - 日志数组
   * @param {Object} options - 导出选项
   * @returns {string} JSON 字符串
   */
  generateJSONExport(logs, _options) {
    const exportObject = {
      metadata: _options.includeMetadata ? {
        exportedAt: new Date().toISOString(),
        recordCount: logs.length,
        filters: _options.filters,
        version: '1.0'
      } : undefined,
      logs: logs
    }

    return JSON.stringify(exportObject, null, 2)
  }

  /**
   * 生成 CSV 格式导出
   * @param {Array} logs - 日志数组
   * @param {Object} options - 导出选项
   * @returns {string} CSV 字符串
   */
  generateCSVExport(logs, _options) {
    const headers = ['timestamp', 'level', 'module', 'message', 'caller', 'ip']
    let csv = headers.join(',') + '\n'

    logs.forEach(log => {
      const row = headers.map(header => {
        const value = log[header] || ''
        // 转义 CSV 特殊字符
        return `"${String(value).replace(/"/g, '""')}"`
      })
      csv += row.join(',') + '\n'
    })

    return csv
  }

  /**
   * 生成 TXT 格式导出
   * @param {Array} logs - 日志数组
   * @param {Object} options - 导出选项
   * @returns {string} TXT 字符串
   */
  generateTXTExport(logs, _options) {
    let txt = ''

    if (_options.includeMetadata) {
      txt += '# 日志导出文件\n'
      txt += `# 导出时间: ${new Date().toISOString()}\n`
      txt += `# 记录数量: ${logs.length}\n`
      txt += `# 过滤条件: ${JSON.stringify(_options.filters)}\n`
      txt += '\n'
    }

    logs.forEach(log => {
      txt += `[${log.timestamp}] [${log.level}] [${log.module || 'UNKNOWN'}] ${log.message}`
      if (log.caller) {
        txt += ` (${log.caller})`
      }
      if (log.ip) {
        txt += ` [IP: ${log.ip}]`
      }
      txt += '\n'
    })

    return txt
  }

  /**
   * 更新缓冲区大小
   * @param {number} size - 新的缓冲区大小
   * @returns {boolean} 是否成功
   */
  updateBufferSize(size) {
    try {
      // 这里应该更新 LogBuffer 的配置
      // 由于 LogBuffer 可能需要重新初始化，这里只是示例
      logger.info(`缓冲区大小更新为: ${size}`)
      return true
    } catch (error) {
      logger.error('更新缓冲区大小失败', error)
      return false
    }
  }

  /**
   * 更新刷新频率
   * @param {string} clientId - 客户端ID
   * @param {number} rate - 刷新频率（毫秒）
   * @returns {boolean} 是否成功
   */
  updateRefreshRate(clientId, rate) {
    try {
      // 更新特定客户端的刷新频率
      const success = logStreamService.updateSubscription(clientId, {
        refreshRate: rate
      })
      return success
    } catch (error) {
      logger.error('更新刷新频率失败', error)
      return false
    }
  }

  /**
   * 更新日志源配置
   * @param {string} clientId - 客户端ID
   * @param {Array} sources - 日志源列表
   * @returns {boolean} 是否成功
   */
  updateLogSources(clientId, sources) {
    try {
      // 更新特定客户端的日志源过滤
      const success = logStreamService.updateSubscription(clientId, {
        modules: sources
      })
      return success
    } catch (error) {
      logger.error('更新日志源配置失败', error)
      return false
    }
  }

  /**
   * 更新过滤器设置
   * @param {string} clientId - 客户端ID
   * @param {Object} settings - 过滤器设置
   * @returns {boolean} 是否成功
   */
  updateFilterSettings(clientId, settings) {
    try {
      // 更新特定客户端的过滤器设置
      const success = logStreamService.updateSubscription(clientId, settings)
      return success
    } catch (error) {
      logger.error('更新过滤器设置失败', error)
      return false
    }
  }

  /**
   * 记录审计日志
   * @param {Object} socket - Socket.IO socket 实例
   * @param {string} action - 操作类型
   * @param {Object} details - 操作详情
   */
  logAuditAction(socket, action, details) {
    const auditLog = {
      timestamp: new Date().toISOString(),
      action,
      userId: socket.userInfo?.id,
      ip: socket.userInfo?.ip,
      userAgent: socket.handshake?.headers['user-agent'],
      details
    }

    logger.mark(`[AUDIT] ${action}`, auditLog)
  }

  /**
   * 获取客户端ID
   * @param {Object} socket - Socket.IO socket 实例
   * @returns {string} 客户端ID
   */
  getClientId(socket) {
    return socket.userInfo?.id || socket.id
  }

  /**
   * 发送成功响应
   * @param {Object} socket - Socket.IO socket 实例
   * @param {string} requestId - 请求ID
   * @param {string} type - 响应类型
   * @param {Object} data - 响应数据
   */
  sendSuccess(socket, requestId, type, data = {}) {
    const message = {
      request_id: requestId,
      protocol: 'logs',
      type: type,
      success: true,
      data: data
    }

    socket.emit('message', JSON.stringify(message))
  }

  /**
   * 发送错误响应
   * @param {Object} socket - Socket.IO socket 实例
   * @param {string} requestId - 请求ID
   * @param {string} errorCode - 错误代码
   * @param {string} errorMessage - 错误消息
   */
  sendError(socket, requestId, errorCode, errorMessage) {
    const message = {
      request_id: requestId,
      protocol: 'logs',
      type: 'ERROR',
      success: false,
      error: {
        code: errorCode,
        message: errorMessage
      }
    }

    socket.emit('message', JSON.stringify(message))
  }

  /**
   * 处理调试请求
   * @param {Object} socket - Socket.IO socket 实例
   * @param {Object} data - 请求数据
   * @param {string} requestId - 请求ID
   */
  handleDebugRequest(socket, data, requestId) {
    try {
      // 验证权限
      if (!this.validateAdminPermission(socket)) {
        this.sendError(socket, requestId, 'PERMISSION_DENIED', '权限不足，只有管理员可以调试')
        return
      }

      const debugType = data.type || 'status'

      switch (debugType) {
        case 'status':
          // 检查订阅状态
          logStreamService.checkSubscriptionStatus()
          this.sendSuccess(socket, requestId, 'DEBUG_STATUS', {
            message: '订阅状态已输出到服务器日志'
          })
          break

        case 'cleanup':
          // 手动触发清理
          logStreamService.cleanup()
          this.sendSuccess(socket, requestId, 'DEBUG_CLEANUP', {
            message: '手动清理已执行'
          })
          break

        case 'heartbeat':
          // 更新心跳
          const clientId = this.getClientId(socket)
          logStreamService.updateHeartbeat(clientId)
          this.sendSuccess(socket, requestId, 'DEBUG_HEARTBEAT', {
            message: `客户端 ${clientId} 心跳已更新`
          })
          break

        default:
          this.sendError(socket, requestId, 'INVALID_DEBUG_TYPE', `不支持的调试类型: ${debugType}`)
          break
      }

    } catch (error) {
      logger.error('处理调试请求失败', error, { 
        clientId: this.getClientId(socket),
        data 
      })
      this.sendError(socket, requestId, 'INTERNAL_ERROR', '调试请求处理失败')
    }
  }

  /**
   * 获取活跃导出任务
   * @returns {Array} 活跃导出任务列表
   */
  getActiveExports() {
    return Array.from(this.activeExports.entries()).map(([id, task]) => ({
      id,
      startTime: task.startTime,
      status: task.status
    }))
  }

  /**
   * 取消导出任务
   * @param {string} exportId - 导出ID
   * @returns {boolean} 是否成功取消
   */
  cancelExport(exportId) {
    const task = this.activeExports.get(exportId)
    if (task) {
      task.status = 'cancelled'
      this.activeExports.delete(exportId)
      return true
    }
    return false
  }
}

// 创建单例实例
const logStreamController = new LogStreamController()

export default logStreamController