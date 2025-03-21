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
  }

  getClientsByUserId(userId) {
    for (const [key, clients] of this.pool) {  // 修改遍历方式
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
      if (clients.some(c => c.id === client.id)) {
        if (clients.length === 1) {
          this.pool.delete(key)
        } else {
          const newClients = clients.filter(c => c.id !== client.id)
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