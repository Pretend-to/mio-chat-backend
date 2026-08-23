import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { ImageRegistry } from './ImageRegistry.js'
import { base64ToImageUrl, bufferToImageUrl } from '../../../utils/imgTools.js'
import logger from '../../../utils/logger.js'

/**
 * ImageService - 系统级生图调度与管理中心
 * 包含持久化任务队列、Socket 广播与多模态重绘调度
 */
export class ImageService {
  constructor() {
    this.instances = new Map() // id/name -> adapterInstance
    this.defaultInstanceId = null
    this.initialized = false
    this.outputDir = path.join(process.cwd(), 'public', 'generated-images')
    this.taskFile = path.join(process.cwd(), 'data', 'image_tasks.json')
    this.tasks = new Map() // taskId -> { status, url, ... }
  }

  async initialize() {
    if (this.initialized) return

    // 确保生成图片的输出目录及数据目录存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
    const dataDir = path.dirname(this.taskFile)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    this._loadTasksFromDisk()
    await this.reloadConfigsFromDb()
    this.initialized = true
  }

  _loadTasksFromDisk() {
    try {
      if (fs.existsSync(this.taskFile)) {
        const raw = fs.readFileSync(this.taskFile, 'utf-8')
        const list = JSON.parse(raw)
        if (Array.isArray(list)) {
          const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
          const now = Date.now()
          for (const item of list) {
            if (item && item.taskId && now - (item.createdAt || 0) < SEVEN_DAYS) {
              this.tasks.set(item.taskId, item)
            }
          }
        }
      }
    } catch (e) {
      logger.warn('[ImageService] Failed to load image_tasks.json:', e.message)
    }
  }

  _saveTasksToDisk() {
    try {
      const list = Array.from(this.tasks.values())
      fs.writeFileSync(this.taskFile, JSON.stringify(list, null, 2), 'utf-8')
    } catch (e) {
      logger.warn('[ImageService] Failed to save image_tasks.json:', e.message)
    }
  }

  /**
   * 从数据库加载已启用的生图适配器
   */
  async reloadConfigsFromDb() {
    try {
      const { default: prismaManager } = await import('../../database/prisma.js')
      const prisma = await prismaManager.initialize()
      if (!prisma || !prisma.imageAdapter) return

      const records = await prisma.imageAdapter.findMany({
        where: { enabled: true }
      })

      this.instances.clear()
      this.defaultInstanceId = null

      for (const rec of records) {
        const AdapterClass = ImageRegistry.get(rec.adapterType)
        if (!AdapterClass) continue

        let configData = {}
        try {
          configData = typeof rec.configData === 'string' ? JSON.parse(rec.configData) : rec.configData || {}
        } catch {}

        const instance = new AdapterClass(configData)
        instance.dbId = rec.id
        instance.instanceName = rec.instanceName
        instance.isDefault = rec.isDefault

        this.instances.set(String(rec.id), instance)
        this.instances.set(rec.instanceName, instance)

        if (rec.isDefault && !this.defaultInstanceId) {
          this.defaultInstanceId = rec.instanceName
        }
      }

      // 如果未指定默认项，取第一个实例
      if (!this.defaultInstanceId && this.instances.size > 0) {
        this.defaultInstanceId = Array.from(this.instances.keys())[0]
      }

      logger.info(`[ImageService] 已加载 ${records.length} 个生图适配器，默认通道:「${this.defaultInstanceId || '无'}」`)
    } catch (err) {
      logger.warn('[ImageService] Warning loading adapters from DB:', err.message)
    }
  }

