import multer from 'multer'

const storage = multer.memoryStorage()

// 创建multer实例，限制每个分片5MB
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})
