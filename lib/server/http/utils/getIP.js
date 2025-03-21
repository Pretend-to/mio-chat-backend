const getIP = (req) => {
  try {
    // 1. 尝试从 Cloudflare 的 header 获取真实 IP
    const cfConnectingIp = req.headers['cf-connecting-ip']
    if (cfConnectingIp) {
      return cfConnectingIp
    }

    // 2. 如果没有 Cloudflare，尝试获取 X-Real-IP
    const xRealIp = req.headers['x-real-ip']
    if (xRealIp) {
      return xRealIp
    }

    // 3. 如果都没有，再尝试 connection.remoteAddress (可能在没有代理的情况下有用)
    const remoteAddress = req.connection.remoteAddress
    if (remoteAddress) {
      return remoteAddress
    }

    // 4. 如果上述方法都失败，检查 req.ip (Express 默认的 IP 获取方式，可能经过信任代理处理)
    const reqIp = req.ip  // 需要 app.set('trust proxy', true)
    if (reqIp) {
      return reqIp
    }

    // 5. 如果一切都失败了,返回 null
    return null

  } catch (error) {
    logger.error('Error getting IP:\n' + error)
    return null
  }
}

export { getIP }