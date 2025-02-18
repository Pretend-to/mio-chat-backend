/* eslint-disable camelcase */
import express from 'express'
import http from 'http'
import https from 'https'
import multer from 'multer'
import { savePic } from '../../utils/imgTools.js'
import rateLimit from 'express-rate-limit'
import config from '../config.js'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import logger from '../../utils/logger.js'



// Rate limiter configuration
const serverConfig = config.server // Assuming config is loaded
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: serverConfig.max_rate_pre_min,
  message: '此IP请求过多，请稍后再试',
  keyGenerator: logger.getIP,
})

// Helper function for standard response format
function makeStandardResponse(data) {
  return data ? {
    code: 0,
    message: 'success',
    data
  } : {
    code: 1,
    message: 'failed',
    data: null
  }
}

// Helper function to ensure directories exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

// Helper function to get file extension
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase()
}

// Helper function to generate safe filename
function generateSafeFilename(originalName, md5) {
  const ext = getFileExtension(originalName)
  const safeFilename = `${md5.substring(0, 8)}${ext}`
  return safeFilename
}
function authWsConnection(request) {
  const params = new URLSearchParams(request.url.split('?')[1])
  const token = params.get('mio-chat-token')
  const id = params.get('mio-chat-id')
  if (id == 'undefined') throw new Error('Missing ID')
  const authConfig = config.web
  const userToken = authConfig.user_code
  const adminToken = authConfig.admin_code
  const userInfo = {
    ip: logger.getIP(request),
    origin: request.headers.origin,
    id: id,
    isAdmin: false,
  }
  if (adminToken == token) {
    userInfo.isAdmin = true
  } else if (userToken && token !== userToken) {
    throw new Error('Invalid token')
  }
  return userInfo
}

// Configure multer for chunk uploads
const chunkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 1. 检查 req.body 和 md5
    const md5 = req.body?.md5
    let chunkDir

    if (md5) {
      chunkDir = path.join('output', 'uploaded', 'chunks', md5)
    } else {
      // (可选) 使用临时目录
      chunkDir = path.join('output', 'uploaded', 'chunks', 'temp')
    }

    ensureDirectoryExists(chunkDir)
    cb(null, chunkDir)
  },
  filename: (req, file, cb) => {
    const chunkIndex = req.body?.chunkIndex  // 也检查 chunkIndex
    const filename = chunkIndex !== undefined ? `chunk-${chunkIndex}` : `temp-${Date.now()}` // 使用更安全的文件名
    cb(null, filename)
  }
})



// Create multer instance with size limits
const upload = multer({
  storage: chunkStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max chunk size
  }
})


