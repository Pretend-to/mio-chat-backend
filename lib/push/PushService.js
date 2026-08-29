import webpush from 'web-push'
import systemSettingsService from '../database/services/SystemSettingsService.js'

/**
 * Web Push 离线推送服务 (支持 PWA、iOS 16.4+、Android、macOS、Windows)
 */
class PushService {
  constructor() {
    this.vapidKeys = null
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return
    try {
      await systemSettingsService.initialize()
      let savedKeys = await systemSettingsService.get('vapid_keys')
      if (!savedKeys || !savedKeys.value?.publicKey || !savedKeys.value?.privateKey) {
        const generated = webpush.generateVAPIDKeys()
        await systemSettingsService.set(
          'vapid_keys',
          generated,
          'push',
          'Web Push VAPID KeyPair'
        )
        savedKeys = { value: generated }
        logger.info('[PushService] 已生成并持久化全新的 Web Push VAPID 秘钥对')
      }

      this.vapidKeys = savedKeys.value
      webpush.setVapidDetails(
        'mailto:admin@mio-chat.com',
        this.vapidKeys.publicKey,
        this.vapidKeys.privateKey
      )
      this.isInitialized = true
      logger.info('[PushService] Web Push 服务初始化完成，VAPID 公钥已就绪')
    } catch (err) {
      logger.error('[PushService] 初始化失败:', err.message)
      throw err
    }
  }

  async getVapidPublicKey() {
    if (!this.isInitialized) await this.initialize()
    return this.vapidKeys?.publicKey || null
  }

  async getSubscriptions() {
    if (!this.isInitialized) await this.initialize()
    const setting = await systemSettingsService.get('push_subscriptions')
    if (setting && Array.isArray(setting.value)) {
      return setting.value
    }
    return []
  }

  async addSubscription(sub, meta = {}) {
    if (!this.isInitialized) await this.initialize()
    if (!sub || !sub.endpoint) throw new Error('无效的 PushSubscription')

    const list = await this.getSubscriptions()
    const index = list.findIndex(s => s.endpoint === sub.endpoint)
    const record = {
      ...sub,
      createdAt: index !== -1 ? (list[index].createdAt || Date.now()) : Date.now(),
      device: meta.device || 'unknown',
      lastActive: Date.now(),
      userAgent: meta.userAgent || '',
      userId: meta.userId || 'admin',
    }

    if (index !== -1) {
      list[index] = record
    } else {
      list.push(record)
    }

    await systemSettingsService.set(
      'push_subscriptions',
      list,
      'push',
      'Web Push Subscriptions List'
    )
    logger.info(`[PushService] 成功注册/更新 Push 订阅 (当前有效订阅数: ${list.length})`)
    return true
  }

  async removeSubscription(endpoint) {
    if (!this.isInitialized) await this.initialize()
    const list = await this.getSubscriptions()
    const filtered = list.filter(s => s.endpoint !== endpoint)
    if (filtered.length !== list.length) {
      await systemSettingsService.set(
        'push_subscriptions',
        filtered,
        'push',
        'Web Push Subscriptions List'
      )
      logger.info(`[PushService] 已清理失效的 Push 订阅: ${endpoint}`)
    }
  }

  async clearSubscriptions() {
    if (!this.isInitialized) await this.initialize()
    await systemSettingsService.set(
      'push_subscriptions',
      [],
      'push',
      'Web Push Subscriptions List'
    )
    logger.info('[PushService] 已清空所有设备订阅列表')
    return true
  }

  /**
   * 向所有注册的设备广播离线通知
   */
  async sendNotification({ title = 'Mio-Chat 提醒', body, url = '/', contactorId = null, data = {} }) {
    if (!this.isInitialized) await this.initialize()
    const list = await this.getSubscriptions()
    if (list.length === 0) return { delivered: 0, total: 0 }

    const targetUrl = contactorId ? `/?contactorId=${contactorId}` : url
    const payload = JSON.stringify({
      body: body || '您有新的消息或任务进展',
      contactorId,
      data: { ...data, targetUrl },
      icon: '/static/icons/192x192.png',
      timestamp: Date.now(),
      title,
      url: targetUrl,
    })

    let delivered = 0
    const deadEndpoints = []

    await Promise.all(
      list.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload, {
            TTL: 86400, // 24小时存活
            urgency: 'high',
          })
          delivered++
        } catch (err) {
          // 404 或 410 说明客户端已注销该订阅
          if (err.statusCode === 404 || err.statusCode === 410) {
            deadEndpoints.push(sub.endpoint)
          } else {
            logger.warn(
              `[PushService] 发送推送至 ${sub.endpoint} 失败 [HTTP ${err.statusCode || 'N/A'}]:`,
              err.body || err.message
            )
          }
        }
      })
    )

    // 清理失效端点
    if (deadEndpoints.length > 0) {
      for (const endpoint of deadEndpoints) {
        await this.removeSubscription(endpoint)
      }
    }

    logger.info(`[PushService] 推送完成: 成功 ${delivered}/${list.length} 台设备`)
    return { delivered, total: list.length }
  }
}

export default new PushService()
