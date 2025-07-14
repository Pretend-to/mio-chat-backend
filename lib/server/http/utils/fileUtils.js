import fs from 'fs'
import path from 'path'

// 确保目录存在
export function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    logger.info(`创建目录: ${dirPath}`)
    fs.mkdirSync(dirPath, { recursive: true })
  } else {
    logger.debug(`目录已存在: ${dirPath}`)
  }
}

// 获取文件扩展名
export function getFileExtension(filename) {
  const ext = path.extname(filename).toLowerCase()
  logger.debug(`文件 ${filename} 的扩展名: ${ext}`)
  return ext
}

// 生成安全的文件名
export function generateSafeFilename(originalName, md5) {
  const ext = getFileExtension(originalName)
  const safeFilename = `${md5.substring(0, 8)}${ext}`
  logger.debug(
    `生成安全文件名. 原始名: ${originalName}, MD5: ${md5}, 安全名: ${safeFilename}`,
  )
  return safeFilename
}

// 合并文件分片
export async function mergeChunks(chunks, outputPath, chunkDir) {
  logger.info(`合并分片到 ${outputPath} 从 ${chunkDir}`)
  const writeStream = fs.createWriteStream(outputPath)

  for (const chunk of chunks) {
    const chunkPath = path.join(
      chunkDir,
      chunk.startsWith('chunk-') ? chunk : chunk.replace(/^temp-/, 'chunk-'),
    )
    const chunkData = fs.readFileSync(chunkPath)
    await new Promise((resolve, reject) => {
      writeStream.write(chunkData, (error) => {
        if (error) {
          logger.error(`写入分片到流时出错: ${error.message}`)
          reject(error)
        } else resolve()
      })
    })
  }

  await new Promise((resolve) => writeStream.end(resolve))
  logger.info(`分片成功合并到 ${outputPath}`)
}

// 验证所有分片是否存在且数量正确
export function validateChunks(chunks, chunkDir, totalChunks) {
  if (chunks.length !== parseInt(totalChunks)) {
    const errorMessage = `分片缺失: 预期 ${totalChunks}, 实际 ${chunks.length}`
    logger.error(errorMessage)
    throw new Error(errorMessage)
  }

  for (let i = 0; i < totalChunks; i++) {
    const expectedFilename = `chunk-${i}`
    const chunkPath = path.join(chunkDir, expectedFilename)
    if (!fs.existsSync(chunkPath)) {
      const errorMessage = `缺失分片: ${i}`
      logger.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  logger.info(`所有 ${totalChunks} 个分片已在 ${chunkDir} 中验证`)
}
