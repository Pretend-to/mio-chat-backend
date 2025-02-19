import express from 'express'
import path from 'path'
import { limiter } from './middleware/rateLimiter.js'
import { authWsConnection } from './middleware/authentication.js'
import { accessLogger } from './middleware/accessLog.js'
import { upload } from './services/fileService.js'
import * as baseController from './controllers/baseController.js'
import * as proxyController from './controllers/proxyController.js'
import * as openaiController from './controllers/openaiController.js'
import * as imageController from './controllers/imageController.js'
import * as fileController from './controllers/fileController.js'
import config from '../../config.js'

export function startServer() {
  const app = express()
  const currentDir = process.cwd()
  const distDir = path.join(currentDir, 'dist')

  // 提供静态文件
  app.use(express.static(distDir))
  app.set('trust proxy', true)

  // 中间件
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // 应用速率限制中间件（除了127.0.0.1）
  app.use((req, res, next) => {
    const ip = logger.getIP(req)
    if (ip !== '127.0.0.1') {
      limiter(req, res, () => {
        next()
      })
    } else {
      next()
    }
  })

  // 访问日志中间件
  app.use(accessLogger)

  // 分片上传端点
  app.post('/api/upload/chunk', upload.single('file'), fileController.uploadChunk) 

  // 基本网关路由
  app.get('/api/gateway', baseController.getGateway)
  // 代理路由
  app.get('/api/proxy', proxyController.proxyRequest)
  // 基本信息路由
  app.get('/api/base_info', baseController.getBaseInfo)
  // Onebot插件路由
  app.get('/api/onebot/plugins', baseController.getOnebotPlugins)
  // OpenAI预设和工具路由
  app.get('/api/openai/:type', openaiController.getOpenAIResources)
  // QQ头像路由
  app.get('/api/qava', imageController.getQQAvatar)
  // 文件相关路由，用于提供生成的文件
  app.get('/api/generated/:type/:name', fileController.serveGeneratedFile)
  // 完成文件上传端点
  app.post('/api/upload/finalize', fileController.finalizeUpload)
  // 图片上传端点
  app.post('/api/upload/image', imageController.uploadImage)
  // 文件下载端点
  app.get('/api/uploaded/:type/:name', fileController.serveUploadedFile)
  // 通配符路由，返回前端页面
  app.get('*', (req, res) => {
    logger.info(`GET *: 提供前端页面 ${path.join(process.cwd(), '/dist/index.html')}`)
    return res.sendFile(path.join(process.cwd(), '/dist/index.html'))
  })

  // 启动服务器
  const port = config.server.port ?? 3080
  const host = config.server.host ?? '0.0.0.0'
  const server = app.listen(port, host, () => {
    logger.info(`服务启动成功: http://127.0.0.1:${port}`)
  })

  // WebSocket处理
  server.on('upgrade', (request, socket, head) => {
    try {
      const userInfo = authWsConnection(request)
      middleware.wsServer.wss.handleUpgrade(request, socket, head, (ws) => {
        middleware.wsServer.wss.emit('connection', ws, userInfo)
      })
    } catch (error) {
      logger.error('WebSocket连接失败：' + error.message)
    }
  })

  return server
}