#!/usr/bin/env node

/**
 * OneBot 配置迁移脚本
 * 将 PluginConfigService 中的 onebotConfig 迁移到 SystemSettingsService 中的 onebot 配置
 */

import logger from '../utils/logger.js'
import PluginConfigService from '../lib/database/services/PluginConfigService.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'

class OneBotConfigMigrator {
  constructor(options = {}) {
    this.stats = {
      found: false,
      migrated: false,
      error: null
    }
    this.silent = options.silent || false
  }

  async migrate() {
    try {
      if (!this.silent) {
        logger.info('开始 OneBot 配置迁移...')
      }
      
      // 初始化服务
      await PluginConfigService.initialize()
      await SystemSettingsService.initialize()
      
      // 检查是否存在旧的 OneBot 配置
      const oldConfig = await PluginConfigService.findByName('onebotConfig')
      if (!oldConfig) {
        if (!this.silent) {
          logger.info('未找到旧的 OneBot 配置，无需迁移')
        }
        return this.stats
      }
      
      this.stats.found = true
      if (!this.silent) {
        logger.info('找到旧的 OneBot 配置')
      }
      
      // 检查新位置是否已存在配置
      const existingConfig = await SystemSettingsService.get('onebot')
      if (existingConfig) {
        if (!this.silent) {
          logger.info('新位置已存在 OneBot 配置，跳过迁移')
          logger.info('如需强制迁移，请先删除 system_settings 表中的 onebot 记录')
        }
        return this.stats
      }
      
      // 迁移配置
      const configData = oldConfig.configData
      await SystemSettingsService.set('onebot', configData, 'onebot', 'OneBot 协议配置')
      
      this.stats.migrated = true
      if (!this.silent) {
        logger.info('OneBot 配置迁移成功')
        logger.info('迁移完成！旧配置仍保留在 plugin_configs 表中，可手动删除')
      }
      
      // 可选：删除旧配置（注释掉以保持安全）
      // await PluginConfigService.delete('onebotConfig')
      // if (!this.silent) logger.info('已删除旧的 OneBot 配置')
      
    } catch (error) {
      this.stats.error = error.message
      if (!this.silent) {
        logger.error('OneBot 配置迁移失败:', error)
      }
      throw error
    }
    
    return this.stats
  }
}

// 主函数
async function main() {
  const migrator = new OneBotConfigMigrator()
  
  try {
    const stats = await migrator.migrate()
    
    logger.info('迁移统计:')
    logger.info(`- 找到旧配置: ${stats.found}`)
    logger.info(`- 迁移成功: ${stats.migrated}`)
    if (stats.error) {
      logger.error(`- 错误: ${stats.error}`)
    }
    
    process.exit(0)
  } catch (error) {
    logger.error('迁移失败:', error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default OneBotConfigMigrator