  /**
   * 创建异步生图任务（持久化落盘，即时返回 taskId，后台静默生图并通过 Socket 推送）
   */
  createTask(options = {}, adapterIdentifier = null) {
    const taskId = `img_task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    const taskInfo = {
      taskId,
      status: 'pending',
      createdAt: Date.now(),
      prompt: options.prompt,
      options
    }

    this.tasks.set(taskId, taskInfo)
    this._saveTasksToDisk()

    logger.info(`[ImageService] 创建异步生图任务: taskId=${taskId}, prompt="${options.prompt?.slice(0, 80)}...", adapter=${adapterIdentifier || '默认'}`)

    // 异步执行生图，不阻塞当前请求
    this._executeAsyncTask(taskId, options, adapterIdentifier)

    // 清理 7 天前的旧任务缓存
    this._cleanOldTasks()

    return { taskId, status: 'pending' }
  }

  async _executeAsyncTask(taskId, options, adapterIdentifier) {
    const startTime = Date.now()
    try {
      logger.info(`[ImageService] 开始后台执行异步任务: taskId=${taskId}`)
      const results = await this.generate(options, adapterIdentifier)
      const firstItem = results[0] || {}
      const finalUrl = firstItem.url || null
      const revisedPrompt = firstItem.revisedPrompt || null

      const task = this.tasks.get(taskId)
      if (task) {
        task.status = 'success'
        task.finishedAt = Date.now()
        task.url = finalUrl
        task.revisedPrompt = revisedPrompt
        task.results = results
        this._saveTasksToDisk()
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      logger.info(`[ImageService] 异步任务执行完成! taskId=${taskId}, 耗时 ${duration}s, url=${finalUrl}`)

      // 通过 Socket.IO 广播任务完成事件
      const io = global.middleware?.socketServer?.io
      if (io) {
        io.emit('image:task_complete', {
          taskId,
          status: 'success',
          url: finalUrl,
          revisedPrompt
        })
      }
    } catch (err) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      logger.error(`[ImageService] 异步任务执行失败! taskId=${taskId}, 耗时 ${duration}s, error:`, err.message)
      const task = this.tasks.get(taskId)
      if (task) {
        task.status = 'failed'
        task.finishedAt = Date.now()
        task.error = err.message
        this._saveTasksToDisk()
      }

      const io = global.middleware?.socketServer?.io
      if (io) {
        io.emit('image:task_failed', {
          taskId,
          status: 'failed',
          error: err.message
        })
      }
    }
  }

  getTask(taskId) {
    return this.tasks.get(taskId) || { status: 'not_found' }
  }

  _cleanOldTasks() {
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
    const now = Date.now()
    let changed = false
    for (const [id, task] of this.tasks.entries()) {
      if (now - (task.createdAt || 0) > SEVEN_DAYS) {
        this.tasks.delete(id)
        changed = true
      }
    }
    if (changed) {
      this._saveTasksToDisk()
    }
  }

  /**
   * 同步执行生图任务，并自动落盘生成 Web 可访问的图片 URL
   */
  async generate(options = {}, adapterIdentifier = null) {
    if (!this.initialized) {
      await this.initialize()
    }

    const key = adapterIdentifier || this.defaultInstanceId
    let adapter = key ? this.instances.get(String(key)) : null

    // 如果未配置任何数据库实例，且有环境变量，尝试零配置创建默认 OpenAI/SD 实例
    if (!adapter) {
      adapter = this._getFallbackAdapter()
    }

    if (!adapter) {
      throw new Error('[ImageService] 没有可用的生图适配器，请在后台设置中添加或启用生图配置。')
    }

    const adapterDisplayName = adapter.instanceName || adapter.name || '默认适配器'
    logger.info(`[ImageService] 调度生图通道「${adapterDisplayName}」: prompt="${options.prompt?.slice(0, 80)}...", size="${options.size || '1024x1024'}"`)

    const startTime = Date.now()
    const results = await adapter.generate(options)
    if (!results || !Array.isArray(results) || results.length === 0) {
      throw new Error('[ImageService] 生图适配器返回了空结果')
    }

    logger.debug(`[ImageService] 适配器原始响应返回 ${results.length} 张图片，正在进行本地持久化落盘...`)

    // 将返回的 base64 或临时 URL 保存落盘
    const processedResults = await Promise.all(
      results.map(async (item) => {
        const savedPath = await this._persistImage(item)
        return {
          ...item,
          url: savedPath || (Array.isArray(item.url) ? item.url[0] : item.url)
        }
      })
    )

    const hasValidImage = processedResults.some((r) => r.url || r.base64)
    if (!hasValidImage) {
      throw new Error('[ImageService] 生图适配器未能返回有效的图片链接')
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    logger.info(`[ImageService] 生图与持久化完成! 耗时 ${duration}s, 输出 URL: ${processedResults[0]?.url}`)

    return processedResults
  }

  /**
   * 将 Base64 或远程 URL 通过 StorageService 持久化托管，并获取对外 URL
   */
  async _persistImage(item, baseUrl = '') {
    try {
      let rawBase64 = item.base64
      if (Array.isArray(rawBase64)) rawBase64 = rawBase64[0]
      if (rawBase64 && typeof rawBase64 === 'string') {
        const url = await base64ToImageUrl(baseUrl, rawBase64)
        logger.debug(`[ImageService] Base64 转存 Storage 成功: ${url}`)
        return url
      }

      let rawUrl = item.url
      if (Array.isArray(rawUrl)) rawUrl = rawUrl[0]

      if (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) {
        logger.debug(`[ImageService] 正在拉取远程图片转存: ${rawUrl}`)
        const res = await fetch(rawUrl, { signal: AbortSignal.timeout(30000) })
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer()
          const url = await bufferToImageUrl(baseUrl, Buffer.from(arrayBuffer))
          logger.debug(`[ImageService] 远程图片转存本地成功: ${url}`)
          return url
        }
      }

      return rawUrl || null
    } catch (err) {
      logger.warn('[ImageService] Failed to persist image file to StorageService:', err.message)
      const rawUrl = Array.isArray(item.url) ? item.url[0] : item.url
      return rawUrl || null
    }
  }

  _getFallbackAdapter() {
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      const OpenAIClass = ImageRegistry.get('openai-image')
      if (OpenAIClass) return new OpenAIClass({ apiKey: openaiKey })
    }
    return null
  }
}

export const imageService = new ImageService()
