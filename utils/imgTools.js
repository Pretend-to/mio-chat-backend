import https from 'https'
import http from 'http'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import * as fileType from 'file-type'
import storageService from '../lib/storage/StorageService.js'

const getBufferName = async (buffer) => {
  const getBufferExt = async (buf) => {
    const type = await fileType.fileTypeFromBuffer(buf)
    return type?.ext
  }
  const getBufferMd5 = (buf) => {
    const hash = crypto.createHash('md5')
    hash.update(buf)
    return hash.digest('hex').slice(0, 8)
  }
  const md5 = getBufferMd5(buffer)
  const ext = await getBufferExt(buffer)
  return ext ? `${md5}.${ext}` : md5 // Handle cases where filetype can't be determined
}

async function imgUrlToBase64(url, id = 'default') {
  const final_url = url
  return new Promise((resolve) => {
    const startTime = Date.now()
    const httpOrHttps = final_url.startsWith('https://') ? https : http

    const req = httpOrHttps.get(final_url, (res) => {
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
  
  // Dedup: true —— 文件名基于 MD5 内容寻址，相同内容幂等返回已有 URL，避免生成序号副本
  const result = await storageService.upload(buffer, filename, 'image', { contentType, dedup: true })
  
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
  
  const result = await storageService.upload(buffer, filename, 'image', { contentType, dedup: true })
  
  const finalUrl = (baseUrl && result.url.startsWith('/')) ? `${baseUrl}${result.url}` : result.url
  return finalUrl
}

async function getLocalFileAsBase64(url) {
  try {
    let filePath
    if (url.startsWith('file://')) {
      try {
        filePath = new URL(url).pathname
      } catch {
        filePath = url.replace(/^file:\/\//, '')
      }
    } else if (url.startsWith('/f/up/')) {
      const parts = url.split('/')
      const type = parts[3]
      const name = parts[4]
      filePath = path.join(process.cwd(), 'output', 'uploaded', type, name)
    } else if (url.startsWith('/f/gen/')) {
      const parts = url.split('/')
      const name = parts[4]
      filePath = path.join(process.cwd(), 'output', 'generated', 'file', name)
    } else if (path.isAbsolute(url)) {
      filePath = url
    } else if (url.startsWith('./') || url.startsWith('../') || url.startsWith('output/')) {
      filePath = path.join(process.cwd(), url)
    } else if (url.startsWith('/')) {
      filePath = path.join(process.cwd(), url)
    }

    if (filePath && fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath)
      const type = await fileType.fileTypeFromBuffer(buffer)
      const ext = path.extname(filePath).toLowerCase()
      const mimeMap = {
        '.gif': 'image/gif',
        '.jpeg': 'image/jpeg',
        '.jpg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml'
      }
      const mimeType = type?.mime || mimeMap[ext] || 'image/jpeg'
      return `data:${mimeType};base64,${buffer.toString('base64')}`
    }
  } catch (error) {
    if (typeof logger !== 'undefined') {
      logger.error('Failed to read local file to base64:', error)
    } else {
      console.error('Failed to read local file to base64:', error)
    }
  }
  return null
}

/**
 * 统一将各种图片资源（HTTP URL、file:// URL、/f/up/... 本地虚拟存储路径、本地绝对路径、Base64）解析为标准 Data URI
 * @param {string} url - 图片路径或 URL
 * @param {string} [id] - 日志追踪 ID
 * @returns {Promise<string>} 标准 data:image/...;base64,... 格式的 Data URI
 */
/**
 * 判定字符串是否为「裸 base64 载荷」（不含 data: 前缀）。
 * 必须严格校验字符集：仅凭"长度>50 且无空白"会把 blob:/相对路径等地址误判为 base64。
 */
function isRawBase64Payload(value) {
  if (typeof value !== 'string' || value.length <= 50) return false
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value)
}

/**
 * 识别常见图片格式的 magic bytes（对头 24 字节的十六进制串做匹配）。
 * WebP 的签名跨 12 字节：'RIFF' + 4 字节段长度（可变，用 .{8} 跳过）+ 'WEBP'。
 */
const IMAGE_MAGIC_SIGNATURES = [
  { mime: 'image/png', hex: /^89504e47/ },
  { mime: 'image/jpeg', hex: /^ffd8ff/ },
  { mime: 'image/gif', hex: /^47494638/ },
  { mime: 'image/webp', hex: /^52494646.{8}57454250/ },
]

/**
 * 从裸 base64 载荷的头部字节推断图片 MIME，识别不出来返回 null。
 *
 * 为什么只解头部：识别只需要 magic bytes。base64 每 4 字符 = 3 字节，
 * 取前 32 字符即 24 字节，已覆盖最长的签名（WebP 需要 12 字节），
 * 没必要为了看一眼签名就把几 MB 的载荷整体解码。
 *
 * 为什么识别不出来时返回 null 而不是猜一个（旧实现硬编码 image/jpeg）：
 * 裸载荷既没有扩展名也没有 Content-Type，字节本身是唯一真相。贴错 MIME 的代价是
 * 上游要么 400、要么按错误格式解码 —— 整轮请求被一张图打挂（blob: 分支历史上就是这么炸的）；
 * 返回 null 的代价只是丢掉这一张图。两害相权，不猜。
 */
function sniffImageMime(rawBase64) {
  const headHex = Buffer.from(rawBase64.slice(0, 32), 'base64').toString('hex')
  const hit = IMAGE_MAGIC_SIGNATURES.find(({ hex }) => hex.test(headHex))
  return hit ? hit.mime : null
}

async function resolveImageAsBase64(url, id = 'default') {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('data:')) return url

  // 0. 浏览器本地临时地址（blob:）只存在于用户浏览器内，后端永远取不到。
  //    历史上这里会把它当成裸 base64 包装成 data:image/jpeg;base64,blob:http://...，
  //    上游随即报 400 Invalid base64 data，并且这轮消息会一直留在上下文里反复触发。
  if (/^blob:/i.test(url)) {
    logger.warn(`[${id}] 图片为浏览器本地 blob 地址，后端无法解析，已跳过：${url}`)
    return null
  }

  // 1. 本地文件（file:// 协议、虚拟存储 /f/up/...、/f/gen/...、绝对路径或相对路径）
  if (
    url.startsWith('file://') ||
    url.startsWith('/f/up/') ||
    url.startsWith('/f/gen/') ||
    url.startsWith('output/') ||
    url.startsWith('./') ||
    (path.isAbsolute(url) && fs.existsSync(url))
  ) {
    const localBase64 = await getLocalFileAsBase64(url)
    if (localBase64) return localBase64
  }

  // 2. HTTP / HTTPS 远程图片
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const res = await imgUrlToBase64(url, id)
    if (typeof res === 'object' && res?.data) return res.data
    if (typeof res === 'string' && res.startsWith('data:')) return res
    // 远程取图失败：原样回传 URL，交给上游自行拉取
    return url
  }

  // 3. 纯 Base64 字符串（不带 data: 前缀）：MIME 必须从载荷字节推断，不能硬编码。
  //    硬编码 image/jpeg 会把 PNG/WebP 载荷声明成 jpeg，上游 400 或按错误格式解码。
  if (isRawBase64Payload(url)) {
    const mime = sniffImageMime(url)
    if (!mime) {
      logger.warn(
        `[${id}] 裸 base64 载荷不是可识别的图片格式（PNG/JPEG/GIF/WebP），已跳过：${url.slice(0, 32)}...`,
      )
      return null
    }
    return `data:${mime};base64,${url}`
  }

  // 4. 既不是可解析地址、也不是合法 base64：直接丢弃。
  //    绝不能把脏值包装成 base64 丢给上游，否则整轮请求会被 400 打挂。
  logger.warn(
    `[${id}] 无法解析的图片地址，已跳过：${String(url).slice(0, 120)}`,
  )
  return null
}

export { imgUrlToBase64, getBufferName, base64ToImageUrl, bufferToImageUrl, getLocalFileAsBase64, resolveImageAsBase64 }
