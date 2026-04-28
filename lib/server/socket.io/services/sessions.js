import config from '../../../config.js'
import logger from '../../../../utils/logger.js'
import streamCache from './streamCache.js'

class SessionPool {
  constructor() {
    this.pool = new Map()
    this.cache = new Map()
  }

  addSession(client) {
    const key = {
      isAdmin: client.isAdmin,
      id: client.id,
    }
    const existingClients = this.pool.get(key)
    if (existingClients) {
      console.log('用户多次登录') //logger.mark 改为 console.log
      existingClients.push(client)
    } else {
      this.pool.set(key, [client])
    }

    // 先检查缓存中是否有该客户端的对象
    let cachedClient = this.cache.get(client.id)
    if (!cachedClient) {
      // 只有在不存在缓存对象时才新建，而不是重置
      cachedClient = {
        id: client.id,
        cachedMessages: [],
        expires: Date.now() + 1000 * 60 * 60 * 24,
        getCachedMessages() {
          return this.cachedMessages
        },
        addCachedMessage(message) {
          this.cachedMessages.push(message)
        },
        clearMessages() {
          this.cachedMessages = []
        }
      }
      this.cache.set(client.id, cachedClient)
    }

    // 先初始化缓存方法，防止下面发送缓存消息失败时丢失
    client.initCacheMesageMethod((message) => {
      // 如果是 LLM 协议，静默查找客户端，不报“未登录”错误
      const allClients = this.getClientsByUserId(client.id, message.protocol === 'llm')
      // 过滤掉触发缓存的这个失效 client，防止死循环
      const otherClients = allClients ? allClients.filter((c) => c !== client) : []

      // LLM 协议的消息特殊处理
      if (message.protocol === 'llm') {
        const contactorId = message.data.metaData?.contactorId
        
        // 检查这个 chunk 是否已经在刚刚同步的快照包里了
        if (contactorId && streamCache.isAlreadySynced(client.id, contactorId)) {
          logger.debug(`[Sync] 拦截重复的 LLM 增量包 (已包含在快照中)`)
          return
        }

        // 如果用户有其他在线端（比如刚刚重连上的新端），则立刻转发增量内容
        if (otherClients.length > 0) {
          otherClients.forEach((c) => c.send(message))
        }
        // 但不要进入离线持久缓存（因为重连时会有 StreamCache 快照同步）
        return
      }

      if (otherClients.length > 0) {
        otherClients.forEach((c) => {
          c.send(message) // 如果这里也失败，其他客户端的 cacheMethod 会继续接力，直到存入缓存
        })
      } else {
        logger.info(`用户 ${client.id} 的活跃端不足，消息进入缓存`) // 输出日志
        cachedClient.addCachedMessage(message)
      }
    })

    // 获取并发送缓存消息
    const cachedMessages = [...cachedClient.getCachedMessages()] // 浅拷贝
    if (cachedMessages.length > 0) {
      logger.info(`为用户 ${client.id} 发送缓存消息 (共 ${cachedMessages.length} 条)`)
      // 先清空缓存，防止发送失败时被重复处理（如果失败会通过上面的方法重新进入缓存）
      cachedClient.clearMessages()
      for (const message of cachedMessages) {
        client.send(message)
        logger.json(message)
      }
    }
  }

  getClientsByUserId(userId, quiet = false) {
    for (const [key, clients] of this.pool) {
      // 修改遍历方式
      if (`${userId}`.includes(`${key.id}`)) {
        return clients // 返回客户端数组
      }
    }
    
    // 找不到用户时，检查是否为管理员ID
    const adminId = config.onebot?.admin_qq
    
    if (adminId && `${userId}` === `${adminId}`) {
      if (!quiet) logger.info(`用户 ${userId} 未登录，但匹配管理员ID，转发给管理员客户端`)
      // 返回所有管理员客户端
      return this.getAllAdminClients()
    }
    
    if (!quiet) logger.error(`用户 ${userId} 未登录`)
    return null
  }

  getAllAdminClients() {
    const adminClients = []
    for (const [key, clients] of this.pool) {
      if (key.isAdmin) {
        adminClients.push(...clients) // 将所有管理员客户端数组展开并添加到 adminClients
      }
    }
    return adminClients
  }

  getAllClients() {
    const allClients = []
    for (const clients of this.pool.values()) {
      allClients.push(...clients) // 将所有客户端数组展开并添加到 allClients
    }
    return allClients
  }

  removeSession(client) {
    for (const [key, clients] of this.pool) {
      if (clients.some((c) => c.id === client.id)) {
        if (clients.length === 1) {
          this.pool.delete(key)
        } else {
          const newClients = clients.filter((c) => c.id !== client.id)
          this.pool.set(key, newClients)
        }
        return
      }
    }
  }

  getAllAdmins() {
    const allAdmins = []
    for (const [key, clients] of this.pool) {
      if (key.isAdmin) {
        allAdmins.push(...clients)
      }
    }
    return allAdmins
  }
}

export default new SessionPool()
