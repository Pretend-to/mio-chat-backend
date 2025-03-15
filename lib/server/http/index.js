import express from 'express'
import path from 'path'
import { limiter } from './middleware/rateLimiter.js'
import { accessLogger } from './middleware/accessLog.js'
import { upload } from './services/fileService.js'
import { getIP } from './utils/getIP.js'
import * as baseController from './controllers/baseController.js'
import * as openaiController from './controllers/openaiController.js'
import * as imageController from './controllers/imageController.js'
import * as fileController from './controllers/fileController.js'
import config from '../../config.js'
export function startServer() {
  const app = express()
  const currentDir = process.cwd()
  const distDir = path.join(currentDir, 'dist')
  const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
  // 提供静态文件
  app.use(express.static(distDir))
  app.set('trust proxy', true)
  // 中间件
  app.use(express.json({ limit: '2mb' })) // 添加了这一行！
  app.use(express.urlencoded({ extended: true }))
  // 应用速率限制中间件（除了127.0.0.1）
  app.use((req, res, next) => {
    const ip = getIP(req)
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
  // 基本网关路由
  app.get('/api/gateway', baseController.getGateway)
  // 基本信息路由
  app.get('/api/base_info', baseController.getBaseInfo)
  // Onebot插件路由
  app.get('/api/onebot/plugins', baseController.getOnebotPlugins)
  // OpenAI预设和工具路由
  app.get('/api/openai/:type', openaiController.getOpenAIResources)
  // QQ头像路由
  app.get('/api/qava', imageController.getQQAvatar)
  // 分享获取路由
  app.get('/api/share', asyncHandler(baseController.getShare))
  // 分享设置路由
  app.post('/api/share/set', asyncHandler(baseController.setShare))
  // 完成文件上传端点
  app.post('/api/upload/finalize', fileController.finalizeUpload)
  // 图片上传端点
  app.post('/api/upload/image', upload.single('image'), imageController.uploadImage)
  // 分片上传端点
  app.post('/api/upload/chunk', upload.single('file'), fileController.uploadChunk)
  // 文件下载端点
  app.get('/f/gen/:type/:name', fileController.serveGeneratedFile)
  app.get('/f/up/:type/:name', fileController.serveUploadedFile)
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
      middleware.wsServer.handleUpgrade(request, socket, head)
    } catch (error) {
      logger.error('WebSocket连接失败：' + error.message)
    }
  })
  return server
}