/* eslint-disable camelcase */

import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import * as fileType from 'file-type'

const getBufferName = async (buffer) => {
  const getBufferExt = async (buffer) => {
    const type = await fileType.fileTypeFromBuffer(buffer)
    return type?.ext
  }
  const getBufferMd5 = (buffer) => {
    const hash = crypto.createHash('md5')
    hash.update(buffer)
    return hash.digest('hex').slice(0, 8)
  }
  const md5 = getBufferMd5(buffer)
  const ext = await getBufferExt(buffer)
  return ext ? `${md5}.${ext}` : md5 // Handle cases where filetype can't be determined
}

async function imgUrlToBase64(url, id = 'default') {
  let final_url = url
  return new Promise((resolve) => {
    const startTime = Date.now()
    const httpOrHttps = final_url.startsWith('https://') ? https : http

    let req = httpOrHttps.get(final_url, (res) => {
      const contentType = res.headers['content-type']

      // 检查支持的图像格式
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
        resolve(`Unsupported image format: ${contentType}`)
        return
      }

      const chunks = []
      res.on('data', (chunk) => {
        chunks.push(chunk)
      })

      res.on('end', () => {
        const data = Buffer.concat(chunks)
        const base64Img = `data:${contentType};base64,${data.toString('base64')}`
        const endTime = Date.now()
        const elapsedTime = endTime - startTime
        logger.debug(`[${id}] Base64转换耗时：${elapsedTime}ms`)
        resolve({
          type: contentType,
          data: base64Img,
        })
      })
    })

    req.on('error', (e) => {
      resolve(`Error: ${e.message}`)
    })
  })
}

async function base64ToImageUrl(baseUrl, base64) {
  const outputDir = path.join(process.cwd(), 'output', 'generated', 'file')

  // 如果目录不存在，则创建目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // 生成唯一的文件名
  const buffer = Buffer.from(base64, 'base64')
  const filename = await getBufferName(buffer)
  const outputPath = path.join(outputDir, filename)

  // 检查文件是否已存在
  if (fs.existsSync(outputPath)) {
    logger.warn(`文件已存在：${outputPath}`)
    return `${baseUrl}/f/gen/image/${filename}`
  } else {
    // 将Base64字符串写入文件
    fs.writeFileSync(outputPath, buffer)
  }

  // 返回图片的URL
  return `${baseUrl}/f/gen/image/${filename}`
}

async function bufferToImageUrl(baseUrl, buffer) {
  const outputDir = path.join(process.cwd(), 'output', 'generated', 'file')

  // 如果目录不存在，则创建目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // 生成唯一的文件名
  const filename = await getBufferName(buffer)
  const outputPath = path.join(outputDir, filename)

  // 检查文件是否已存在
  if (fs.existsSync(outputPath)) {
    logger.warn(`文件已存在：${outputPath}`)
    return `${baseUrl}/f/gen/image/${filename}`
  }

  // 将Buffer写入文件
  fs.writeFileSync(outputPath, buffer)

  // 返回图片的URL
  return `${baseUrl}/f/gen/image/${filename}`
}

export { imgUrlToBase64, getBufferName, base64ToImageUrl, bufferToImageUrl }
