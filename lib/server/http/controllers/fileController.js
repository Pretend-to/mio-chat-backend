import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { makeStandardResponse } from '../utils/responseFormatter.js'
import {
  ensureDirectoryExists,
  generateSafeFilename,
  mergeChunks,
  validateChunks,
} from '../utils/fileUtils.js'
import storageService from '../../../storage/StorageService.js'

// 分片上传端点 - 保持本地存储，因为分片是临时的
// 分片上传端点 - 保持本地存储，因为分片是临时的
export function uploadChunk(req, res) {
  let chunkDir
  let filename
  try {
    if (!req.file) {
      logger.warn('POST /api/upload/chunk: 没有上传文件')
      throw new Error('没有上传文件')
    }

    const { md5, chunkIndex, totalChunks } = req.body

    // 严谨校验 md5，防止路径遍历
    if (!md5 || !/^[a-f0-9]{32}$/i.test(md5)) {
      throw new Error('无效的 MD5 参数')
    }

    chunkDir = path.join('output', 'uploaded', 'chunks', md5)
    ensureDirectoryExists(chunkDir)

    filename = chunkIndex !== undefined ? `chunk-${parseInt(chunkIndex)}` : `temp-${Date.now()}`
    fs.writeFileSync(path.join(chunkDir, filename), req.file.buffer)
    logger.debug(`POST /api/upload/chunk, 文件名: ${filename}, md5: ${md5}, chunkIndex: ${chunkIndex}`)
    // 针对游客限制总分片数 (500MB)
    if (req.guestRecord) {
      const GUEST_MAX_CHUNKS = 100 // 100 * 5MB = 500MB
      if (parseInt(totalChunks) > GUEST_MAX_CHUNKS) {
        throw new Error('文件超过访客单文件上限 (500MB)')
      }
    }

    res.json(makeStandardResponse({
      chunkIndex,
      received: true,
      totalChunks,
    }))
  } catch (error) {
    logger.error(`POST /api/upload/chunk: 分片上传失败: ${error.message}`)
    res.status(400).json({ code: 1, data: null, message: error.message })
  }
}

// 完成文件上传端点（整合所有分片，验证MD5，上传到存储服务）
export async function finalizeUpload(req, res) {
  try {
    const { md5, filename, totalChunks } = req.body
    logger.info(`POST /api/upload/finalize, 文件名: ${filename}, md5: ${md5}`)

    if (!md5 || !filename || !totalChunks) {
      throw new Error('缺少必要参数')
    }

    // 严谨校验 md5
    if (!/^[a-f0-9]{32}$/i.test(md5)) {
      throw new Error('无效的 MD5 参数')
    }

    const safeFilename = generateSafeFilename(filename, md5)
    const ext = path.extname(safeFilename).toLowerCase()

    // 允许的扩展名白名单，防止上传恶意脚本或 HTML (XSS)
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
      '.mp4', '.webm', '.mp3', '.wav',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.txt', '.md', '.json', '.zip', '.gz', '.7z'
    ]
    
    // 注意：如果是 html 这种可能导致 XSS 的，建议强制下载或者进行转换
    // 这里暂时移除 .html / .js 等高危后缀
    if (!allowedExtensions.includes(ext)) {
      throw new Error(`暂不支持上传 ${ext} 格式的文件`)
    }

    const key = `file/${safeFilename}`

    // 检查存储中是否已有该文件
    if (await storageService.exists(key)) {
      let url = await storageService.getUrl(key)
      if (url && url.startsWith('/')) {
        const origin = `${req.protocol}://${req.get('host')}`
        url = `${origin}${url}`
      }
      return res.json(makeStandardResponse({
        url,
        filename: safeFilename,
        message: '文件已存在，直接返回',
      }))
    }

    const chunkDir = path.join('output', 'uploaded', 'chunks', md5)
    const tempDir = path.join('output', 'uploaded', 'chunks', 'temp')
    const outputDir = path.join('output', 'uploaded', 'file')
    ensureDirectoryExists(outputDir)

    // 读取并排序分片
    let chunks = []
    if (fs.existsSync(chunkDir)) {
      chunks = fs.readdirSync(chunkDir)
        .filter((file) => file.startsWith('chunk-'))
        .toSorted((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]))
    }

    // 补全分片（处理可能的 temp 遗留）
    if (chunks.length < parseInt(totalChunks) && fs.existsSync(tempDir)) {
      const tempFiles = fs.readdirSync(tempDir)
        .filter((file) => file.startsWith('temp-'))
      
      if (tempFiles.length > 0) {
        ensureDirectoryExists(chunkDir)
        tempFiles.forEach((tempFile, index) => {
          const newPath = path.join(chunkDir, `chunk-${index}`)
          fs.renameSync(path.join(tempDir, tempFile), newPath)
        })
        chunks = fs.readdirSync(chunkDir)
          .filter((file) => file.startsWith('chunk-'))
          .toSorted((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]))
      }
    }

    validateChunks(chunks, chunkDir, totalChunks)

    const outputPath = path.join(outputDir, safeFilename)
    await mergeChunks(chunks, outputPath, chunkDir)

    // 校验 MD5
    const fileData = fs.readFileSync(outputPath)
    const fileHash = crypto.createHash('md5').update(fileData).digest('hex')

    if (fileHash !== md5) {
      fs.unlinkSync(outputPath)
      throw new Error('文件 MD5 校验失败')
    }

    // 上传到存储适配器 (S3/R2/Local)
    const mimeMap = {
      '.css': 'text/css',
      '.gif': 'image/gif',
      '.jpeg': 'image/jpeg',
      '.jpg': 'image/jpeg',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.md': 'text/markdown',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain',
      '.webp': 'image/webp',
    }
    const contentType = mimeMap[ext] || 'application/octet-stream'

    // 游客总量限制检查 (500MB/小时)
    if (req.guestRecord) {
      const fileSize = fileData.length
      const GUEST_SIZE_LIMIT = 200 * 1024 * 1024 // 200MB
      
      if (req.guestRecord.totalSize + fileSize > GUEST_SIZE_LIMIT) {
        fs.unlinkSync(outputPath)
        throw new Error(`超出游客每小时上传配额 (可用: ${Math.max(0, (GUEST_SIZE_LIMIT - req.guestRecord.totalSize) / 1024 / 1024).toFixed(2)} MB)`)
      }
      
      // 更新已使用配额
      req.guestRecord.totalSize += fileSize
    }

    const result = await storageService.upload(fileData, safeFilename, 'file', {
      contentType,
    })

    // 清理
    fs.rmSync(chunkDir, { force: true, recursive: true })
    if (fs.existsSync(tempDir)) {fs.rmSync(tempDir, { recursive: true, force: true })}
    // 如果不是本地存储，可以删掉本地合并出来的临时文件
    if (storageService.adapter.constructor.name !== 'LocalAdapter') {
      fs.unlinkSync(outputPath)
    }

    let {url} = result
    if (url && url.startsWith('/')) {
      const origin = `${req.protocol}://${req.get('host')}`
      url = `${origin}${url}`
    }

    res.json(makeStandardResponse({
      url,
      filename: safeFilename,
      size: fileData.length,
      md5: fileHash,
    }))
  } catch (error) {
    logger.error(`POST /api/upload/finalize: 完成上传失败: ${error.message}`)
    res.status(400).json({ code: 1, data: null, message: error.message })
  }
}

