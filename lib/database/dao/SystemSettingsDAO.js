// lib/database/dao/SystemSettingsDAO.js
import BaseDAO from './BaseDAO.js'
import logger from '../../../utils/logger.js'

class SystemSettingsDAO extends BaseDAO {
  constructor() {
    super('system_settings')
  }

  // 根据键名获取配置
  async getByKey(key) {
    try {
      const stmt = this.db.prepare('SELECT * FROM system_settings WHERE key = ?')
      const result = stmt.get(key)
      
      if (result) {
        // 解析 JSON 值
        try {
          result.value = JSON.parse(result.value)
        } catch {
          // 如果不是JSON，保持原值
        }
      }
      
      return result
    } catch (error) {
      logger.error('根据键名获取系统配置失败:', error)
      throw error
    }
  }

  // 根据分类获取配置
  async getByCategory(category) {
    try {
      const stmt = this.db.prepare('SELECT * FROM system_settings WHERE category = ? ORDER BY key')
      const results = stmt.all(category)
      
      return results.map(result => {
        try {
          result.value = JSON.parse(result.value)
        } catch {
          // 如果不是JSON，保持原值
        }
        return result
      })
    } catch (error) {
      logger.error('根据分类获取系统配置失败:', error)
      throw error
    }
  }

  // 设置配置值
  async set(key, value, category = 'general', description = '') {
    try {
      // 将值序列化为JSON
      const jsonValue = typeof value === 'string' ? value : JSON.stringify(value)
      
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO system_settings (key, value, category, description, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      
      const result = stmt.run(key, jsonValue, category, description)
      logger.info(`设置系统配置成功: ${key}`)
      return result.lastInsertRowid
    } catch (error) {
      logger.error('设置系统配置失败:', error)
      throw error
    }
  }

  // 批量设置配置
  async setBatch(configs) {
    try {
      const transaction = this.db.transaction((configs) => {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO system_settings (key, value, category, description, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `)
        
        for (const config of configs) {
          const jsonValue = typeof config.value === 'string' ? config.value : JSON.stringify(config.value)
          stmt.run(config.key, jsonValue, config.category || 'general', config.description || '')
        }
      })
      
      transaction(configs)
      logger.info(`批量设置系统配置成功: ${configs.length} 项`)
      return true
    } catch (error) {
      logger.error('批量设置系统配置失败:', error)
      throw error
    }
  }

  // 删除配置
  async deleteByKey(key) {
    try {
      const stmt = this.db.prepare('DELETE FROM system_settings WHERE key = ?')
      const result = stmt.run(key)
      
      if (result.changes > 0) {
        logger.info(`删除系统配置成功: ${key}`)
        return true
      } else {
        logger.warn(`系统配置不存在: ${key}`)
        return false
      }
    } catch (error) {
      logger.error('删除系统配置失败:', error)
      throw error
    }
  }

  // 获取所有配置，按分类组织
  async getAllGroupedByCategory() {
    try {
      const stmt = this.db.prepare('SELECT * FROM system_settings ORDER BY category, key')
      const results = stmt.all()
      
      const grouped = {}
      results.forEach(result => {
        if (!grouped[result.category]) {
          grouped[result.category] = {}
        }
        
        try {
          result.value = JSON.parse(result.value)
        } catch {
          // 如果不是JSON，保持原值
        }
        
        grouped[result.category][result.key] = result.value
      })
      
      return grouped
    } catch (error) {
      logger.error('获取分组系统配置失败:', error)
      throw error
    }
  }

  // 检查配置是否存在
  async exists(key) {
    try {
      const stmt = this.db.prepare('SELECT 1 FROM system_settings WHERE key = ?')
      return !!stmt.get(key)
    } catch (error) {
      logger.error('检查系统配置存在性失败:', error)
      throw error
    }
  }
}

export default new SystemSettingsDAO()