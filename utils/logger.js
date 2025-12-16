import fs from 'fs'
import path from 'path'
import { EventEmitter } from 'events'
import LogBuffer from './LogBuffer.js'

/**
 * 增强版 Logger 类 - 替换原有 logger
 * 保持完全向后兼容，同时提供增强功能
 * 现在支持实时日志流和事件发射
 */
export class EnhancedLogger extends EventEmitter {
  constructor(options = {}) {
    super() // 初始化 EventEmitter
    
    this.config = {
      // 日志级别 (数字越小级别越高)
      levels: {
        ERROR: 0,
        WARN: 1,
        MARK: 2,
        INFO: 3,
        DEBUG: 4
      },
      // 当前日志级别
      level: options.level || process.env.LOG_LEVEL || 'INFO',
      // 是否输出到控制台
      console: options.console !== false,
      // 是否输出到文件
      file: options.file || process.env.LOG_TO_FILE === 'true',
      // 日志文件路径
      logDir: options.logDir || process.env.LOG_DIR || './logs',
      // 日志文件名格式
      filename: options.filename || 'mio-chat-%DATE%.log',
      // 最大文件大小 (MB)
      maxSize: options.maxSize || 10,
      // 保留文件数量
      maxFiles: options.maxFiles || 7,
      // 是否显示调用者信息
      showCaller: options.showCaller !== false,
      // 是否启用性能优化
      performance: options.performance || process.env.NODE_ENV === 'production',
      // 自定义格式化函数
      formatter: options.formatter || null
    }

    this.colors = {
      ERROR: '31',  // 红色
      WARN: '33',   // 黄色
      MARK: '32',   // 绿色
      INFO: '36',   // 青色
      DEBUG: '34'   // 蓝色
    }

    // 初始化日志目录
    if (this.config.file) {
      this.initLogDirectory()
    }

    // 性能优化：缓存调用者信息
    this.callerCache = new Map()

    // 初始化日志缓冲区
    this.logBuffer = new LogBuffer({
      maxSize: options.bufferSize || 1000
    })

    // 实时日志流配置
    this.streamConfig = {
      enabled: options.enableStream !== false,
      bufferSize: options.bufferSize || 1000,
      emitDelay: options.emitDelay || 0 // 发射延迟（毫秒）
    }
  }

  /**
   * 初始化日志目录
   */
  initLogDirectory() {
    try {
      if (!fs.existsSync(this.config.logDir)) {
        fs.mkdirSync(this.config.logDir, { recursive: true })
      }
    } catch {
      // 静默处理，避免日志系统本身出错
    }
  }

  /**
   * 检查日志级别是否应该输出
   */
  shouldLog(level) {
    const currentLevel = this.config.levels[this.config.level] || 3
    const messageLevel = this.config.levels[level] || 0
    return messageLevel <= currentLevel
  }

  /**
   * 核心日志方法
   */
  log(level, message, extra = {}) {
    if (!this.shouldLog(level)) {
      return
    }

    const timestamp = new Date()
    const timeString = this.getTime()
    const callerInfo = this.config.showCaller ? this.getCallerInfo() : ''
    const ip = extra.ip ? `[${extra.ip}]` : ''
    
    // 创建日志条目对象
    const logEntry = {
      id: this.generateLogId(),
      timestamp: timestamp,
      level: level,
      module: extra.module || 'system',
      message: message,
      caller: callerInfo,
      ip: extra.ip,
      extra: extra
    }

    // 添加到缓冲区
    if (this.streamConfig.enabled) {
      this.logBuffer.addLog(logEntry)
    }

    // 发射日志事件（用于实时流）
    if (this.streamConfig.enabled) {
      if (this.streamConfig.emitDelay > 0) {
        setTimeout(() => {
          this.emit('log', logEntry)
        }, this.streamConfig.emitDelay)
      } else {
        this.emit('log', logEntry)
      }
    }
    
    // 输出到控制台（保持原有格式）
    if (this.config.console) {
      this.outputToConsole(level, message, ip, callerInfo, timeString)
    }

    // 输出到文件
    if (this.config.file) {
      const formattedMessage = `[Mio-Chat][${timeString}][${level}]${ip}${callerInfo} ${message}`
      this.outputToFile(formattedMessage)
    }

    return logEntry
  }

  /**
   * 输出到控制台（保持原有样式）
   */
  outputToConsole(level, message, ip, callerInfo, timestamp) {
    const color = this.colors[level] || '0'
    const coloredIP = ip ? `\x1b[35m${ip}\x1b[0m` : ''
    
    console.log(
      `\x1b[${color}m[Mio-Chat][${timestamp}][${level}]\x1b[0m${coloredIP}${callerInfo} ${message}`
    )
  }

