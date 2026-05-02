import { makeStandardResponse } from '../utils/responseFormatter.js'
import storageService from '../../../storage/StorageService.js'
import path from 'path'
import crypto from 'crypto'

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

export async function uploadImage(req, res) {
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
    
    const imageExtension = path.extname(imageFile.originalname) || '.jpg'
    const imageName = `${md5Hash.substring(0, 8)}${imageExtension}`
    const key = `image/${imageName}`
    
    // Check if file already exists in storage
    if (await storageService.exists(key)) {
      const url = await storageService.getUrl(key)
      logger.info(`POST /api/upload/image: 文件已存在, URL: ${url}`)
      return res.json(
        makeStandardResponse({
          url: url,
        }),
      )
    }

    const result = await storageService.upload(imageBuffer, imageName, 'image', {
      contentType: imageFile.mimetype || 'image/jpeg'
    })

    logger.info(`POST /api/upload/image: 图片上传成功. URL: ${result.url}`)
    res.json(
      makeStandardResponse({
        url: result.url,
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

const AVATAR_BASE_PATH = 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons'
const AVATAR_MAP = {
  OpenAI: 'openai.svg',
  Cohere: 'cohere-color.svg',
  Anthropic: 'claude-color.svg',
  Google: 'gemini-color.svg',
  'X.AI': 'grok.svg',
  DeepSeek: 'deepseek-color.svg',
  智谱清言: 'zhipu-color.svg',
  豆包: 'doubao-color.svg',
  '月之暗面 (kimi)': 'moonshot.svg',
  科大讯飞: 'spark-color.svg',
  通义千问: 'qwen-color.svg',
  腾讯混元: 'hunyuan-color.svg',
}

const ADAPTER_ICON_MAP = {
  openai: 'openai.svg',
  gemini: 'gemini-color.svg',
  vertex: 'gemini-color.svg',
  onebot: 'openai.svg',
  deepseek: 'deepseek-color.svg',
  anthropic: 'claude-color.svg',
  cohere: 'cohere-color.svg',
}

/**
 * 获取模型所有者头像 (301 重定向)
 */
export async function getModelAvatar(req, res) {
  const { provider, adapter } = req.query
  let fileName = 'openai.svg'

  if (provider) {
    fileName = AVATAR_MAP[provider] || 'openai.svg'
  } else if (adapter) {
    fileName = ADAPTER_ICON_MAP[adapter.toLowerCase()] || 'openai.svg'
  }

  const url = `${AVATAR_BASE_PATH}/${fileName}`
  
  logger.info(`GET /p/mava?provider=${provider}&adapter=${adapter} -> 301 ${url}`)
  res.redirect(301, url)
}
