import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { makeStandardResponse } from '../utils/responseFormatter.js'
import {
  ensureDirectoryExists,
  generateSafeFilename,
  validateChunks,
  mergeChunks,
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
      totalChunks,
      received: true,
    }))
  } catch (error) {
    logger.error(`POST /api/upload/chunk: 分片上传失败: ${error.message}`)
    res.status(400).json({ code: 1, message: error.message, data: null })
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
        url: url,
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
        .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]))
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
          .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]))
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
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
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
    fs.rmSync(chunkDir, { recursive: true, force: true })
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true })
    // 如果不是本地存储，可以删掉本地合并出来的临时文件
    if (storageService.adapter.constructor.name !== 'LocalAdapter') {
      fs.unlinkSync(outputPath)
    }

    let url = result.url
    if (url && url.startsWith('/')) {
      const origin = `${req.protocol}://${req.get('host')}`
      url = `${origin}${url}`
    }

    res.json(makeStandardResponse({
      url: url,
      filename: safeFilename,
      size: fileData.length,
      md5: fileHash,
    }))
  } catch (error) {
    logger.error(`POST /api/upload/finalize: 完成上传失败: ${error.message}`)
    res.status(400).json({ code: 1, message: error.message, data: null })
  }
}

export function serveGeneratedFile(req, res) {
  const { type, name } = req.params
  // 防止路径遍历：只保留文件名
  const safeName = path.basename(name)
  const filePath = path.join(process.cwd(), './output/generated/file', safeName)
  
  if (!fs.existsSync(filePath)) return res.status(404).send('文件未找到')
  
  // 检查扩展名
  const ext = path.extname(safeName).toLowerCase()
  const isWebType = ['.txt', '.md'].includes(ext) // 移除 .html .htm 防止 XSS

  if (type === 'download') {
    res.download(filePath)
  } else if (isWebType) {
    res.sendFile(filePath)
  } else {
    // 默认作为下载处理，除非明确是安全显示的类型
    res.download(filePath)
  }
}

export function serveUploadedFile(req, res) {
  const { type, name } = req.params
  
  // 严格限制 type 只能是允许的子目录
  const allowedTypes = ['file', 'image']
  if (!allowedTypes.includes(type)) {
    return res.status(403).send('非法请求')
  }

  // 防止路径遍历
  const safeName = path.basename(name)
  const filePath = path.join(process.cwd(), `./output/uploaded/${type}/${safeName}`)
  
  if (!fs.existsSync(filePath)) return res.status(404).send('文件未找到')
  
  const ext = path.extname(safeName).toLowerCase()
  const isWebType = ['.txt', '.md'].includes(ext)

  // 只有图片和特定的纯文本类型才允许 inline 显示
  if (type === 'image' || isWebType) {
    res.sendFile(filePath)
  } else {
    res.download(filePath)
  }
}
