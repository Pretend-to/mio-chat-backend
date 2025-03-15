class SessionPool {
  constructor() {
    this.pool = new Map()
    this.cache = new Map()
  }

  addSession(client) {
    this.pool.set(client.id, client)
  }

  getClientByUserId(userId) {
    if (!this.pool.has(userId)) {
      logger.error('用户不存在或已经离线') 
      return null
    } else {
      const id =  this.pool.keys.find((key) => userId.includes(key))
      return this.pool.get(id)
    }
  }

  getAllClients() {
    return this.pool.values()
  }

  removeSession (client) {
    this.pool.delete(client.id)
  }
}

export default new SessionPool()