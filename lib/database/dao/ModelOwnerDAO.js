// lib/database/dao/ModelOwnerDAO.js
import BaseDAO from './BaseDAO.js'
import logger from '../../../utils/logger.js'

class ModelOwnerDAO extends BaseDAO {
  constructor() {
    super('model_owners')
  }

  // 获取所有模型所有者
  async getAll() {
    try {
      const stmt = this.db.prepare('SELECT * FROM model_owners ORDER BY owner')
      const results = stmt.all()
      
      return results.map(result => ({
        ...result,
        keywords: JSON.parse(result.keywords)
      }))
    } catch (error) {
      logger.error('获取模型所有者失败:', error)
      throw error
    }
  }

  // 根据所有者名称获取
  async getByOwner(owner) {
    try {
      const stmt = this.db.prepare('SELECT * FROM model_owners WHERE owner = ?')
      const result = stmt.get(owner)
      
      if (result) {
        result.keywords = JSON.parse(result.keywords)
      }
      
      return result
    } catch (error) {
      logger.error('根据所有者获取模型所有者失败:', error)
      throw error
    }
  }

  // 根据关键词查找所有者
  async findByKeyword(keyword) {
    try {
      const stmt = this.db.prepare('SELECT * FROM model_owners WHERE keywords LIKE ?')
      const results = stmt.all(`%"${keyword}"%`)
      
      return results.map(result => ({
        ...result,
        keywords: JSON.parse(result.keywords)
      })).filter(result => 
        result.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
      )
    } catch (error) {
      logger.error('根据关键词查找模型所有者失败:', error)
      throw error
    }
  }

  // 创建或更新模型所有者
  async upsert(owner, keywords) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO model_owners (owner, keywords, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `)
      
      const result = stmt.run(owner, JSON.stringify(keywords))
      logger.info(`保存模型所有者成功: ${owner}`)
      return result.lastInsertRowid
    } catch (error) {
      logger.error('保存模型所有者失败:', error)
      throw error
    }
  }

  // 批量保存模型所有者
  async saveBatch(owners) {
    try {
      const transaction = this.db.transaction((owners) => {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO model_owners (owner, keywords, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `)
        
        for (const ownerData of owners) {
          stmt.run(ownerData.owner, JSON.stringify(ownerData.keywords))
        }
      })
      
      transaction(owners)
      logger.info(`批量保存模型所有者成功: ${owners.length} 项`)
      return true
    } catch (error) {
      logger.error('批量保存模型所有者失败:', error)
      throw error
    }
  }

  // 删除模型所有者
  async deleteByOwner(owner) {
    try {
      const stmt = this.db.prepare('DELETE FROM model_owners WHERE owner = ?')
      const result = stmt.run(owner)
      
      if (result.changes > 0) {
        logger.info(`删除模型所有者成功: ${owner}`)
        return true
      } else {
        logger.warn(`模型所有者不存在: ${owner}`)
        return false
      }
    } catch (error) {
      logger.error('删除模型所有者失败:', error)
      throw error
    }
  }

  // 检查模型所有者是否存在
  async exists(owner) {
    try {
      const stmt = this.db.prepare('SELECT 1 FROM model_owners WHERE owner = ?')
      return !!stmt.get(owner)
    } catch (error) {
      logger.error('检查模型所有者存在性失败:', error)
      throw error
    }
  }

  // 获取关键词统计
  async getKeywordStats() {
    try {
      const owners = await this.getAll()
      const keywordCount = {}
      
      owners.forEach(owner => {
        owner.keywords.forEach(keyword => {
          keywordCount[keyword] = (keywordCount[keyword] || 0) + 1
        })
      })
      
      return Object.entries(keywordCount)
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count)
    } catch (error) {
      logger.error('获取关键词统计失败:', error)
      throw error
    }
  }

  // 搜索模型所有者
  async search(query, limit = 50) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM model_owners 
        WHERE owner LIKE ? OR keywords LIKE ?
        ORDER BY owner
        LIMIT ?
      `)
      
      const searchTerm = `%${query}%`
      const results = stmt.all(searchTerm, searchTerm, limit)
      
      return results.map(result => ({
        ...result,
        keywords: JSON.parse(result.keywords)
      }))
    } catch (error) {
      logger.error('搜索模型所有者失败:', error)
      throw error
    }
  }
}

export default new ModelOwnerDAO()