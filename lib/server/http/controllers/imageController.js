import { makeStandardResponse } from '../utils/responseFormatter.js'
import { ensureDirectoryExists } from '../utils/fileUtils.js'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
// QQ头像获取路由
export async function getQQAvatar(req, res) {
  const nk = req.query.q || 1099834705 // 默认的QQ号
  logger.info(`GET /p/qava?q=${nk}`)
  const imageUrl = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${nk}`
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`获取图片失败: ${response.status} ${response.statusText}`)
    }
    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('Content-Type')
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', buffer.byteLength)
    res.send(Buffer.from(buffer))
  } catch (error) {
    logger.error(`GET /api/qava: 获取图片错误: ${error.message}`)
    res.status(500).send('获取图片错误')
  }
}
export function uploadImage(req, res) {
  try {
    const imageFile = req.file
    logger.debug('POST /api/upload/image')
    if (!imageFile) {
      logger.warn('POST /api/upload/image: 未提供图片数据')
      return res.status(400).json({
        code: 1,
        message: '未提供图片数据',
        data: null,
      })
    }
    const imageBuffer = imageFile.buffer
    const md5Hash = crypto
      .createHash('md5')
      .update(imageBuffer)
      .digest('hex')
      .substring(0, 6) // 截取 MD5 的前 6 位
    const imageExtension = path.extname(imageFile.originalname)
    const imageName = `${md5Hash}${imageExtension}`
    const uploadDir = path.join('output', 'uploaded', 'image')
    const uploadPath = path.join(uploadDir, imageName)
    ensureDirectoryExists(uploadDir)
    if (fs.existsSync(uploadPath)) {
      logger.info(
        `POST /api/upload/image: 文件已存在, URL: /f/up//image/${imageName}`,
      )
      return res.json(
        makeStandardResponse({
          url: `/f/up/image/${imageName}`,
        }),
      )
    }
    fs.writeFileSync(uploadPath, imageBuffer)
    logger.info(
      `POST /api/upload/image: 图片上传成功. URL: /f/up/image/${imageName}`,
    )
    res.json(
      makeStandardResponse({
        url: `/f/up/image/${imageName}`,
      }),
    )
  } catch (error) {
    logger.error(`POST /api/upload/image: 图片上传失败: ${error.message}`)
    res.status(500).json({
      code: 1,
      message: error.message,
      data: null,
    })
  }
}
