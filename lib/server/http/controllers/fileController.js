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

// ============================================================
// 上传类型 / 大小分级策略（三档：guest / user / admin）
//   - guest：收紧白名单，单文件 200MB + 每小时总量配额（限流在中间件）
//   - user ：白名单额外放开代码/文本类（含 html/js，供 AI 参考），单文件 256MB
//   - admin：类型不限制，单文件 512MB（用户确认的默认上限）
// 无论哪一档，落库/回吐时都过同源安全响应头（见 serveUploadedFile），
// 因此“放开 html/js”不再等于“可被内联执行”。
// ============================================================

const MB = 1024 * 1024
const capMB = (envKey, defMB) => {
  const raw = parseInt(process.env[envKey], 10)
  return Number.isFinite(raw) && raw > 0 ? raw * MB : defMB * MB
}
const SIZE_CAP = {
  guest: capMB('UPLOAD_MAX_GUEST_MB', 200),
  user: capMB('UPLOAD_MAX_USER_MB', 256),
  admin: capMB('UPLOAD_MAX_ADMIN_MB', 512), // ← 默认 512MB
}

const GUEST_ALLOW = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.mp4', '.webm', '.mp3', '.wav',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.md', '.json', '.zip', '.gz', '.7z',
])

// 代码/文本类：仅对已鉴权用户/管理员放开（游客仍走上面的收紧表）
const CODE_TYPES = [
  '.html', '.htm', '.js', '.mjs', '.cjs', '.css',
  '.ts', '.tsx', '.jsx', '.vue',
  '.py', '.java', '.go', '.rs', '.c', '.h', '.cpp', '.hpp',
  '.sh', '.bat', '.ps1', '.rb', '.php', '.sql',
  '.yml', '.yaml', '.xml', '.csv', '.ini', '.conf', '.log',
]
const USER_ALLOW = new Set([...GUEST_ALLOW, ...CODE_TYPES])

function resolveTier(req) {
  const t = req.uploadTier
  if (t === 'admin' || t === 'user' || t === 'guest') return t
  return 'guest'
}

function isExtAllowed(ext, tier) {
  if (tier === 'admin') return true // 管理员类型不限制
  if (tier === 'user') return USER_ALLOW.has(ext)
  return GUEST_ALLOW.has(ext)
}

// 只有这些后缀可“内联渲染”，其余（html/js/css/svg/xml 及一切未知）一律强制下载，
// 杜绝同源内联执行。svg 虽是图片，但内联可携带脚本 → 归入强制下载。
const INLINE_SAFE = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.bmp', '.avif',
  '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac',
  '.mp4', '.webm', '.ogv', '.mov',
  '.pdf',
  '.txt', '.md', '.json', '.csv', '.log', '.yml', '.yaml',
])

// ============================================================
// 孤儿分片定时清扫：清理“只传了分片、从未 finalize / finalize 失败”的残留目录
//   （按 mtime 判断，超过 TTL 视为放弃）
// ============================================================
const CHUNK_TTL_MS = 6 * 60 * 60 * 1000 // 6 小时
function sweepStaleChunks() {
  try {
    const root = path.join('output', 'uploaded', 'chunks')
    if (!fs.existsSync(root)) return
    const now = Date.now()
    for (const d of fs.readdirSync(root)) {
      if (d === 'temp') continue
      const p = path.join(root, d)
      try {
        if (!fs.statSync(p).isDirectory()) continue
        if (now - fs.statSync(p).mtimeMs > CHUNK_TTL_MS) {
          fs.rmSync(p, { recursive: true, force: true })
        }
      } catch { /* ignore single entry */ }
    }
  } catch (e) {
    if (typeof logger !== 'undefined') logger.debug?.(`分片清扫跳过: ${e.message}`)
  }
}
const sweeper = setInterval(sweepStaleChunks, 30 * 60 * 1000)
if (typeof sweeper.unref === 'function') sweeper.unref()

