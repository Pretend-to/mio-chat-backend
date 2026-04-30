import https from 'https'
import http from 'http'
import crypto from 'crypto'
import * as fileType from 'file-type'
import storageService from '../lib/storage/StorageService.js'

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

async function base64ToImageUrl(baseUrl, base64String) {
  // 提取 Base64 数据，移除前缀
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '')

  // 将 Base64 解码为 Buffer
  const buffer = Buffer.from(base64Data, 'base64')

  // 生成唯一的文件名
  const filename = await getBufferName(buffer)
  
  // 识别 Content-Type
  const type = await fileType.fileTypeFromBuffer(buffer)
  const contentType = type ? type.mime : 'image/png'
  
  const result = await storageService.upload(buffer, filename, 'image', { contentType })
  
  // 如果 baseUrl 存在且 result.url 是相对路径，进行拼接
  const finalUrl = (baseUrl && result.url.startsWith('/')) ? `${baseUrl}${result.url}` : result.url
  return finalUrl
}

async function bufferToImageUrl(baseUrl, buffer) {
  // 生成唯一的文件名
  const filename = await getBufferName(buffer)
  
  // 识别 Content-Type
  const type = await fileType.fileTypeFromBuffer(buffer)
  const contentType = type ? type.mime : 'image/png'
  
  const result = await storageService.upload(buffer, filename, 'image', { contentType })
  
  const finalUrl = (baseUrl && result.url.startsWith('/')) ? `${baseUrl}${result.url}` : result.url
  return finalUrl
}

export { imgUrlToBase64, getBufferName, base64ToImageUrl, bufferToImageUrl }
