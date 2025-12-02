import express from 'express'
import path from 'path'
import crypto from 'crypto' // 引入 crypto 模块
import fs from 'fs'
import expressStaticGzip from 'express-static-gzip'
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
  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }

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

  app.use('/p/ava', express.static(path.join(currentDir, 'presets', 'avatar')))

  // Use express-static-gzip to prefer pre-compressed files (.br/.gz)
  // OrderPreference prefers brotli first, then gzip
  app.use(
    expressStaticGzip(distDir, {
      enableBrotli: true,
      orderPreference: ['br', 'gz'],
      maxAge: '1h',
      // Don't override index handling elsewhere; we serve index via get('*') below
      index: false,
      setHeaders: (res, filePath) => {
        // 通用缓存头
        res.setHeader('Cache-Control', 'public, max-age=3600')
        // 强制变体缓存头，重要：告诉中间缓存/浏览器这是按 Accept-Encoding 不同的变体
        res.setHeader('Vary', 'Accept-Encoding')
        // 排除 API 路由
        if (res.req && res.req.path && res.req.path.startsWith('/api')) {
          return
        }
        try {
          const fileContent = fs.readFileSync(filePath)
          const hash = crypto
            .createHash('md5')
            .update(fileContent)
            .digest('hex')
          const lastModified = fs.statSync(filePath).mtime.toUTCString()
          res.setHeader('ETag', `"${hash}"`)
          res.setHeader('Last-Modified', lastModified)
        } catch (err) {
          console.error('Error reading file or setting headers:', err)
        }
      },
    }),
  )

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
  app.post(
    '/api/upload/image',
    upload.single('image'),
    imageController.uploadImage,
  )
  // 分片上传端点
  app.post(
    '/api/upload/chunk',
    upload.single('file'),
    fileController.uploadChunk,
  )
  // QQ头像路由
  app.get('/p/qava', imageController.getQQAvatar)
  // 文件下载端点
  app.get('/f/gen/:type/:name', fileController.serveGeneratedFile)
  app.get('/f/up/:type/:name', fileController.serveUploadedFile)
  // 分享链接重定向端点
  app.get('/s/:id', baseController.redirectShare)

  // 通配符路由，返回前端页面, 放在最后
  app.get('*', (req, res) => {
    // logger.info(`GET *: 提供前端页面 ${path.join(process.cwd(), '/dist/index.html')}`) // process.cwd() 和 currentDir 相同
    return res.sendFile(path.join(distDir, 'index.html')) // 使用 distDir 更简洁
  })
  // 启动服务器
  const port = config.server.port ?? 3080
  const host = config.server.host ?? '0.0.0.0'
  const server = app.listen(port, host, () => {
    logger.info(`服务启动成功: http://127.0.0.1:${port}`) // 假设你有一个 logger
  })

  // Socket.io处理
  middleware.enableSocketServer(server) // 假设 middleware 已经被正确引入，这⾥仅为示意
}
