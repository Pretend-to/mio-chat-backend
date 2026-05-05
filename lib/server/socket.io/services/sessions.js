import config from '../../../config.js'
import logger from '../../../../utils/logger.js'
import streamCache from './streamCache.js'

class SessionPool {
  constructor() {
    // Key: userId (string) → clients: WebUser[]
    this.pool = new Map()
    // Key: userId (string) → { isAdmin, cachedMessages, ... }
    this.cache = new Map()
  }

  addSession(client) {
    const key = `${client.id}`

    // 同 userId 的 client 共享同一数组，支持多端同时在线
    let existingClients = this.pool.get(key)
    if (existingClients) {
      existingClients.push(client)
    } else {
      this.pool.set(key, [client])
    }

    // 检查缓存中是否有该用户的对象
    let cachedClient = this.cache.get(key)
    if (!cachedClient) {
      cachedClient = {
        id: client.id,
        isAdmin: client.isAdmin,
        cachedMessages: [],
        expires: Date.now() + 1000 * 60 * 60 * 24,
        getCachedMessages() { return this.cachedMessages },
        addCachedMessage(message) { this.cachedMessages.push(message) },
        clearMessages() { this.cachedMessages = [] }
      }
      this.cache.set(key, cachedClient)
    } else {
      cachedClient.isAdmin = client.isAdmin
    }

    // 初始化缓存转发方法（当旧 client 的 socket 断开时自动转发给新 client）
    client.initCacheMesageMethod((message) => {
      const allClients = this.getClientsByUserId(client.id, message.protocol === 'llm')
      // 过滤掉触发缓存的这个失效 client，防止死循环
      const otherClients = allClients ? allClients.filter((c) => c !== client) : []

      // LLM 协议的消息特殊处理
      if (message.protocol === 'llm') {
        const contactorId = message.data?.metaData?.contactorId

        // 检查这个 chunk 是否已经在刚刚同步的快照包里了
        if (contactorId && streamCache.isAlreadySynced(client.id, contactorId)) {
          logger.debug(`[Sync] 拦截重复的 LLM 增量包 (已包含在快照中)`)
          return
        }

        // 如果用户有其他在线端（比如刚刚重连上的新端），则立刻转发增量内容
        if (otherClients.length > 0) {
          otherClients.forEach((c) => c.send(message))
        }
        // 不要进入离线持久缓存（重连时会有 StreamCache 快照同步）
        return
      }

      if (otherClients.length > 0) {
        otherClients.forEach((c) => c.send(message))
      } else {
        logger.info(`用户 ${client.id} 的活跃端不足，消息进入缓存`)
        cachedClient.addCachedMessage(message)
      }
    })

    // 发送用户离线期间积压的缓存消息
    const cachedMessages = [...cachedClient.getCachedMessages()]
    if (cachedMessages.length > 0) {
      logger.info(`为用户 ${client.id} 发送缓存消息 (共 ${cachedMessages.length} 条)`)
      cachedClient.clearMessages()
      for (const message of cachedMessages) {
        client.send(message)
        logger.json(message)
      }
    }
  }

  getClientsByUserId(userId, quiet = false) {
    const key = `${userId}`
    const clients = this.pool.get(key)
    if (clients && clients.length > 0) return clients

    // 找不到用户时，检查是否为管理员ID
    const adminId = config.onebot?.admin_qq
    if (adminId && `${userId}` === `${adminId}`) {
      if (!quiet) logger.info(`用户 ${userId} 未登录，但匹配管理员ID，转发给管理员客户端`)
      return this.getAllAdminClients()
    }

    if (!quiet) logger.error(`用户 ${userId} 未登录`)
    return null
  }

  getAllAdminClients() {
    const adminClients = []
    for (const [key, cached] of this.cache) {
      if (cached.isAdmin) {
        const clients = this.pool.get(key)
        if (clients) adminClients.push(...clients)
      }
    }
    return adminClients
  }

  getAllClients() {
    const allClients = []
    for (const clients of this.pool.values()) {
      allClients.push(...clients)
    }
    return allClients
  }

  removeSession(client) {
    const key = `${client.id}`
    const clients = this.pool.get(key)
    if (!clients) return
    const index = clients.indexOf(client) // 按引用查找，不影响同 userId 的新 client
    if (index !== -1) {
      if (clients.length === 1) {
        this.pool.delete(key)
      } else {
        clients.splice(index, 1)
      }
    }
  }

  getAllAdmins() {
    return this.getAllAdminClients()
  }
}

export default new SessionPool()
