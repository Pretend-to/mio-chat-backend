import { getIP } from '../utils/getIP.js'

export function accessLogger(req, res, next) {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: getIP(req),
  })
  next()
}
