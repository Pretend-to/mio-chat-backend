import { makeStandardResponse } from '../utils/responseFormatter.js'
import storageService from '../../../storage/StorageService.js'
import path from 'path'
import crypto from 'crypto'
import { createRequire } from 'module'
import { getAdapterMetadataList } from '../../../chat/llm/adapters/registry.js'
import config from '../../../config.js'

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
 * 通过自定义的 providerId (即实例名称 instanceName) 获取真正的 adapterType
 */
function getAdapterTypeByProviderId(providerId) {
  if (!providerId) return ''
  const providerIdLower = providerId.toLowerCase().trim()
  const llmAdapters = config.llm_adapters || {}
  
  for (const [adapterType, instances] of Object.entries(llmAdapters)) {
    if (!Array.isArray(instances)) continue
    let counter = 0
    for (const inst of instances) {
      counter++
      const displayName = inst.name || `${adapterType}-${counter}`
      if (displayName.toLowerCase().trim() === providerIdLower) {
        return adapterType
      }
    }
  }
  return ''
}

/**
 * 获取模型所有者头像 (301 重定向)
 */
export async function getModelAvatar(req, res) {
  await initPromise
  const { provider, adapter, model } = req.query
  const clean = (val) => val && val !== 'undefined' ? val.toLowerCase().trim() : ''
  
  let target = ''
  let isDirectModelMatch = false

  if (model && model !== 'undefined') {
    let modelLower = model.toLowerCase().trim()
    // 如果是完整的资源路径（包含 /），取最后一部分作为模型标识，比如 "publishers/google/models/gemini-1.5-flash-001"
    if (modelLower.includes('/')) {
      const parts = modelLower.split('/')
      modelLower = parts[parts.length - 1]
    }

    // 1. 优先在 lobeIconsToc 中匹配模型名称或其前缀/关键字
    const entry = lobeIconsToc.find(i => {
      const id = i.id.toLowerCase()
      const title = i.title.toLowerCase()
      // 如果是通用的 openai，但模型里没有写 openai，应该跳过，让关键字匹配到 openai.svg
      if (id === 'openai' && !modelLower.includes('openai')) return false
      return modelLower.includes(id) || modelLower.includes(title)
    })
    if (entry) {
      target = entry.id.toLowerCase()
      isDirectModelMatch = true
    } else {
      // 2. 如果 lobeIconsToc 中没有直接匹配，利用系统的 model_owners 关键字匹配其 owner 厂商
      try {
        const owners = config.getModelsOwners() || []
        const matchedOwner = owners.find(({ keywords }) =>
          keywords.some((keyword) => modelLower.includes(keyword.toLowerCase()))
        )
        if (matchedOwner) {
          target = matchedOwner.owner.toLowerCase()
        }
      } catch (err) {
        logger.error(`getModelAvatar: 匹配模型所有者失败: ${err.message}`)
      }
    }
  }

  if (!target) {
    // 优先尝试将前端传入的自定义 providerId 转换为后端对应的 adapterType
    const resolvedProviderType = getAdapterTypeByProviderId(provider)
    const query = clean(resolvedProviderType) || clean(provider) || clean(adapter)
    target = aliasMap[query] || query
  }

  // 如果不是直接的模型匹配，则通过别名转换
  if (!isDirectModelMatch) {
    target = aliasMap[target] || target
  }

  const entry = lobeIconsToc.find(i => i.id.toLowerCase() === target || i.title.toLowerCase() === target)
  const fileName = entry ? `${entry.id.toLowerCase()}${entry.param?.hasColor ? '-color' : ''}.svg` : 'openai.svg'

  const url = `https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/${fileName}`
  logger.info(`GET /p/mava?model=${model}&provider=${provider}&adapter=${adapter} -> 301 ${url}`)
  res.redirect(301, url)
}
