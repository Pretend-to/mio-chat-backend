import express from 'express'
import path from 'path'
import crypto from 'crypto' // 引入 crypto 模块
import fs from 'fs'
import expressStaticGzip from 'express-static-gzip'
import { accessLogger } from './middleware/accessLog.js'
import { authConfigAPI } from './middleware/authConfig.js'
import { upload } from './services/fileService.js'
import * as baseController from './controllers/baseController.js'
import * as openaiController from './controllers/openaiController.js'
import * as imageController from './controllers/imageController.js'
import * as fileController from './controllers/fileController.js'
import * as configController from './controllers/configController.js'
import * as pluginController from './controllers/pluginController.js'
import config from '../../config.js'

import logger from '../../../utils/logger.js'
export async function startServer() {
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


  // 访问日志中间件（排除健康检查端点）
  app.use((req, res, next) => {
    if (req.path === '/api/health') {
      return next()
    }
    accessLogger(req, res, next)
  })

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

  // 健康检查路由
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'mio-chat-backend',
      version: process.env.npm_package_version || '1.0.0'
    })
  })
  // 基本网关路由
  app.get('/api/gateway', baseController.getGateway)
  // 基本信息路由
  app.get('/api/base_info', baseController.getBaseInfo)
  // Onebot插件路由
  app.get('/api/onebot/plugins', baseController.getOnebotPlugins)
  // OpenAI预设和工具路由
  app.get('/api/openai/:type', asyncHandler(openaiController.getOpenAIResources))
  // 分享获取路由
  app.get('/api/share', asyncHandler(baseController.getShare))
  // 分享设置路由
  app.post('/api/share/set', asyncHandler(baseController.setShare))
  
  // 配置管理路由（需要管理员验证）
  app.get('/api/config', authConfigAPI, asyncHandler(configController.getFullConfig))

  // 预设管理路由（需要管理员验证）- 必须放在通用路由之前
  app.get('/api/config/presets', authConfigAPI, asyncHandler(configController.getPresets))
  app.get('/api/config/presets/:name', authConfigAPI, asyncHandler(configController.getPreset))
  app.post('/api/config/presets', authConfigAPI, asyncHandler(configController.createPreset))
  app.put('/api/config/presets/:name', authConfigAPI, asyncHandler(configController.updatePreset))
  app.delete('/api/config/presets/:name', authConfigAPI, asyncHandler(configController.deletePreset))
  app.post('/api/config/presets/reload', authConfigAPI, asyncHandler(configController.reloadPresetsEndpoint))
  app.post('/api/config/presets/import',
    authConfigAPI,
    upload.single('file'),
    asyncHandler(configController.importPreset)
  )
  app.get('/api/config/presets/:name/export', authConfigAPI, asyncHandler(configController.exportPreset))
  app.post('/api/config/presets/validate', authConfigAPI, asyncHandler(configController.validatePresetEndpoint))
  app.post('/api/config/presets/batch-delete', authConfigAPI, asyncHandler(configController.batchDeletePresetsEndpoint))

  // LLM适配器管理路由（需要管理员验证）- 必须放在通用路由之前
  app.post('/api/config/llm/:adapterType', authConfigAPI, asyncHandler(configController.addLLMInstance))
  app.put('/api/config/llm/:adapterType/:index', authConfigAPI, asyncHandler(configController.updateLLMInstance))
  app.delete('/api/config/llm/:adapterType/:index', authConfigAPI, asyncHandler(configController.deleteLLMInstance))
  app.post('/api/config/llm/:adapterType/:index/refresh-models', authConfigAPI, asyncHandler(configController.refreshModels))
  app.post('/api/config/llm/:adapterType/test-models', authConfigAPI, asyncHandler(configController.testLLMModels))

  // 适配器类型管理路由（需要管理员验证）- 必须放在通用路由之前
  app.get('/api/config/adapter-types', authConfigAPI, asyncHandler(configController.getAdapterTypes))

  // 其他配置管理路由（需要管理员验证）
  app.post('/api/config/reset', authConfigAPI, asyncHandler(configController.resetConfig))
  app.post('/api/config/validate', authConfigAPI, asyncHandler(configController.validateConfigEndpoint))
  // 刷新模型列表（支持刷新所有或单个实例）
  app.post('/api/config/refresh-models', authConfigAPI, asyncHandler(configController.refreshModels))

  // 通用配置节点路由（必须放在最后，作为兜底）
  app.get('/api/config/:section', authConfigAPI, asyncHandler(configController.getConfigSection))
  app.put('/api/config', authConfigAPI, asyncHandler(configController.updateConfig))
  app.put('/api/config/:section', authConfigAPI, asyncHandler(configController.updateConfigSection))
  
  // 插件管理路由（需要管理员验证）
  app.get('/api/plugins', authConfigAPI, asyncHandler(pluginController.listPlugins))
  app.get('/api/plugins/:pluginName', authConfigAPI, asyncHandler(pluginController.getPlugin))
  app.get('/api/plugins/:pluginName/config', authConfigAPI, asyncHandler(pluginController.getPluginConfig))
  app.put('/api/plugins/:pluginName/config', authConfigAPI, asyncHandler(pluginController.updatePluginConfig))
  app.get('/api/plugins/:pluginName/tools', authConfigAPI, asyncHandler(pluginController.getPluginTools))
  app.post('/api/plugins/:pluginName/tools/:toolName/debug', authConfigAPI, asyncHandler(pluginController.debugTool))
  app.post('/api/plugins/:pluginName/reload', authConfigAPI, asyncHandler(pluginController.reloadPlugin))
  app.post('/api/plugins/:pluginName/toggle', authConfigAPI, asyncHandler(pluginController.togglePlugin))
  app.post('/api/plugins/reload-all', authConfigAPI, asyncHandler(pluginController.reloadAllPlugins))
  
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
  // 环境变量优先级最高
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : (config.server.port ?? 3080)
  const host = process.env.HOST || config.server.host || '0.0.0.0'
  const server = app.listen(port, host, () => {
    logger.info(`服务启动成功: http://127.0.0.1:${port}`) // 假设你有一个 logger
  })

  // 设置服务器超时时间（6分钟，给调试接口足够时间）
  server.timeout = 6 * 60 * 1000 // 6分钟
  server.keepAliveTimeout = 6 * 60 * 1000 // 6分钟
  
  // Socket.io处理
  // 使用全局中间件实例而不是创建新的实例
  if (!global.middleware) {
    const Middleware = (await import('../../middleware.js')).default
    global.middleware = new Middleware()
  }
  global.middleware.enableSocketServer(server)
  
  // 返回服务器实例以便在主应用中管理
  return server
}
