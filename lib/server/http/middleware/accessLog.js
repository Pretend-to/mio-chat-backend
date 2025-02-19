export function accessLogger(req, res, next) {
  logger.info(`${req.method} ${req.originalUrl}`)
  next()
}