export function serveGeneratedFile(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')
  }

  const { type } = req.params
  const rawName = Array.isArray(req.params.name)
    ? req.params.name.join('/')
    : String(req.params.name || '')

  const safeRelativePath = path
    .normalize(rawName)
    .replace(/^(\.\.[/\\\\])+/, '')
    .replace(/^[/\\\\]+/, '')
  const baseDir = path.resolve(process.cwd(), 'output', 'generated', 'file')
  const filePath = path.resolve(baseDir, safeRelativePath)

  if (!filePath.startsWith(baseDir + path.sep) && filePath !== baseDir) {
    return res.status(403).send('非法请求')
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return res.status(404).send('文件未找到')
  }

  const ext = path.extname(filePath).toLowerCase()
  const renderableExtensions = new Set([
    '.html',
    '.htm',
    '.css',
    '.js',
    '.mjs',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.svg',
    '.ico',
    '.bmp',
    '.avif',
    '.mp3',
    '.wav',
    '.ogg',
    '.m4a',
    '.aac',
    '.flac',
    '.mp4',
    '.webm',
    '.ogv',
    '.mov',
    '.txt',
    '.md',
    '.json',
    '.xml',
    '.pdf',
  ])

  const isDownload =
    req.query.download === '1' ||
    req.query.download === 'true' ||
    type === 'download'

  if (!isDownload && renderableExtensions.has(ext)) {
    res.sendFile(filePath)
  } else {
    res.download(filePath)
  }
}

export function serveUploadedFile(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')
  }

  const { type } = req.params
  const rawName = Array.isArray(req.params.name)
    ? req.params.name.join('/')
    : String(req.params.name || '')

  // 严格限制 type 只能是允许的子目录
  const allowedTypes = ['file', 'image', 'document', 'video', 'audio']
  if (!allowedTypes.includes(type)) {
    return res.status(403).send('非法请求')
  }

  // 防止路径遍历
  const safeRelativePath = path
    .normalize(rawName)
    .replace(/^(\.\.[/\\\\])+/, '')
    .replace(/^[/\\\\]+/, '')
  const baseDir = path.resolve(process.cwd(), 'output', 'uploaded', type)
  const filePath = path.resolve(baseDir, safeRelativePath)

  if (!filePath.startsWith(baseDir + path.sep) && filePath !== baseDir) {
    return res.status(403).send('非法请求')
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return res.status(404).send('文件未找到')
  }

  const ext = path.extname(filePath).toLowerCase()
  const renderableExtensions = new Set([
    '.html',
    '.htm',
    '.css',
    '.js',
    '.mjs',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.svg',
    '.ico',
    '.bmp',
    '.avif',
    '.mp3',
    '.wav',
    '.ogg',
    '.m4a',
    '.aac',
    '.flac',
    '.mp4',
    '.webm',
    '.ogv',
    '.mov',
    '.txt',
    '.md',
    '.json',
    '.xml',
    '.pdf',
  ])

  const isDownload =
    req.query.download === '1' || req.query.download === 'true'

  // 浏览器能渲染的格式优先提供访问链接（内联展示），避免强制下载
  if (!isDownload && (type === 'image' || renderableExtensions.has(ext))) {
    res.sendFile(filePath)
  } else {
    res.download(filePath)
  }
}
