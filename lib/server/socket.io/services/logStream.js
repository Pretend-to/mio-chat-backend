import { EventEmitter } from 'events'
import LogBuffer from '../../../../utils/LogBuffer.js'
import logger from '../../../../utils/logger.js'

/**
 * LogStreamService - 日志流服务核心类
 * 负责管理日志订阅、分发和缓冲区集成
 */
export class LogStreamService extends EventEmitter {
  constructor(options = {}) {
    super()
    
    // 配置选项
    this.config = {
      bufferSize: options.bufferSize || 1000,
      maxSubscribers: options.maxSubscribers || 100,
      heartbeatInterval: options.heartbeatInterval || 0, // 禁用心跳检查，依赖 Socket.IO 连接状态
      cleanupInterval: options.cleanupInterval || 60000, // 1分钟清理间隔
    }

    // 订阅管理
    this.subscriptions = new Map() // clientId -> subscription
    this.subscriberCount = 0

    // 日志缓冲区 - 集成现有的 LogBuffer
    this.logBuffer = new LogBuffer({
      maxSize: this.config.bufferSize
    })

    // 统计信息
    this.stats = {
      totalLogsSent: 0,
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      startTime: new Date(),
      lastLogTime: null
    }

    // 初始化
    this.init()
  }

  /**
   * 初始化服务
   */
  init() {
    // 监听全局 logger 的日志事件
    if (logger && typeof logger.on === 'function') {
      logger.on('log', (logEntry) => {
        this.handleNewLog(logEntry)
      })
    }

    // 启动清理定时器
    this.startCleanupTimer()

    logger.info('LogStreamService 已初始化')
  }