  /**
   * 输出到文件
   */
  outputToFile(message) {
    try {
      const filename = this.getLogFilename()
      const filepath = path.join(this.config.logDir, filename)
      
      // 检查文件大小并轮转
      this.rotateLogIfNeeded(filepath)
      
      fs.appendFileSync(filepath, message + '\n', 'utf8')
    } catch {
      // 静默处理文件错误
    }
  }

  /**
   * 获取日志文件名
   */
  getLogFilename() {
    const date = new Date().toISOString().split('T')[0]
    return this.config.filename.replace('%DATE%', date)
  }

  /**
   * 日志轮转
   */
  rotateLogIfNeeded(filepath) {
    try {
      if (!fs.existsSync(filepath)) {
        return
      }

      const stats = fs.statSync(filepath)
      const fileSizeMB = stats.size / (1024 * 1024)

      if (fileSizeMB > this.config.maxSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const rotatedPath = filepath.replace('.log', `-${timestamp}.log`)
        fs.renameSync(filepath, rotatedPath)
        
        // 清理旧文件
        this.cleanupOldLogs()
      }
    } catch {
      // 静默处理轮转错误
    }
  }

  /**
   * 清理旧日志文件
   */
  cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.config.logDir)
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.config.logDir, file),
          mtime: fs.statSync(path.join(this.config.logDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime)

      // 删除超过保留数量的文件
      if (files.length > this.config.maxFiles) {
        files.slice(this.config.maxFiles).forEach(file => {
          fs.unlinkSync(file.path)
        })
      }
    } catch {
      // 静默处理清理错误
    }
  }

  /**
   * 获取时间戳（保持原有格式）
   */
  getTime() {
    const currentDate = new Date()
    const hours = currentDate.getHours().toString().padStart(2, '0')
    const minutes = currentDate.getMinutes().toString().padStart(2, '0')
    const seconds = currentDate.getSeconds().toString().padStart(2, '0')
    const milliseconds = currentDate
      .getMilliseconds()
      .toString()
      .padStart(3, '0')
    return `${hours}:${minutes}:${seconds}.${milliseconds}`
  }

  /**
   * 获取调用者信息（优化版，保持原有格式）
   */
  getCallerInfo() {
    if (this.config.performance) {
      // 性能模式：简化调用栈分析
      return '[caller]'
    }

    try {
      const stack = new Error().stack
      const stackLines = stack.split('\n')

      // 跳过内部方法
      let i = 1
      while (i < stackLines.length && 
             (stackLines[i].includes('getCallerInfo') || 
              stackLines[i].includes('logger.js'))) {
        i++
      }

      // 查找有效的调用行
      for (; i < stackLines.length; i++) {
        const line = stackLines[i]
        if (line.includes('(') && line.includes(':')) {
          const cacheKey = line.trim()
          
          // 使用缓存提高性能
          if (this.callerCache.has(cacheKey)) {
            return this.callerCache.get(cacheKey)
          }

          const match = line.match(/at .*?\((.*?):(\d+):\d+\)/) || 
                       line.match(/at (.*?):(\d+):\d+/)

          if (match) {
            const fullPath = match[1]
            const pathSegments = fullPath.split('/')
            const shortPath = pathSegments.slice(-2).join('/')
            const result = `[${shortPath}:${match[2]}]`
            
            // 缓存结果（限制缓存大小）
            if (this.callerCache.size < 100) {
              this.callerCache.set(cacheKey, result)
            }
            
            return result
          }
        }
      }
    } catch {
      // 静默处理错误
    }

    return '[unknown]'
  }

  // === 原有 API 兼容方法 ===

  /**
   * 信息日志
   */
  info(msg, extra = {}) {
    this.log('INFO', msg, extra)
  }

  /**
   * 标记日志
   */
  mark(msg, extra = {}) {
    this.log('MARK', msg, extra)
  }

  /**
   * 警告日志
   */
  warn(msg, extra = {}) {
    this.log('WARN', msg, extra)
  }

  /**
   * 错误日志（增强版）
   */
  error(msg, error = null, extra = {}) {
    let errorMessage = msg
    
    if (error) {
      if (error instanceof Error) {
        errorMessage += `\n错误详情: ${error.message}\n堆栈: ${error.stack}`
      } else if (typeof error === 'object') {
        errorMessage += `\n错误详情: ${JSON.stringify(error)}`
      } else {
        errorMessage += `\n错误详情: ${error}`
      }
    }
    
    this.log('ERROR', errorMessage, extra)
    
    // 保持原有行为：同时输出到 console.error
    if (error && this.config.console) {
      console.error(msg, error)
    }
  }

  /**
   * 调试日志
   */
  debug(msg, extra = {}) {
    // 检查全局 debug 标志（保持原有行为）
    if (global.debug || process.env.NODE_ENV === 'development') {
      this.log('DEBUG', msg, extra)
      // 保持原有控制台输出行为
      if (this.config.console) {
        console.log(msg)
        console.log('\x1b[0m')
      }
    }
  }

  /**
   * JSON 输出（增强版，保持原有 API）
   */
  json(obj) {
    try {
      const jsonString = JSON.stringify(obj, (key, value) => {
        // 保持原有过滤逻辑
        if (key === 'data') {
          return '[Base64 Image Data]'
        } else if (key === 'url' && typeof value === 'string' && value.startsWith('data:')) {
          return '[Base64 Image Data]'
        }
        // 增强：过滤敏感信息
        if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
          return '[REDACTED]'
        }
        return value
      }, 2)
      
      // 保持原有行为：输出到控制台
      console.log(jsonString)
      
      // 新增：同时通过日志系统推送（用于实时流）
      this.log('INFO', jsonString, { type: 'json', originalObject: obj })
    } catch (error) {
      this.error('JSON序列化失败', error)
    }
  }

  // === 新增方法 ===

  /**
   * 设置日志级别
   */
  setLevel(level) {
    if (this.config.levels.hasOwnProperty(level)) {
      this.config.level = level
      this.info(`日志级别已设置为: ${level}`)
    } else {
      this.warn(`无效的日志级别: ${level}`)
    }
  }

  /**
   * 获取日志统计信息
   */
  getStats() {
    const logFiles = fs.existsSync(this.config.logDir) 
      ? fs.readdirSync(this.config.logDir).filter(f => f.endsWith('.log'))
      : []

    return {
      level: this.config.level,
      logDir: this.config.logDir,
      fileCount: logFiles.length,
      cacheSize: this.callerCache.size,
      config: this.config
    }
  }

  /**
   * 原有的 getColor 方法（保持兼容）
   */
  getColor(level) {
    return this.colors[level] || '0'
  }

  // === 新增：日志流和缓冲区管理方法 ===

  /**
   * 生成日志ID
   */
  generateLogId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取日志缓冲区
   */
  getLogBuffer() {
    return this.logBuffer
  }

  /**
   * 获取缓冲区中的日志
   */
  getBufferedLogs(startIndex, endIndex) {
    return this.logBuffer.getLogs(startIndex, endIndex)
  }

  /**
   * 搜索缓冲区中的日志
   */
  searchBufferedLogs(keyword) {
    return this.logBuffer.searchLogs(keyword)
  }

  /**
   * 按级别过滤缓冲区日志
   */
  filterBufferedLogsByLevel(level) {
    return this.logBuffer.filterByLevel(level)
  }

  /**
   * 按模块过滤缓冲区日志
   */
  filterBufferedLogsByModule(modules) {
    return this.logBuffer.filterByModule(modules)
  }

  /**
   * 按时间范围过滤缓冲区日志
   */
  filterBufferedLogsByTimeRange(startTime, endTime) {
    return this.logBuffer.filterByTimeRange(startTime, endTime)
  }

  /**
   * 清理日志缓冲区
   */
  clearBuffer() {
    this.logBuffer.cleanup()
    this.emit('bufferCleared')
  }

  /**
   * 调整缓冲区大小
   */
  resizeBuffer(newSize) {
    this.logBuffer.resize(newSize)
    this.streamConfig.bufferSize = newSize
    this.emit('bufferResized', newSize)
  }

  /**
   * 启用/禁用日志流
   */
  setStreamEnabled(enabled) {
    this.streamConfig.enabled = enabled
    this.emit('streamToggled', enabled)
  }

  /**
   * 设置发射延迟
   */
  setEmitDelay(delay) {
    this.streamConfig.emitDelay = delay
  }

  /**
   * 获取流配置
   */
  getStreamConfig() {
    return { ...this.streamConfig }
  }

  /**
   * 获取缓冲区统计信息
   */
  getBufferStats() {
    return this.logBuffer.getStats()
  }

  /**
   * 订阅日志事件（便捷方法）
   */
  onLog(callback) {
    this.on('log', callback)
    return this
  }

  /**
   * 取消订阅日志事件（便捷方法）
   */
  offLog(callback) {
    this.off('log', callback)
    return this
  }

  /**
   * 订阅一次日志事件（便捷方法）
   */
  onceLog(callback) {
    this.once('log', callback)
    return this
  }
}

// 创建默认实例（保持原有行为）
const logger = new EnhancedLogger({
  level: process.env.LOG_LEVEL || 'INFO',
  file: process.env.LOG_TO_FILE === 'true',
  logDir: process.env.LOG_DIR || './logs',
  performance: process.env.NODE_ENV === 'production'
})

// 设置全局 logger（保持原有行为）
global.logger = logger

// 导出（保持原有 API）
export default logger