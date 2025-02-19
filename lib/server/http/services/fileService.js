import multer from 'multer'
import path from 'path'
import { ensureDirectoryExists } from '../utils/fileUtils.js'

// 配置multer用于分片上传
const chunkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 使用md5值指定分片目录
    const md5 = req.body?.md5
    let chunkDir
    
    if (md5) {
      chunkDir = path.join('output', 'uploaded', 'chunks', md5)
    } else {
      // 未提供md5，则放到临时目录
      chunkDir = path.join('output', 'uploaded', 'chunks', 'temp')
    }
    
    ensureDirectoryExists(chunkDir)
    cb(null, chunkDir)
  },
  filename: (req, file, cb) => {
    const chunkIndex = req.body?.chunkIndex
    const filename =
      chunkIndex !== undefined ? `chunk-${chunkIndex}` : `temp-${Date.now()}`
    cb(null, filename)
  },
})

// 创建multer实例，限制每个分片5MB
export const upload = multer({
  storage: chunkStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})