  /**
   * 订阅日志流
   * @param {string} clientId - 客户端ID
   * @param {Object} socket - Socket.IO socket 实例
   * @param {Object} options - 订阅选项
   * @returns {Object} 订阅结果
   */
  subscribe(clientId, socket, options = {}) {
    try {
      // 检查订阅数量限制
      if (this.subscriberCount >= this.config.maxSubscribers) {
        throw new Error('订阅数量已达上限')
      }

      // 检查是否已经订阅
      if (this.subscriptions.has(clientId)) {
        this.unsubscribe(clientId)
      }

      // 创建订阅对象
      const subscription = {
        clientId,
        socket,
        options: {
          level: options.level || 'INFO',
          modules: options.modules || [],
          realtime: options.realtime !== false,
          bufferSize: options.bufferSize || this.config.bufferSize,
          searchQuery: options.searchQuery || null,
          timeRange: options.timeRange || null
        },
        subscribedAt: new Date(),
        lastHeartbeat: new Date(),
        logsSent: 0
      }

      // 添加订阅
      this.subscriptions.set(clientId, subscription)
      this.subscriberCount++
      this.stats.totalSubscriptions++
      this.stats.activeSubscriptions++

      // 监听 socket 断开事件
      socket.on('disconnect', () => {
        this.unsubscribe(clientId)
      })

      // 如果需要历史日志，发送缓冲区中的日志
      if (options.sendHistory !== false) {
        this.sendHistoryLogs(subscription)
      }

      logger.info(`客户端 ${clientId} 已订阅日志流`, { 
        options: subscription.options,
        totalSubscribers: this.subscriberCount
      })

      this.emit('subscribed', { clientId, subscription })

      return {
        success: true,
        clientId,
        subscriberCount: this.subscriberCount,
        bufferStats: this.logBuffer.getStats()
      }

    } catch (error) {
      logger.error('订阅日志流失败', error, { clientId, options })
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 取消订阅
   * @param {string} clientId - 客户端ID
   * @returns {boolean} 是否成功取消订阅
   */
  unsubscribe(clientId) {
    try {
      const subscription = this.subscriptions.get(clientId)
      if (!subscription) {
        return false
      }

      // 移除订阅
      this.subscriptions.delete(clientId)
      this.subscriberCount--
      this.stats.activeSubscriptions--

      logger.info(`客户端 ${clientId} 已取消订阅日志流`, {
        logsSent: subscription.logsSent,
        duration: Date.now() - subscription.subscribedAt.getTime()
      })

      this.emit('unsubscribed', { clientId, subscription })

      return true

    } catch (error) {
      logger.error('取消订阅失败', error, { clientId })
      return false
    }
  }

  /**
   * 处理新日志
   * @param {Object} logEntry - 日志条目
   */
  handleNewLog(logEntry) {
    try {
      // 添加到缓冲区
      this.logBuffer.addLog(logEntry)
      this.stats.lastLogTime = new Date()

      // 分发给订阅者
      this.distributeLog(logEntry)

    } catch (error) {
      logger.error('处理新日志失败', error, { logEntry })
    }
  }

  /**
   * 分发日志给订阅者
   * @param {Object} logEntry - 日志条目
   */
  distributeLog(logEntry) {
    if (this.subscriberCount === 0) {
      return
    }

    for (const [clientId, subscription] of this.subscriptions) {
      try {
        // 检查是否符合订阅条件
        if (this.shouldSendLog(logEntry, subscription)) {
          this.sendLogToClient(logEntry, subscription)
        }
      } catch (error) {
        logger.error(`向客户端 ${clientId} 发送日志失败`, error)
        // 如果发送失败，考虑移除该订阅
        this.unsubscribe(clientId)
      }
    }
  }

  /**
   * 检查是否应该发送日志给订阅者
   * @param {Object} logEntry - 日志条目
   * @param {Object} subscription - 订阅信息
   * @returns {boolean} 是否应该发送
   */
  shouldSendLog(logEntry, subscription) {
    const { options } = subscription

    // 检查实时模式
    if (!options.realtime) {
      return false
    }

    // 检查日志级别
    const levels = { ERROR: 0, WARN: 1, MARK: 2, INFO: 3, DEBUG: 4 }
    const logLevel = levels[logEntry.level] || 3
    const subscriptionLevel = levels[options.level] || 3
    
    if (logLevel > subscriptionLevel) {
      return false
    }

    // 检查模块过滤
    if (options.modules.length > 0 && !options.modules.includes(logEntry.module)) {
      return false
    }

    // 检查搜索查询
    if (options.searchQuery) {
      const query = options.searchQuery.toLowerCase()
      const searchableText = [
        logEntry.message,
        logEntry.module,
        logEntry.caller
      ].filter(Boolean).join(' ').toLowerCase()
      
      if (!searchableText.includes(query)) {
        return false
      }
    }

    // 检查时间范围
    if (options.timeRange) {
      const logTime = new Date(logEntry.timestamp)
      const { start, end } = options.timeRange
      
      if (start && logTime < new Date(start)) {
        return false
      }
      
      if (end && logTime > new Date(end)) {
        return false
      }
    }

    return true
  }

  /**
   * 发送日志给客户端
   * @param {Object} logEntry - 日志条目
   * @param {Object} subscription - 订阅信息
   */
  sendLogToClient(logEntry, subscription) {
    const { socket, clientId } = subscription

    if (!socket || socket.disconnected) {
      this.unsubscribe(clientId)
      return
    }

    // 构造消息
    const message = {
      requestId: this.generateRequestId(),
      protocol: 'logs',
      type: 'stream',
      data: logEntry
    }

    // 发送消息
    socket.emit('message', JSON.stringify(message))

    // 更新统计
    subscription.logsSent++
    this.stats.totalLogsSent++
  }

  /**
   * 发送历史日志
   * @param {Object} subscription - 订阅信息
   */
  sendHistoryLogs(subscription) {
    try {
      const { options } = subscription
      let logs = this.logBuffer.getAllLogs()

      // 应用过滤条件
      logs = this.applyFilters(logs, options)

      // 限制数量
      const maxHistory = Math.min(options.bufferSize, 100)
      logs = logs.slice(-maxHistory)

      // 发送历史日志
      for (const logEntry of logs) {
        this.sendLogToClient(logEntry, subscription)
      }

      logger.debug(`已向客户端 ${subscription.clientId} 发送 ${logs.length} 条历史日志`)

    } catch (error) {
      logger.error('发送历史日志失败', error, { clientId: subscription.clientId })
    }
  }

  /**
   * 应用过滤条件
   * @param {Array} logs - 日志数组
   * @param {Object} options - 过滤选项
   * @returns {Array} 过滤后的日志
   */
  applyFilters(logs, options) {
    return logs.filter(log => {
      // 日志级别过滤
      const levels = { ERROR: 0, WARN: 1, MARK: 2, INFO: 3, DEBUG: 4 }
      const logLevel = levels[log.level] || 3
      const subscriptionLevel = levels[options.level] || 3
      
      if (logLevel > subscriptionLevel) {
        return false
      }

      // 模块过滤
      if (options.modules.length > 0 && !options.modules.includes(log.module)) {
        return false
      }

      // 搜索查询过滤
      if (options.searchQuery) {
        const query = options.searchQuery.toLowerCase()
        const searchableText = [
          log.message,
          log.module,
          log.caller
        ].filter(Boolean).join(' ').toLowerCase()
        
        if (!searchableText.includes(query)) {
          return false
        }
      }

      // 时间范围过滤
      if (options.timeRange) {
        const logTime = new Date(log.timestamp)
        const { start, end } = options.timeRange
        
        if (start && logTime < new Date(start)) {
          return false
        }
        
        if (end && logTime > new Date(end)) {
          return false
        }
      }

      return true
    })
  }

  /**
   * 搜索日志
   * @param {string} clientId - 客户端ID
   * @param {Object} query - 搜索查询
   * @returns {Object} 搜索结果
   */
  searchLogs(clientId, query) {
    try {
      const subscription = this.subscriptions.get(clientId)
      if (!subscription) {
        throw new Error('客户端未订阅日志流')
      }

      let logs = this.logBuffer.getAllLogs()

      // 应用搜索条件
      const searchOptions = {
        level: query.level || subscription.options.level,
        modules: query.modules || subscription.options.modules,
        searchQuery: query.keyword,
        timeRange: query.timeRange
      }

      logs = this.applyFilters(logs, searchOptions)

      // 分页
      const page = query.page || 1
      const pageSize = Math.min(query.pageSize || 50, 200)
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize

      const paginatedLogs = logs.slice(startIndex, endIndex)

      const result = {
        success: true,
        data: {
          logs: paginatedLogs,
          total: logs.length,
          page,
          pageSize,
          totalPages: Math.ceil(logs.length / pageSize)
        }
      }

      logger.debug(`客户端 ${clientId} 搜索日志`, {
        query,
        resultCount: paginatedLogs.length,
        totalCount: logs.length
      })

      return result

    } catch (error) {
      logger.error('搜索日志失败', error, { clientId, query })
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取日志统计信息
   * @returns {Object} 统计信息
   */
  getLogStats() {
    const bufferStats = this.logBuffer.getStats()
    
    return {
      service: {
        ...this.stats,
        activeSubscriptions: this.stats.activeSubscriptions,
        uptime: Date.now() - this.stats.startTime.getTime()
      },
      buffer: bufferStats,
      subscriptions: Array.from(this.subscriptions.values()).map(sub => ({
        clientId: sub.clientId,
        options: sub.options,
        subscribedAt: sub.subscribedAt,
        logsSent: sub.logsSent,
        duration: Date.now() - sub.subscribedAt.getTime()
      }))
    }
  }

  /**
   * 更新订阅选项
   * @param {string} clientId - 客户端ID
   * @param {Object} newOptions - 新的订阅选项
   * @returns {boolean} 是否成功更新
   */
  updateSubscription(clientId, newOptions) {
    try {
      const subscription = this.subscriptions.get(clientId)
      if (!subscription) {
        return false
      }

      // 更新选项
      subscription.options = {
        ...subscription.options,
        ...newOptions
      }

      logger.info(`客户端 ${clientId} 订阅选项已更新`, { newOptions })
      this.emit('subscriptionUpdated', { clientId, subscription })

      return true

    } catch (error) {
      logger.error('更新订阅选项失败', error, { clientId, newOptions })
      return false
    }
  }

  /**
   * 启动清理定时器
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * 清理无效订阅
   */
  cleanup() {
    const now = new Date()
    const toRemove = []

    for (const [clientId, subscription] of this.subscriptions) {
      let removeReason = null

      // 检查 socket 连接状态
      if (!subscription.socket) {
        removeReason = 'socket为空'
        toRemove.push({ clientId, reason: removeReason })
        continue
      }

      if (subscription.socket.disconnected) {
        removeReason = 'socket已断开'
        toRemove.push({ clientId, reason: removeReason })
        continue
      }

      // 检查心跳超时（如果启用）
      if (this.config.heartbeatInterval > 0) {
        const timeSinceHeartbeat = now - subscription.lastHeartbeat
        const heartbeatTimeout = this.config.heartbeatInterval * 2
        
        if (timeSinceHeartbeat > heartbeatTimeout) {
          removeReason = `心跳超时 (${Math.round(timeSinceHeartbeat/1000)}s > ${Math.round(heartbeatTimeout/1000)}s)`
          toRemove.push({ clientId, reason: removeReason })
        }
      }
    }

    // 移除无效订阅
    toRemove.forEach(({ clientId, reason }) => {
      logger.info(`清理订阅 ${clientId}: ${reason}`)
      this.unsubscribe(clientId)
    })

    if (toRemove.length > 0) {
      logger.info(`清理了 ${toRemove.length} 个无效订阅`)
    }
  }

  /**
   * 更新心跳
   * @param {string} clientId - 客户端ID
   */
  updateHeartbeat(clientId) {
    const subscription = this.subscriptions.get(clientId)
    if (subscription) {
      subscription.lastHeartbeat = new Date()
    }
  }

  /**
   * 生成请求ID
   * @returns {string} 请求ID
   */
  generateRequestId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取所有订阅
   * @returns {Array} 订阅列表
   */
  getAllSubscriptions() {
    return Array.from(this.subscriptions.values())
  }

  /**
   * 检查订阅状态（调试用）
   */
  checkSubscriptionStatus() {
    const now = new Date()
    logger.info('=== 订阅状态检查 ===')
    logger.info(`总订阅数: ${this.subscriberCount}`)
    logger.info(`心跳间隔: ${this.config.heartbeatInterval}ms (${this.config.heartbeatInterval > 0 ? '启用' : '禁用'})`)
    logger.info(`清理间隔: ${this.config.cleanupInterval}ms`)

    for (const [clientId, subscription] of this.subscriptions) {
      const socketStatus = subscription.socket ? 
        (subscription.socket.disconnected ? '已断开' : '已连接') : '无socket'
      const timeSinceHeartbeat = now - subscription.lastHeartbeat
      const duration = now - subscription.subscribedAt

      logger.info(`客户端 ${clientId}:`)
      logger.info(`  - Socket状态: ${socketStatus}`)
      logger.info(`  - 订阅时长: ${Math.round(duration/1000)}秒`)
      logger.info(`  - 上次心跳: ${Math.round(timeSinceHeartbeat/1000)}秒前`)
      logger.info(`  - 已发送日志: ${subscription.logsSent}条`)
    }
    logger.info('==================')
  }

  /**
   * 获取订阅数量
   * @returns {number} 订阅数量
   */
  getSubscriberCount() {
    return this.subscriberCount
  }

  /**
   * 清理所有订阅
   */
  clearAllSubscriptions() {
    const clientIds = Array.from(this.subscriptions.keys())
    clientIds.forEach(clientId => this.unsubscribe(clientId))
    
    logger.info('已清理所有日志流订阅')
  }

  /**
   * 销毁服务
   */
  destroy() {
    this.clearAllSubscriptions()
    this.removeAllListeners()
    
    if (logger && typeof logger.off === 'function') {
      logger.off('log', this.handleNewLog)
    }
    
    logger.info('LogStreamService 已销毁')
  }
}

// 创建单例实例
const logStreamService = new LogStreamService()

export default logStreamService