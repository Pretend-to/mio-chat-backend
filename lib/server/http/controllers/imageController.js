import { makeStandardResponse } from '../utils/responseFormatter.js'
import storageService from '../../../storage/StorageService.js'
import fs from 'fs'
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
  const nk = req.query.q || 1_099_834_705 // 默认的QQ号
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
        data: null,
        message: '未提供图片数据',
      })
    }
    
    const imageBuffer = imageFile.buffer
    const md5Hash = crypto
      .createHash('md5')
      .update(imageBuffer)
      .digest('hex')
    
    let imageExtension = path.extname(imageFile.originalname).toLowerCase() || '.jpg'
    const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    if (!allowedImageExtensions.includes(imageExtension)) {
      // 如果不是图片扩展名，强制设为 .jpg 或报错
      imageExtension = '.jpg'
    }

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
          url,
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
      data: null,
      message: error.message,
    })
  }
}

/**
 * 通过自定义的 providerId (即实例名称 instanceName) 获取真正的 adapterType
 */
function getAdapterTypeByProviderId(providerId) {
  if (!providerId) {return ''}
  const providerIdLower = providerId.toLowerCase().trim()
  const llmAdapters = config.llm_adapters || {}
  
  for (const [adapterType, instances] of Object.entries(llmAdapters)) {
    if (!Array.isArray(instances)) {continue}
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
      if (id === 'openai' && !modelLower.includes('openai')) {return false}
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
      } catch (error) {
        logger.error(`getModelAvatar: 匹配模型所有者失败: ${error.message}`)
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
  // 本地自定义头像优先（放置于 presets/avatar/，供 /p/ava 静态路由访问）
  // 用于 lobe toc 缺失的自定义品牌，如小红书 Dots Studio
  const localAvatarDir = path.join(process.cwd(), 'presets', 'avatar')
  const localFileName = target ? `${target.toLowerCase()}.svg` : ''
  if (localFileName && fs.existsSync(path.join(localAvatarDir, localFileName))) {
    // 直接内联返回本地 SVG（不走 301，彻底规避浏览器/ServiceWorker 对旧跳转的缓存）
    const svg = fs.readFileSync(path.join(localAvatarDir, localFileName))
    res.setHeader('Content-Type', 'image/svg+xml')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Vary', 'Accept')
    return res.send(svg)
  }
  const fileName = entry ? `${entry.id.toLowerCase()}${entry.param?.hasColor ? '-color' : ''}.svg` : 'openai.svg'

  const url = `https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/${fileName}`
  logger.info(`GET /p/mava?model=${model}&provider=${provider}&adapter=${adapter} -> 301 ${url}`)
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Vary', 'Accept')
  res.redirect(301, url)
}

// ----------------------------------------------------
// 生图适配器配置与连通性测试 API
// ----------------------------------------------------
import { imageService } from '../../../chat/image/ImageService.js'
import { ImageRegistry } from '../../../chat/image/ImageRegistry.js'

export async function getImageAdapters(req, res) {
  try {
    const { default: prismaManager } = await import('../../../database/prisma.js')
    const prisma = await prismaManager.initialize()
    const list = prisma?.imageAdapter ? await prisma.imageAdapter.findMany({ orderBy: { createdAt: 'desc' } }) : []
    const availableTypes = ImageRegistry.getAllMetadata()
    res.json(makeStandardResponse({ adapters: list, availableTypes }))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}

export async function createImageAdapter(req, res) {
  try {
    const { adapterType, instanceName, configData, enabled = true, isDefault = false } = req.body
    const { default: prismaManager } = await import('../../../database/prisma.js')
    const prisma = await prismaManager.initialize()

    if (isDefault) {
      await prisma.imageAdapter.updateMany({ where: {}, data: { isDefault: false } })
    }

    const created = await prisma.imageAdapter.create({
      data: {
        adapterType,
        instanceName,
        configData: typeof configData === 'string' ? configData : JSON.stringify(configData || {}),
        enabled,
        isDefault
      }
    })

    await imageService.reloadConfigsFromDb()
    res.json(makeStandardResponse(created))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}

export async function updateImageAdapter(req, res) {
  try {
    const { id } = req.params
    const { instanceName, configData, enabled, isDefault } = req.body
    const { default: prismaManager } = await import('../../../database/prisma.js')
    const prisma = await prismaManager.initialize()

    if (isDefault) {
      await prisma.imageAdapter.updateMany({ where: {}, data: { isDefault: false } })
    }

    const updateData = {}
    if (instanceName !== undefined) updateData.instanceName = instanceName
    if (configData !== undefined) updateData.configData = typeof configData === 'string' ? configData : JSON.stringify(configData)
    if (enabled !== undefined) updateData.enabled = enabled
    if (isDefault !== undefined) updateData.isDefault = isDefault

    const updated = await prisma.imageAdapter.update({
      where: { id: Number(id) },
      data: updateData
    })

    await imageService.reloadConfigsFromDb()
    res.json(makeStandardResponse(updated))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}

export async function deleteImageAdapter(req, res) {
  try {
    const { id } = req.params
    const { default: prismaManager } = await import('../../../database/prisma.js')
    const prisma = await prismaManager.initialize()

    await prisma.imageAdapter.delete({ where: { id: Number(id) } })
    await imageService.reloadConfigsFromDb()
    res.json(makeStandardResponse({ deleted: true }))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}

export async function testImageGeneration(req, res) {
  try {
    const { prompt = 'A cute cat sitting on a desk', adapterId, size = '1024x1024', image, strength } = req.body
    const results = await imageService.generate({ prompt, size, image, strength }, adapterId)
    res.json(makeStandardResponse({ results }))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}

export async function getImageTask(req, res) {
  try {
    const { taskId } = req.params
    const task = imageService.getTask(taskId)
    res.json(makeStandardResponse(task))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}

export async function fetchImageModels(req, res) {
  try {
    const { adapterType, baseUrl, apiKey, platform, projectId, location, expressMode, blockExpress } = req.body
    const cleanBaseUrl = (baseUrl || '').replace(/\/$/, '')
    let models = []

    if (adapterType === 'google-image' || cleanBaseUrl.includes('generativelanguage.googleapis.com') || cleanBaseUrl.includes('aiplatform.googleapis.com')) {
      if (platform === 'vertex' || cleanBaseUrl.includes('aiplatform.googleapis.com')) {
        const loc = location || 'us-central1'
        const isExpress = expressMode !== undefined ? Boolean(expressMode) : (blockExpress !== undefined ? !blockExpress : true)
        let targetUrl = `${cleanBaseUrl || `https://${loc}-aiplatform.googleapis.com`}/v1beta1/projects/${projectId || 'default'}/locations/${loc}/publishers/google/models`
        const headers = { 'Content-Type': 'application/json' }

        if (!isExpress) {
          try {
            const { GoogleAuth } = await import('google-auth-library')
            const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
            const client = await auth.getClient()
            const token = await client.getAccessToken()
            headers['Authorization'] = `Bearer ${token.token}`
          } catch (e) {
            logger.warn('[fetchImageModels] Vertex ADC error:', e.message)
          }
        } else if (apiKey) {
          targetUrl += `?key=${apiKey}`
        }

        try {
          const response = await fetch(targetUrl, { headers })
          if (response.ok) {
            const data = await response.json()
            const list = data.publisherModels || data.models || []
            models = list.map(m => {
              const id = m.name ? m.name.split('/').pop() : m.id
              return { id, name: id }
            }).filter(m => m.id.toLowerCase().includes('gemini') || m.id.toLowerCase().includes('imagen'))
          }
        } catch (e) {
          logger.warn('[fetchImageModels] Vertex models direct fetch failed:', e.message)
        }

        // 兜底降级至 Generative Language models API
        if (models.length === 0 && apiKey) {
          const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
          const response = await fetch(fallbackUrl)
          if (response.ok) {
            const data = await response.json()
            const list = data.models || []
            models = list.map(m => {
              const id = m.name ? m.name.replace(/^models\//, '') : m.name
              return { id, name: id }
            })
          }
        }
      } else {
        const targetUrl = `${cleanBaseUrl || 'https://generativelanguage.googleapis.com'}/v1beta/models?key=${apiKey || ''}`
        const response = await fetch(targetUrl)
        if (response.ok) {
          const data = await response.json()
          const list = data.models || []
          models = list.map(m => {
            const id = m.name ? m.name.replace(/^models\//, '') : (m.displayName || m.name)
            return { id, name: id }
          })
        } else {
          const err = await response.text()
          throw new Error(`Google API Error (${response.status}): ${err}`)
        }
      }
    } else if (adapterType === 'sd-webui') {
      const targetUrl = `${cleanBaseUrl || 'http://127.0.0.1:7860'}/sdapi/v1/sd-models`
      const response = await fetch(targetUrl)
      if (response.ok) {
        const list = await response.json()
        models = list.map(m => ({ id: m.title || m.model_name, name: m.model_name || m.title }))
      } else {
        const err = await response.text()
        throw new Error(`SD WebUI Error (${response.status}): ${err}`)
      }
    } else {
      // OpenAI / SiliconFlow / Ark / Compatible endpoints
      let defaultBaseUrl = 'https://api.openai.com/v1'
      if (adapterType === 'siliconflow-image') defaultBaseUrl = 'https://api.siliconflow.cn/v1'
      else if (adapterType === 'volcengine-image') defaultBaseUrl = 'https://ark.cn-beijing.volces.com/api/v3'

      const targetUrl = `${cleanBaseUrl || defaultBaseUrl}/models`
      const headers = { 'Content-Type': 'application/json' }
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

      const response = await fetch(targetUrl, { headers })
      if (response.ok) {
        const data = await response.json()
        const list = data.data || data.models || []
        models = list.map(m => ({ id: m.id, name: m.id }))
      } else {
        const err = await response.text()
        throw new Error(`API Error (${response.status}): ${err}`)
      }
    }

    res.json(makeStandardResponse({ models }))
  } catch (error) {
    res.status(500).json({ code: 1, message: error.message })
  }
}



