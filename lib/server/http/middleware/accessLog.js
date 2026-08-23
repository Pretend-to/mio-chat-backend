import { getIP } from '../utils/getIP.js'

const SILENT_PATHS = ['/p/mava', '/p/ava', '/p/qava', '/favicon.ico', '/assets/']

export function accessLogger(req, res, next) {
  const url = req.originalUrl || req.url || ''
  const isSilent = SILENT_PATHS.some((p) => url.startsWith(p))

  if (isSilent) {
    logger.debug(`${req.method} ${url}`, {
      ip: getIP(req),
    })
  } else {
    logger.info(`${req.method} ${url}`, {
      ip: getIP(req),
    })
  }
  next()
}
