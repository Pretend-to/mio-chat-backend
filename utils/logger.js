/* eslint-disable no-undef */
const logger = {
  info(msg, req = null) {
    this.log('INFO', msg, req)
  },
  mark(msg, req = null) {
    this.log('MARK', msg, req)
  },
  warn(msg, req = null) {
    this.log('WARN', msg, req)
  },
  error(msg, req = null) {
    console.log(msg) // Print the error message first
    this.log('ERROR', msg, req)
  },
  debug(msg, req = null) {
    if (global.debug) {
      this.log('DEBUG', msg, req)
      console.log(msg)
      console.log('\x1b[0m')
    }
  },
  log(level, msg, req) {
    const ip = req ? this.getIP(req) : null
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
    const callerLine = stackLines[4] || '' // Get the 5th line for the actual caller
    const match = callerLine.match(/\((.*):(\d+):\d+\)/)

    if (match) {
      const fullPath = match[1]
      const pathSegments = fullPath.split('/')
      // Get the last two segments
      const shortPath = pathSegments.slice(-2).join('/')
      return `[${shortPath}:${match[2]}]`
    }

    return '[unknown]'
  },
  getIP(req) {
    return req?.headers['x-real-ip'] || req?.connection.remoteAddress || null
  },
  getTime() {
    const currentDate = new Date()
    const hours = currentDate.getHours().toString().padStart(2, '0')
    const minutes = currentDate.getMinutes().toString().padStart(2, '0')
    const seconds = currentDate.getSeconds().toString().padStart(2, '0')
    const milliseconds = currentDate.getMilliseconds().toString().padStart(3, '0')
    return `${hours}:${minutes}:${seconds}.${milliseconds}`
  },
}

global.logger = logger
export default logger