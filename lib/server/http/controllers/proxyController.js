import http from 'http'
import https from 'https'

// 代理路由
export function proxyRequest(req, res) {
  const url = req.query.url
  if (!url) {
    logger.error('GET /api/proxy: 缺少url参数')
    res.status(400).json({
      code: 400,
      message: 'url参数不能为空',
    })
    return
  }
  
  const client = url.startsWith('https') ? https : http
  client
    .get(url, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res)
    })
    .on('error', (err) => {
      logger.error(`GET /api/proxy: 代理请求失败: ${err.message}`)
      res.status(500).json({
        code: 500,
        message: '代理请求失败',
        error: err.message,
      })
    })
}