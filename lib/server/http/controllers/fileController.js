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
export function uploadChunk(req, res) {
  let chunkDir
  let filename
  try {
    if (!req.file) {
      logger.warn('POST /api/upload/chunk: 没有上传文件')
      throw new Error('没有上传文件')
    }

    const { md5, chunkIndex, totalChunks } = req.body

    if (md5) {
      chunkDir = path.join('output', 'uploaded', 'chunks', md5)
    } else {
      chunkDir = path.join('output', 'uploaded', 'chunks', 'temp')
    }

    ensureDirectoryExists(chunkDir)

    filename = chunkIndex !== undefined ? `chunk-${chunkIndex}` : `temp-${Date.now()}`
    fs.writeFileSync(path.join(chunkDir, filename), req.file.buffer)
    logger.debug(`POST /api/upload/chunk, 文件名: ${filename}, md5: ${md5}, chunkIndex: ${chunkIndex}`)

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

    const safeFilename = generateSafeFilename(filename, md5)
    const key = `file/${safeFilename}`

    // 检查存储中是否已有该文件
    if (await storageService.exists(key)) {
      const url = await storageService.getUrl(key)
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
    const result = await storageService.upload(fileData, safeFilename, 'file')

    // 清理
    fs.rmSync(chunkDir, { recursive: true, force: true })
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true })
    // 如果不是本地存储，可以删掉本地合并出来的临时文件
    if (storageService.adapter.constructor.name !== 'LocalAdapter') {
      fs.unlinkSync(outputPath)
    }

    res.json(makeStandardResponse({
      url: result.url,
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
  const filePath = path.join(process.cwd(), `./output/generated/file/${name}`)
  if (!fs.existsSync(filePath)) return res.status(404).send('文件未找到')
  if (type === 'download') {
    res.download(filePath)
  } else {
    res.sendFile(filePath)
  }
}

export function serveUploadedFile(req, res) {
  const { type, name } = req.params
  const filePath = path.join(process.cwd(), `./output/uploaded/${type}/${name}`)
  if (!fs.existsSync(filePath)) return res.status(404).send('文件未找到')
  if (type === 'image') {
    res.sendFile(filePath)
  } else {
    res.download(filePath)
  }
}
