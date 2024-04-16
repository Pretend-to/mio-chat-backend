const logger = {
  info(msg, req = null) {
    const ip = req ? this.getIP(req) : null
    console.log(
      `\x1b[36m[Mio-Chat][${this.getTime()}][INFO]\x1b[0m${ip ? `\x1b[35m[${ip}]\x1b[0m` : ''} ${msg}`,
    )
  },
  warn(msg, req = null) {
    const ip = req ? this.getIP(req) : null
    console.log(
      `\x1b[33m[Mio-Chat][${this.getTime()}][WARN]\x1b[0m${ip ? `\x1b[35m[${ip}]\x1b[0m` : ''} ${msg}`,
    )
  },
  error(msg, req = null) {
    const ip = req ? this.getIP(req) : null
    if (!msg.stack) {
      console.log(
        `\x1b[31m[Mio-Chat][${this.getTime()}][ERROR]\x1b[0m${ip ? `\x1b[35m[${ip}]\x1b[0m` : ''} ${msg}`,
      )
    } else {
      console.log(
        `\x1b[31m[Mio-Chat][${this.getTime()}][ERROR]\x1b[0m${ip ? `\x1b[35m[${ip}]\x1b[0m` : ''} ${msg.stack}`,
      )
    }
  },
  debug(msg, req = null) {
    if (global.debug) {
      const ip = req ? this.getIP(req) : null
      console.log(
        `\x1b[34m[Mio-Chat][${this.getTime()}][DEBUG]\x1b[0m${ip ? `\x1b[35m[${ip}]\x1b[0m` : ''}`,
      )
      console.log(msg)
      console.log('\x1b[0m')
    }
  },
  getIP(req) {
    return req?.headers['x-real-ip'] || req?.connection.remoteAddress || null
  },
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
  },
}

export default logger
