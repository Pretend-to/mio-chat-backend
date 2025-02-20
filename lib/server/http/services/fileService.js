import multer from 'multer'

const stroge = multer.memoryStorage()

// 创建multer实例，限制每个分片5MB
export const upload = multer({
  storage: stroge,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})