export function startServer() {
  const app = express()
  const currentDir = process.cwd()
  const distDir = path.join(currentDir, 'dist')

  // Basic Express configuration
  app.use(express.static(distDir))
  app.set('trust proxy', true)
  app.use(express.json({ limit: '8096kb' })) // 确保 json 中间件在 multer 之前

  // Rate limiting middleware
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

  // 原有的路由
  app.get('/api/gateway', (req, res) => {
    res.status(200).json({
      code: 0,
      message: 'success',
      data: {
        name: 'mio-chat-backend',
        version: '1.0.0',
        description: 'mio-chat-backend is a backend service for mio-chat.',
      },
    })
  })

  app.get('/api/proxy', (req, res) => {
    const url = req.query.url
    if (!url) {
      res.status(400).json({
        code: 400,
        message: 'url参数不能为空',
      })
      return
    }
    const client = url.startsWith('https') ? https : http
    client.get(url, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res)
    }).on('error', (err) => {
      res.status(500).json({
        code: 500,
        message: '代理请求失败',
        error: err.message,
      })
    })
  })

  app.get('/api/base_info', (req, res) => {
    res.status(200).json({
      code: 0,
      message: 'success',
      data: {
        full_screen: config.web.full_screen,
        beian: config.web.beian,
        admin_qq: config.onebot.admin_qq || 10000,
        bot_qq: config.onebot.bot_qq,
        title: config.web.title,
      },
    })
  })

  app.get('/api/onebot/plugins', (req, res) => {
    res.status(200).json({
      code: 0,
      message: 'success',
      data: {
        options: config.onebot.plugins.options,
      },
    })
  })

  app.get('/api/openai/:type', (req, res) => {
    const presetsType = req.query.type
    const type = req.params.type
    if (type == 'presets') {
      const presets = config.openai.presets
      const recommended = config.openai.recommendedPresets
      const hidden = config.openai.hiddenPresets
      const nums = req.query.nums ? parseInt(req.query.nums) : 9
      const start = req.query.start ? parseInt(req.query.start) : 0
      const search = req.query.keyword || ''
      if (!search) {
        const list = presetsType == 'system' ? presets : recommended
        res.status(200).json(makeStandardResponse(list.slice(start, start + nums)))
      } else {
        const result = [...presets, ...recommended, ...hidden].filter(item => item.name.includes(search))
        res.status(200).json(makeStandardResponse(result))
      }
    } else if (type == 'tools') {
      res.status(200).json(makeStandardResponse({ tools: middleware.apps }))  // Assuming 'middleware' is available
    }
  })

  app.get('/api/qava', async (req, res) => {
    const nk = req.query.q
    const imageUrl = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${nk}`
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}${response.statusText}`)
      }
      const buffer = await response.arrayBuffer()
      const contentType = response.headers.get('Content-Type')
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', buffer.byteLength)
      res.send(new Buffer.from(buffer))
    } catch (error) {
      console.error(error)
      res.status(500).send('Error fetching image')
    }
  })

  // 文件相关的路由
  app.get('/api/generated/:type/:name', (req, res) => {
    const type = req.params.type
    const name = req.params.name
    const filePath = path.join(process.cwd(), `./output/generated/${type}/${name}`)
    console.log(filePath)
    if (!fs.existsSync(filePath)) {
      res.status(404).send('Not Found')
      return
    }
    if (type == 'file') {
      res.download(filePath)
    } else {
      res.sendFile(filePath)
    }
  })


  // File upload endpoints (Optimized)
  app.post('/api/upload/chunk', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        throw new Error('No file uploaded')
      }

      const { md5, chunkIndex, totalChunks } = req.body
      const hasAllRequiredParams = md5 && chunkIndex !== undefined && totalChunks

      // 如果提供了所有参数, 返回成功. 否则只返回 received: true
      if (hasAllRequiredParams) {
        res.json(makeStandardResponse({
          chunkIndex,
          totalChunks,
          received: true
        }))
      } else {
        res.json({ received: true }) // 仅表示接收到, 不做处理
      }


    } catch (error) {
      logger.error('Chunk upload failed:', error)
      res.status(400).json({
        code: 1,
        message: error.message,
        data: null
      })
    }
  })


  app.post('/api/upload/finalize', async (req, res) => {
    try {
      const { md5, filename } = req.body
      if (!md5 || !filename) {
        throw new Error('Missing required parameters')
      }
      
      // 1. 检查是否已存在具有相同MD5值的文件
      const existingFilePath = path.join('output', 'uploaded', 'file', generateSafeFilename(filename, md5))
      if (fs.existsSync(existingFilePath)) {
        return res.json(makeStandardResponse({
          url: `/api/uploaded/file/${generateSafeFilename(filename, md5)}`,
          filename: generateSafeFilename(filename, md5),
          message: '文件重复上传，使用旧文件'
        }))
      }
  
      const chunkDir = path.join('output', 'uploaded', 'chunks', md5)
      const tempDir = path.join('output', 'uploaded', 'chunks', 'temp')
      const outputDir = path.join('output', 'uploaded', 'file')
      ensureDirectoryExists(outputDir)
  
      // 2. 检查是否有以 md5 命名的文件夹
      let hasMd5Dir = fs.existsSync(chunkDir)
      let chunks = []
      if (hasMd5Dir) {
        chunks = fs.readdirSync(chunkDir)
          .filter(file => file.startsWith('chunk-'))
          .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]))
      }
  
      // 3. 如果没有md5文件夹, 或者md5文件夹里面的文件数量不够, 就去temp里面找
      if(!hasMd5Dir || chunks.length < parseInt(req.body.totalChunks)){
        if (fs.existsSync(tempDir)) {
          const tempFiles = fs.readdirSync(tempDir)
            .filter(file => file.startsWith('temp-'))
            .sort((a,b) => parseInt(a.split('-')[1])- parseInt(b.split('-')[1]))
          chunks = [...chunks, ...tempFiles] // 合并
        }
      }
  
      // 4. 移动临时文件/重命名MD5命名的文件夹
      if (!hasMd5Dir && chunks.length > 0) {
        // 移动所有 temp 文件到 md5 文件夹
        ensureDirectoryExists(chunkDir) // 创建md5文件夹
        for (const tempChunk of chunks.filter(file => file.startsWith('temp-'))) {
          const oldPath = path.join(tempDir, tempChunk)
          const newPath = path.join(chunkDir, tempChunk.replace(/^temp/, 'chunk'))
          fs.renameSync(oldPath, newPath) // 重命名并移动
        }
      }
  
      // Generate final filename
      const finalFilename = generateSafeFilename(filename, md5)
      const outputPath = path.join(outputDir, finalFilename)
      const writeStream = fs.createWriteStream(outputPath)
      
      // Combine chunks
      for (const chunk of chunks) {
        const chunkPath = path.join(chunkDir, chunk.startsWith('chunk') ? chunk : chunk.replace(/^temp/, 'chunk'))
        const chunkData = fs.readFileSync(chunkPath)
        writeStream.write(chunkData)
      }
  
      writeStream.end()
  
      // Wait for file to be written
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
      })
  
      // Verify final file MD5
      const fileHash = crypto.createHash('md5')
      const finalFileData = fs.readFileSync(outputPath)
      fileHash.update(finalFileData)
      const finalMd5 = fileHash.digest('hex')
      if (finalMd5 !== md5) {
        fs.unlinkSync(outputPath) // 验证失败删除文件
        throw new Error('File verification failed')
      }
  
      // Clean up chunks
      fs.rmSync(chunkDir, { recursive: true, force: true })
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, {recursive: true, force: true})
      
      // 返回新文件的信息
      res.json(makeStandardResponse({
        url: `/api/uploaded/file/${finalFilename}`,
        filename: finalFilename,
        size: finalFileData.length,
        md5: finalMd5
      }))
    } catch (error) {
      console.log(error)
      res.status(400).json({
        code: 1,
        message: error.message,
        data: null
      })
    }
  })

  // Image upload endpoint
  app.post('/api/upload/image', async (req, res) => {
    try {
      const { image } = req.body

      if (!image) {
        throw new Error('No image data provided')
      }

      const startTime = Date.now()
      const save = await savePic(image, 'uploaded', 'image')
      const endTime = Date.now()

      logger.info(`图片保存耗时：${endTime - startTime} 毫秒`)

      if (save.error) {
        throw new Error(save.error)
      }

      res.json(makeStandardResponse({
        url: `/api/uploaded/image/${save.name}`
      }))

    } catch (error) {
      logger.error('Image upload failed:', error)
      res.status(400).json({
        code: 1,
        message: error.message,
        data: null
      })
    }
  })

  // File download endpoints
  app.get('/api/uploaded/:type/:name', (req, res) => {
    const { type, name } = req.params
    const filePath = path.join(process.cwd(), 'output', 'uploaded', type, name)

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found')
    }

    if (type === 'file') {
      res.download(filePath)
    } else {
      res.sendFile(filePath)
    }
  })


  // 通配符路由
  app.get('*', (req, res) => {
    return res.sendFile(path.join(process.cwd(), '/dist/index.html'))
  })

  // 启动服务器
  const port = serverConfig.port ?? 3080
  const host = serverConfig.host ?? '0.0.0.0'
  const server = app.listen(port, host, () => {
    logger.info(`服务启动成功: http://127.0.0.1:${port}`)
  })

  // WebSocket handling
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