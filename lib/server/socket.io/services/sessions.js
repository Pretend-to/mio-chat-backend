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

    // 检查缓存中是否有该客户端的消息
    let cachedClient = this.cache.get(client.id)
    if (cachedClient) {
      const cachedMessages = cachedClient.getCachedMessages() // 获取缓存的消息
      if (cachedMessages.length > 0) {
        logger.info(`为用户 ${client.id} 发送缓存消息`) // 输出日志
        for (const message of cachedMessages) {
          // 遍历缓存的消息
          client.send(message) // 发送消息给客户端
          logger.json(message) // 输出日志
        }
      }
    }

    // 新建或重置缓存客户端，id: {cachedMessages:[], expires: Date.now() + 1000 * 60 * 60 * 24} 过期时间为24小时
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
    }

    client.initCacheMesageMethod((message) => {
      // 先检查 有没有已经登陆的 同 id 的客户端
      const existingClients = this.getClientsByUserId(client.id)
      if (existingClients) {
        // 如果有，就直接发送消息
        existingClients.forEach((c) => {
          c.send(message)
        })
        return // 直接返回，不再缓存
      } else {
        // 如果没有，就缓存消息
        logger.info(`用户 ${client.id} 未登录，缓存消息`) // 输出日志 
        // 缓存消息的方法
        cachedClient.addCachedMessage(message) // 将消息添加到缓存中
      }
    })

    this.cache.set(client.id, cachedClient)
  }

  getClientsByUserId(userId) {
    for (const [key, clients] of this.pool) {
      // 修改遍历方式
      if (`${userId}`.includes(`${key.id}`)) {
        return clients // 返回客户端数组
      }
    }
    console.error('用户不存在或已经离线') //logger.error 改为 console.error
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