// 分片上传端点 - 保持本地存储，因为分片是临时的
export function uploadChunk(req, res) {
  let chunkDir
  let filename
  try {
    if (!req.file) {
      logger.warn('POST /api/upload/chunk: 没有上传文件')
      throw new Error('没有上传文件')
    }

    const { md5, chunkIndex, totalChunks, filename: originalName } = req.body

    // 严谨校验 md5，防止路径遍历
    if (!md5 || !/^[a-f0-9]{32}$/i.test(md5)) {
      throw new Error('无效的 MD5 参数')
    }

    // 早期类型校验：第一片落地前就按“档位”判定扩展名是否允许，
    // 避免“整个大文件传完才发现格式不支持”白烧带宽/磁盘。
    if (originalName) {
      const ext = path.extname(String(originalName)).toLowerCase()
      if (ext && !isExtAllowed(ext, resolveTier(req))) {
        throw new Error(`暂不支持上传 ${ext || '无扩展名'} 格式的文件`)
      }
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
  let chunkDir
  let tempDir
  let outputPath
  let uploadDone = false
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
    const tier = resolveTier(req)

    // 类型白名单（按档位）；管理员不限制
    if (!isExtAllowed(ext, tier)) {
      throw new Error(`暂不支持上传 ${ext || '无扩展名'} 格式的文件`)
    }

    // 提前定义目录，保证任何失败路径都能在 finally 里清掉分片
    chunkDir = path.join('output', 'uploaded', 'chunks', md5)
    tempDir = path.join('output', 'uploaded', 'chunks', 'temp')
    const outputDir = path.join('output', 'uploaded', 'file')

    const key = `file/${safeFilename}`

    // 秒传：存储中已存在则直接返回（残留分片交给 finally 清理）
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

    outputPath = path.join(outputDir, safeFilename)
    await mergeChunks(chunks, outputPath, chunkDir)

    // 校验 MD5
    const fileData = fs.readFileSync(outputPath)
    const fileHash = crypto.createHash('md5').update(fileData).digest('hex')

    if (fileHash !== md5) {
      fs.unlinkSync(outputPath)
      outputPath = null // 已手动删除，避免 finally 重复删
      throw new Error('文件 MD5 校验失败')
    }

    // 分级大小上限（admin 512MB / user 256MB / guest 200MB）
    const fileSize = fileData.length
    if (fileSize > SIZE_CAP[tier]) {
      throw new Error(`文件超过${tier === 'admin' ? '管理员' : tier === 'user' ? '用户' : '访客'}单文件上限 (${(SIZE_CAP[tier] / MB).toFixed(0)}MB)`)
    }

    // 游客每小时总量配额（其余档位不受此限）
    if (req.guestRecord) {
      if (req.guestRecord.totalSize + fileSize > SIZE_CAP.guest) {
        throw new Error(`超出游客每小时上传配额 (可用: ${Math.max(0, (SIZE_CAP.guest - req.guestRecord.totalSize) / MB).toFixed(2)} MB)`)
      }
      req.guestRecord.totalSize += fileSize
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

    const result = await storageService.upload(fileData, safeFilename, 'file', {
      contentType,
    })
    uploadDone = true

    // 非本地存储：本地合并文件仅用于哈希，删除；本地存储则保留它（即被服务的文件）
    if (storageService.adapter.constructor.name !== 'LocalAdapter') {
      fs.unlinkSync(outputPath)
      outputPath = null
    }

    let { url } = result
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
  } finally {
    // 无论成功/失败，都清掉本次分片目录，杜绝孤儿 chunk 泄漏
    if (chunkDir) fs.rmSync(chunkDir, { force: true, recursive: true })
    if (tempDir && fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true })
    // 失败时若仍残留合并出来的临时文件，一并删除（成功且为本地存储时 outputPath 会被置 null 保留）
    if (!uploadDone && outputPath && fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath) } catch { /* ignore */ }
    }
  }
}

// 给所有同源文件响应统一加上“不可信内容安全头”
function applyUnsafeContentHeaders(res) {
  if (typeof res.setHeader !== 'function') return
  res.setHeader('X-Content-Type-Options', 'nosniff')
  // sandbox（不带 allow-same-origin）→ 即便被顶层打开也在独立不透明源执行，读不到主站 cookie/存储
  res.setHeader('Content-Security-Policy', 'sandbox; default-src \'none\'')
  res.setHeader('Referrer-Policy', 'no-referrer')
}

// 上传文件的访问与下载（同源唯一出口）
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
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '')
  const baseDir = path.resolve(process.cwd(), 'output', 'uploaded', type)
  const filePath = path.resolve(baseDir, safeRelativePath)

  if (!filePath.startsWith(baseDir + path.sep) && filePath !== baseDir) {
    return res.status(403).send('非法请求')
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return res.status(404).send('文件未找到')
  }

  applyUnsafeContentHeaders(res)

  const ext = path.extname(filePath).toLowerCase()
  const isDownload =
    req.query.download === '1' || req.query.download === 'true'

  // 只有“安全可渲染”后缀才内联；其余（html/js/css/svg/xml/未知）强制下载，
  // 从根本上切断同源内联执行（stored XSS）路径。
  if (!isDownload && INLINE_SAFE.has(ext)) {
    res.sendFile(filePath)
  } else {
    res.download(filePath)
  }
}
