import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 自动迁移检测器
 * 检测老版本配置文件并自动执行迁移
 */
class AutoMigrationDetector {
  constructor() {
    this.configPaths = {
      mainConfig: path.resolve(__dirname, '../../config/config.yaml'),
      ownersConfig: path.resolve(__dirname, '../../config/owners.yaml'),
      pluginsDir: path.resolve(__dirname, '../../config/plugins'),
      presetsDir: path.resolve(__dirname, '../../presets')
    }
  }

  /**
   * 检测是否需要迁移
   */
  async needsMigration() {
    try {
      // 检查是否存在老版本配置文件
      const hasOldConfig = this.hasOldConfigFiles()
      
      // 检查数据库是否为空（新安装）
      const isDatabaseEmpty = await this.isDatabaseEmpty()
      
      logger.info(`配置文件检测: ${hasOldConfig ? '发现' : '未发现'}老版本配置`)
      logger.info(`数据库状态: ${isDatabaseEmpty ? '空' : '已有数据'}`)
      
      // 如果有老配置文件且数据库为空，则需要迁移
      return hasOldConfig && isDatabaseEmpty
    } catch (error) {
      logger.error('迁移检测失败:', error)
      return false
    }
  }

  /**
   * 检查是否存在老版本配置文件
   */
  hasOldConfigFiles() {
    const checks = [
      fs.existsSync(this.configPaths.mainConfig),
      fs.existsSync(this.configPaths.ownersConfig),
      fs.existsSync(this.configPaths.pluginsDir),
      fs.existsSync(this.configPaths.presetsDir)
    ]
    
    return checks.some(exists => exists)
  }

  /**
   * 检查数据库是否为空
   */
  async isDatabaseEmpty() {
    try {
      // 动态导入数据库服务
      const { default: SystemSettingsService } = await import('../database/services/SystemSettingsService.js')
      const { default: PluginConfigService } = await import('../database/services/PluginConfigService.js')
      const { default: PresetService } = await import('../database/services/PresetService.js')
      
      // 初始化服务
      await SystemSettingsService.initialize()
      await PluginConfigService.initialize()
      await PresetService.initialize()
      
      // 检查各个表是否有数据
      const systemSettings = await SystemSettingsService.findAll()
      const pluginConfigs = await PluginConfigService.findAll()
      const presets = await PresetService.findAll()
      
      // 过滤掉内部使用的 _schema_hash
      const realSystemSettings = systemSettings.filter(s => s.key !== '_schema_hash')
      
      // 如果所有表都为空，认为是新安装
      return realSystemSettings.length === 0 && pluginConfigs.length === 0 && presets.length === 0
    } catch (error) {
      logger.warn('数据库检查失败，假设为新安装:', error.message)
      return true
    }
  }

  /**
   * 检查是否需要 OneBot 配置迁移
   */
  async needsOneBotMigration() {
    try {
      // 动态导入数据库服务
      const { default: SystemSettingsService } = await import('../database/services/SystemSettingsService.js')
      const { default: PluginConfigService } = await import('../database/services/PluginConfigService.js')
      
      // 初始化服务
      await SystemSettingsService.initialize()
      await PluginConfigService.initialize()
      
      // 检查是否存在旧的 OneBot 配置
      const oldConfig = await PluginConfigService.findByName('onebotConfig')
      if (!oldConfig) {
        return false
      }
      
      // 检查新位置是否已存在配置
      const newConfig = await SystemSettingsService.get('onebot')
      if (newConfig) {
        return false
      }
      
      logger.info('检测到需要迁移的 OneBot 配置')
      return true
    } catch (error) {
      logger.warn('OneBot 配置迁移检测失败:', error.message)
      return false
    }
  }

  /**
   * 执行 OneBot 配置迁移
   */
  async performOneBotMigration() {
    try {
      logger.info('🔄 正在迁移 OneBot 配置...')
      
      // 动态导入迁移器
      const { default: OneBotConfigMigrator } = await import('../../scripts/utils/migrate-onebot-config.js')
      
      // 创建迁移器实例（使用静默模式）
      const migrator = new OneBotConfigMigrator({ silent: true })
      
      // 执行迁移
      const stats = await migrator.migrate()
      
      if (stats.migrated) {
        logger.info('✅ OneBot 配置迁移完成')
      } else if (stats.found) {
        logger.info('ℹ️ OneBot 配置已存在，跳过迁移')
      } else {
        logger.debug('ℹ️ 未找到需要迁移的 OneBot 配置')
      }
      
      return { success: true, stats }
    } catch (error) {
      logger.error('❌ OneBot 配置迁移失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 执行自动迁移
   */
  async performAutoMigration() {
    try {
      logger.info('🔄 开始自动迁移老版本配置...')
      
      // 动态导入迁移器
      const { default: DataMigrator } = await import('../../scripts/utils/migrate-to-sqlite.js')
      
      // 创建迁移器实例
      const migrator = new DataMigrator()
      
      // 执行迁移
      const stats = await migrator.migrate()
      
      // 验证迁移结果
      const validation = await migrator.validateMigration()
      
      logger.info('✅ 自动迁移完成!')
      logger.info('迁移统计:', stats)
      logger.info('验证结果:', validation)
      
      return { success: true, stats, validation }
    } catch (error) {
      logger.error('❌ 自动迁移失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 执行完整的自动迁移检查和处理
   */
  async checkAndMigrate() {
    try {
      // 1. 检查是否需要完整迁移
      const needsFullMigration = await this.needsMigration()
      
      if (needsFullMigration) {
        this.showMigrationPrompt()
        const result = await this.performAutoMigration()
        this.showMigrationComplete(result)
        return result
      }
      
      // 2. 检查是否需要 OneBot 配置迁移
      const needsOneBotMigration = await this.needsOneBotMigration()
      
      if (needsOneBotMigration) {
        logger.info('🔍 检测到需要迁移的 OneBot 配置')
        const result = await this.performOneBotMigration()
        return result
      }
      
      // 3. 无需迁移
      logger.debug('无需执行配置迁移')
      return { success: true, noMigrationNeeded: true }
      
    } catch (error) {
      logger.error('迁移检查失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 显示迁移提示
   */
  showMigrationPrompt() {
    logger.info('=' .repeat(60))
    logger.info('🔍 检测到老版本配置文件')
    logger.info('📦 正在自动迁移配置到数据库...')
    logger.info('⏳ 请稍候，这可能需要几秒钟时间')
    logger.info('=' .repeat(60))
  }

  /**
   * 显示迁移完成信息
   */
  showMigrationComplete(result) {
    logger.info('=' .repeat(60))
    if (result.success) {
      logger.info('✅ 配置迁移完成！')
      logger.info('📊 迁移统计:')
      if (result.stats) {
        Object.entries(result.stats).forEach(([category, stats]) => {
          logger.info(`   ${category}: 成功 ${stats.success}, 失败 ${stats.failed}, 跳过 ${stats.skipped}`)
        })
      }
      logger.info('🎉 系统已准备就绪，可以正常使用！')
    } else {
      logger.error('❌ 配置迁移失败!')
      logger.error('💡 请手动运行迁移命令: pnpm run migrate')
      logger.error('📖 详细说明请查看: MIGRATION.md')
    }
    logger.info('=' .repeat(60))
  }
}

export default AutoMigrationDetector
