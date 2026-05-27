import { makeStandardResponse } from '../utils/responseFormatter.js'
import storageService from '../../../storage/StorageService.js'
import path from 'path'
import crypto from 'crypto'
import { createRequire } from 'module'
import { getAdapterMetadataList } from '../../../chat/llm/adapters/registry.js'

const require = createRequire(import.meta.url)
let lobeIconsToc = []
try {
  lobeIconsToc = require('@lobehub/icons/es/toc.json')
} catch (error) {
  logger.warn('加载 @lobehub/icons 元数据失败，将使用默认头像:', error.message)
}

let aliasMap = {}
const initPromise = (async () => {
  try {
    const list = await getAdapterMetadataList()
    const map = {}
    for (const meta of list) {
      const avatarId = meta.avatarId || meta.type
      map[meta.type.toLowerCase()] = avatarId.toLowerCase()
      if (meta.avatarAliases) {
        for (const [key, val] of Object.entries(meta.avatarAliases)) {
          map[key.toLowerCase()] = val.toLowerCase()
        }
      }
    }
    aliasMap = map
  } catch (error) {
    logger.error('加载适配器头像别名映射失败:', error.message)
  }
})()

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
      let url = await storageService.getUrl(key)
      if (url && url.startsWith('/')) {
        const origin = `${req.protocol}://${req.get('host')}`
        url = `${origin}${url}`
      }
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

    let finalUrl = result.url
    if (finalUrl && finalUrl.startsWith('/')) {
      const origin = `${req.protocol}://${req.get('host')}`
      finalUrl = `${origin}${finalUrl}`
    }

    logger.info(`POST /api/upload/image: 图片上传成功. URL: ${finalUrl}`)
    res.json(
      makeStandardResponse({
        url: finalUrl,
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

/**
 * 获取模型所有者头像 (301 重定向)
 */
export async function getModelAvatar(req, res) {
  await initPromise
  const { provider, adapter } = req.query
  const clean = (val) => val && val !== 'undefined' ? val.toLowerCase().trim() : ''
  const query = clean(provider) || clean(adapter)
  
  const target = aliasMap[query] || query
  const entry = lobeIconsToc.find(i => i.id.toLowerCase() === target || i.title.toLowerCase() === target)
  const fileName = entry ? `${entry.id.toLowerCase()}${entry.param?.hasColor ? '-color' : ''}.svg` : 'openai.svg'
  
  const url = `https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/${fileName}`
  logger.info(`GET /p/mava?provider=${provider}&adapter=${adapter} -> 301 ${url}`)
  res.redirect(301, url)
}
