/* eslint-disable no-undef */
const logger = {
  info(msg, extra = {}) {
    this.log('INFO', msg, extra)
  },
  mark(msg, extra = {}) {
    this.log('MARK', msg, extra)
  },
  warn(msg, extra = {}) {
    this.log('WARN', msg, extra)
  },
  error(msg, error, extra = {}) {
    this.log('ERROR', msg, extra)
    console.error(msg, error) // Print the error message first

  },
  debug(msg, extra = {}) {
    if (global.debug) {
      this.log('DEBUG', msg, extra)
      console.log(msg)
      console.log('\x1b[0m')
    }
  },
  log(level, msg, extra) {
    const ip = extra.ip
    const callerInfo = this.getCallerInfo()
    console.log(
      `\x1b[${this.getColor(level)}m[Mio-Chat][${this.getTime()}][${level}]\x1b[0m${
        ip ? `\x1b[35m[${ip}]\x1b[0m` : ''
      }${callerInfo} ${msg}`
    )
  },
  getColor(level) {
    switch (level) {
      case 'INFO':
        return '36'
      case 'MARK':
        return '32'
      case 'WARN':
        return '33'
      case 'ERROR':
        return '31'
      case 'DEBUG':
        return '34'
      default:
        return '0'
    }
  },
  getCallerInfo() {
    const stack = new Error().stack
    const stackLines = stack.split('\n')
  
    // 跳过 getCallerInfo 本身以及可能的中间层函数
    let i = 1
    while (i < stackLines.length && (stackLines[i].includes('getCallerInfo') || stackLines[i].includes('logger.js'))) {
      i++
    }
  
    // 尝试找到包含文件路径和行号的堆栈行
    let callerLine = ''
    for (; i < stackLines.length; i++) {
      const line = stackLines[i]
      if (line.includes('(') && line.includes(':')) {
        callerLine = line
        break
      }
    }
    
    // 稍微宽松的正则表达式，允许 "at " 前缀和其他变体
    const match = callerLine.match(/at .*?\((.*?):(\d+):\d+\)/) || callerLine.match(/at (.*?):(\d+):\d+/)
  
    if (match) {
      const fullPath = match[1]
      const pathSegments = fullPath.split('/')
      const shortPath = pathSegments.slice(-2).join('/')
      return `[${shortPath}:${match[2]}]`
    } else {
      console.warn('Could not extract caller info from:', callerLine) // 调试警告
      return '[unknown]'
    }
  },
  getTime() {
    const currentDate = new Date()
    const hours = currentDate.getHours().toString().padStart(2, '0')
    const minutes = currentDate.getMinutes().toString().padStart(2, '0')
    const seconds = currentDate.getSeconds().toString().padStart(2, '0')
    const milliseconds = currentDate.getMilliseconds().toString().padStart(3, '0')
    return `${hours}:${minutes}:${seconds}.${milliseconds}`
  },
  json(obj) {
    const jsonString = JSON.stringify(obj, (key, value) => {
      if (key === 'data') {
        return 'xxx'; 
      }
      return value; 
    }, 2);
    console.log(jsonString);
  }
}

global.logger = logger
export default logger