import { makeStandardResponse } from '../utils/responseFormatter.js'
import { savePic } from '../../../../utils/imgTools.js'


// QQ头像获取路由
export async function getQQAvatar(req, res) {
  const nk = req.query.q
  logger.info(`GET /api/qava?q=${nk}`)
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

// 图片上传端点
export async function uploadImage(req, res) {
  try {
    const { image } = req.body
    logger.debug('POST /api/upload/image')
    
    if (!image) {
      logger.warn('POST /api/upload/image: 未提供图片数据')
      throw new Error('未提供图片数据')
    }
    
    const startTime = Date.now()
    const save = await savePic(image, 'uploaded', 'image')
    const endTime = Date.now()
    logger.info(`图片保存耗时：${endTime - startTime} 毫秒`)
    
    if (save.error) {
      logger.error(`POST /api/upload/image: 图片保存失败: ${save.error}`)
      throw new Error(save.error)
    }
    
    logger.info(`POST /api/upload/image: 图片上传成功. URL: /api/uploaded/image/${save.name}`)
    res.json(
      makeStandardResponse({
        url: `/api/uploaded/image/${save.name}`,
      })
    )
  } catch (error) {
    logger.error(`POST /api/upload/image: 图片上传失败: ${error.message}`)
    res.status(400).json({
      code: 1,
      message: error.message,
      data: null,
    })
  }
}