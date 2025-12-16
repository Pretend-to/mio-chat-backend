// lib/database/dao/LLMAdapterDAO.js
import BaseDAO from './BaseDAO.js'
import logger from '../../../utils/logger.js'

class LLMAdapterDAO extends BaseDAO {
  constructor() {
    super('llm_adapters')
  }

  // 根据适配器类型获取所有实例
  async getByType(adapterType) {
    try {
      const stmt = this.db.prepare('SELECT * FROM llm_adapters WHERE adapter_type = ? ORDER BY instance_name')
      const results = stmt.all(adapterType)
      
      return results.map(result => ({
        ...result,
        config_data: JSON.parse(result.config_data)
      }))
    } catch (error) {
      logger.error('根据类型获取LLM适配器失败:', error)
      throw error
    }
  }

  // 根据适配器类型和实例名获取配置
  async getByTypeAndName(adapterType, instanceName) {
    try {
      const stmt = this.db.prepare('SELECT * FROM llm_adapters WHERE adapter_type = ? AND instance_name = ?')
      const result = stmt.get(adapterType, instanceName)
      
      if (result) {
        result.config_data = JSON.parse(result.config_data)
      }
      
      return result
    } catch (error) {
      logger.error('根据类型和名称获取LLM适配器失败:', error)
      throw error
    }
  }

  // 获取所有启用的适配器实例
  async getEnabled() {
    try {
      const stmt = this.db.prepare('SELECT * FROM llm_adapters WHERE enabled = 1 ORDER BY adapter_type, instance_name')
      const results = stmt.all()
      
      return results.map(result => ({
        ...result,
        config_data: JSON.parse(result.config_data)
      }))
    } catch (error) {
      logger.error('获取启用的LLM适配器失败:', error)
      throw error
    }
  }

  // 创建或更新适配器实例
  async upsert(adapterType, instanceName, configData, enabled = true) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO llm_adapters (adapter_type, instance_name, config_data, enabled, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      
      const result = stmt.run(
        adapterType,
        instanceName,
        JSON.stringify(configData),
        enabled ? 1 : 0
      )
      
      logger.info(`保存LLM适配器配置成功: ${adapterType}/${instanceName}`)
      return result.lastInsertRowid
    } catch (error) {
      logger.error('保存LLM适配器配置失败:', error)
      throw error
    }
  }

  // 批量保存适配器配置
  async saveBatch(adapters) {
    try {
      const transaction = this.db.transaction((adapters) => {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO llm_adapters (adapter_type, instance_name, config_data, enabled, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `)
        
        for (const adapter of adapters) {
          stmt.run(
            adapter.adapter_type,
            adapter.instance_name,
            JSON.stringify(adapter.config_data),
            adapter.enabled ? 1 : 0
          )
        }
      })
      
      transaction(adapters)
      logger.info(`批量保存LLM适配器配置成功: ${adapters.length} 项`)
      return true
    } catch (error) {
      logger.error('批量保存LLM适配器配置失败:', error)
      throw error
    }
  }

  // 启用/禁用适配器实例
  async setEnabled(adapterType, instanceName, enabled) {
    try {
      const stmt = this.db.prepare(`
        UPDATE llm_adapters 
        SET enabled = ?, updated_at = CURRENT_TIMESTAMP
        WHERE adapter_type = ? AND instance_name = ?
      `)
      
      const result = stmt.run(enabled ? 1 : 0, adapterType, instanceName)
      
      if (result.changes > 0) {
        logger.info(`${enabled ? '启用' : '禁用'}LLM适配器成功: ${adapterType}/${instanceName}`)
        return true
      } else {
        logger.warn(`LLM适配器不存在: ${adapterType}/${instanceName}`)
        return false
      }
    } catch (error) {
      logger.error('设置LLM适配器状态失败:', error)
      throw error
    }
  }

  // 删除适配器实例
  async deleteByTypeAndName(adapterType, instanceName) {
    try {
      const stmt = this.db.prepare('DELETE FROM llm_adapters WHERE adapter_type = ? AND instance_name = ?')
      const result = stmt.run(adapterType, instanceName)
      
      if (result.changes > 0) {
        logger.info(`删除LLM适配器成功: ${adapterType}/${instanceName}`)
        return true
      } else {
        logger.warn(`LLM适配器不存在: ${adapterType}/${instanceName}`)
        return false
      }
    } catch (error) {
      logger.error('删除LLM适配器失败:', error)
      throw error
    }
  }

  // 获取所有适配器配置，按类型组织
  async getAllGroupedByType() {
    try {
      const stmt = this.db.prepare('SELECT * FROM llm_adapters ORDER BY adapter_type, instance_name')
      const results = stmt.all()
      
      const grouped = {}
      results.forEach(result => {
        if (!grouped[result.adapter_type]) {
          grouped[result.adapter_type] = []
        }
        
        grouped[result.adapter_type].push({
          ...result,
          config_data: JSON.parse(result.config_data)
        })
      })
      
      return grouped
    } catch (error) {
      logger.error('获取分组LLM适配器配置失败:', error)
      throw error
    }
  }

  // 检查适配器实例是否存在
  async exists(adapterType, instanceName) {
    try {
      const stmt = this.db.prepare('SELECT 1 FROM llm_adapters WHERE adapter_type = ? AND instance_name = ?')
      return !!stmt.get(adapterType, instanceName)
    } catch (error) {
      logger.error('检查LLM适配器存在性失败:', error)
      throw error
    }
  }

  // 获取适配器统计信息
  async getStats() {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          adapter_type,
          COUNT(*) as total_count,
          SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as enabled_count
        FROM llm_adapters 
        GROUP BY adapter_type
        ORDER BY adapter_type
      `)
      
      return stmt.all()
    } catch (error) {
      logger.error('获取LLM适配器统计信息失败:', error)
      throw error
    }
  }
}

export default new LLMAdapterDAO()