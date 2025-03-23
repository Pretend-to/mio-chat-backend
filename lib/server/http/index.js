import express from 'express'
import path from 'path'
import crypto from 'crypto' // 引入 crypto 模块
import fs from 'fs'
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
  // app.use(express.static(distDir)); // 旧的静态资源服务

  app.set('trust proxy', true)

  // 中间件
  app.use(express.json({ limit: '2mb' }))
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

  // **新的静态资源中间件，处理 304 缓存**
  app.use('/', express.static(distDir, { // 根路径提供静态文件
    maxAge: '1h', // 缓存时间
    setHeaders: (res, filePath) => {
      // 排除 api 路由，因为他们不是静态资源
      if (filePath.startsWith('/api')) {
        return
      }
      const fileContent = fs.readFileSync(filePath) // 使用绝对路径
      const hash = crypto.createHash('md5').update(fileContent).digest('hex')
      const lastModified = fs.statSync(filePath).mtime.toUTCString() // 使用绝对路径

      res.setHeader('Cache-Control', 'public, max-age=3600')
      res.setHeader('ETag', `"${hash}"`)
      res.setHeader('Last-Modified', lastModified)
      const req = res.req

      // 检查 If-None-Match
      if (req.headers['if-none-match'] === `"${hash}"`) {
        res.status(304).end()
        return
      }
    },
  }))

  // 基本网关路由
  app.get('/api/gateway', baseController.getGateway)

  // 基本信息路由
  app.get('/api/base_info', baseController.getBaseInfo)

  // Onebot插件路由
  app.get('/api/onebot/plugins', baseController.getOnebotPlugins)

  // OpenAI预设和工具路由
  app.get('/api/openai/:type', openaiController.getOpenAIResources)

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

  // QQ头像路由
  app.get('/p/qava', imageController.getQQAvatar)

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

  // Socket.io处理
  middleware.enableSocketServer(server) // 假设 middleware 已经被正确引入，这⾥仅为示意
}