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

// 分片上传端点
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
      // 未提供md5，则放到临时目录
      chunkDir = path.join('output', 'uploaded', 'chunks', 'temp')
    }

    ensureDirectoryExists(chunkDir)

    filename =
      chunkIndex !== undefined ? `chunk-${chunkIndex}` : `temp-${Date.now()}`

    fs.writeFileSync(path.join(chunkDir, filename), req.file.buffer)

    const hasAllRequiredParams = md5 && chunkIndex !== undefined && totalChunks

    logger.debug(
      `POST /api/upload/chunk, 文件名: ${filename}, md5: ${md5}, chunkIndex: ${chunkIndex}, totalChunks: ${totalChunks}`,
    )

    if (hasAllRequiredParams) {
      res.json(
        makeStandardResponse({
          chunkIndex,
          totalChunks,
          received: true,
        }),
      )
    } else {
      res.json({ received: true })
    }
  } catch (error) {
    logger.error(`POST /api/upload/chunk: 分片上传失败: ${error.message}`)
    res.status(400).json({
      code: 1,
      message: error.message,
      data: null,
    })
  }
}

// 完成文件上传端点（整合所有分片，验证MD5）
export async function finalizeUpload(req, res) {
  try {
    const { md5, filename, totalChunks } = req.body
    logger.info(
      `POST /api/upload/finalize, 文件名: ${filename}, md5: ${md5}, totalChunks: ${totalChunks}`,
    )

    if (!md5 || !filename || !totalChunks) {
      logger.error('POST /api/upload/finalize: 缺少必要参数')
      throw new Error('缺少必要参数')
    }

    // 检查是否存在相同md5的文件（重复上传）
    const safeFilename = generateSafeFilename(filename, md5)
    const existingFilePath = path.join(
      'output',
      'uploaded',
      'file',
      safeFilename,
    )

    if (fs.existsSync(existingFilePath)) {
      logger.warn(
        `POST /api/upload/finalize: MD5为${md5}的文件已存在. 使用现有文件.`,
      )
      return res.json(
        makeStandardResponse({
          url: `/f/up/file/${safeFilename}`,
          filename: safeFilename,
          message: '文件重复上传，使用旧文件',
        }),
      )
    }

    const chunkDir = path.join('output', 'uploaded', 'chunks', md5)
    const tempDir = path.join('output', 'uploaded', 'chunks', 'temp')
    const outputDir = path.join('output', 'uploaded', 'file')
    ensureDirectoryExists(outputDir)

    // 读取已上传的chunk文件
    let chunks = []
    if (fs.existsSync(chunkDir)) {
      chunks = fs
        .readdirSync(chunkDir)
        .filter((file) => file.startsWith('chunk-'))
        .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]))
    }

    // 如果分片数量不足则尝试从temp目录读取
    if (chunks.length < parseInt(totalChunks) && fs.existsSync(tempDir)) {
      const tempFiles = fs
        .readdirSync(tempDir)
        .filter((file) => file.startsWith('temp-'))
        .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]))

      if (tempFiles.length > 0) {
        ensureDirectoryExists(chunkDir)
        tempFiles.forEach((tempFile, index) => {
          const missingIndex = index
          const newChunkName = `chunk-${missingIndex}`
          const oldPath = path.join(tempDir, tempFile)
          const newPath = path.join(chunkDir, newChunkName)
          fs.renameSync(oldPath, newPath)
          chunks.push(newChunkName)
        })
        // 重新排序
        chunks = chunks.sort(
          (a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]),
        )
      }
    }

    // 校验所有分片是否齐全
    validateChunks(chunks, chunkDir, totalChunks)

    // 生成最终的文件名和输出路径
    const finalFilename = safeFilename
    const outputPath = path.join(outputDir, finalFilename)

    // 合并所有分片到最终文件
    await mergeChunks(chunks, outputPath, chunkDir)

    // 等待写入完成后校验文件MD5
    const fileData = fs.readFileSync(outputPath)
    const fileHash = crypto.createHash('md5')
    fileHash.update(fileData)
    const finalMd5 = fileHash.digest('hex')

    if (finalMd5 !== md5) {
      logger.error(
        `POST /api/upload/finalize: MD5验证失败. 预期: ${md5}, 实际: ${finalMd5}`,
      )
      fs.unlinkSync(outputPath)
      throw new Error('文件验证失败')
    }

    // 合并成功后，清理分片文件夹和temp目录
    fs.rmSync(chunkDir, { recursive: true, force: true })
    if (fs.existsSync(tempDir))
      fs.rmSync(tempDir, { recursive: true, force: true })

    // 返回最终文件信息
    logger.info(
      `POST /api/upload/finalize: 文件上传成功. 文件名: ${finalFilename}, MD5: ${finalMd5}`,
    )
    res.json(
      makeStandardResponse({
        url: `/f/up/file/${finalFilename}`,
        filename: finalFilename,
        size: fileData.length,
        md5: finalMd5,
      }),
    )
  } catch (error) {
    logger.error(`POST /api/upload/finalize: 完成上传失败: ${error.message}`)
    res.status(400).json({
      code: 1,
      message: error.message,
      data: null,
    })
  }
}

// 文件下载端点
export function serveGeneratedFile(req, res) {
  const type = req.params.type
  const name = req.params.name
  const filePath = path.join(process.cwd(), `./output/generated/file/${name}`)
  logger.info(`GET /f/gen/${type}/${name} 从 ${filePath}`)

  if (!fs.existsSync(filePath)) {
    logger.warn(`GET /f/gen/file/${name}: 文件未找到`)
    res.status(404).send('文件未找到')
    return
  }

  if (type == 'download') {
    res.download(filePath)
  } else {
    res.sendFile(filePath)
  }
}

export function serveUploadedFile(req, res) {
  const type = req.params.type
  const name = req.params.name
  const filePath = path.join(process.cwd(), `./output/uploaded/${type}/${name}`)
  logger.info(`GET /f/up/${type}/${name} 从 ${filePath}`)

  if (!fs.existsSync(filePath)) {
    logger.warn(`GET /api/uploaded/${type}/${name}: 文件未找到`)
    res.status(404).send('文件未找到')
    return
  }

  if (type == 'image') {
    res.sendFile(filePath)
  } else {
    res.download(filePath)
  }
}
