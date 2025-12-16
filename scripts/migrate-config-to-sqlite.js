// scripts/migrate-config-to-sqlite.js
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { fileURLToPath } from 'url'
import DatabaseManager from '../lib/database/DatabaseManager.js'
import SystemSettingsDAO from '../lib/database/dao/SystemSettingsDAO.js'
import LLMAdapterDAO from '../lib/database/dao/LLMAdapterDAO.js'
import ModelOwnerDAO from '../lib/database/dao/ModelOwnerDAO.js'
import PluginConfigDAO from '../lib/database/dao/PluginConfigDAO.js'
import logger from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class ConfigMigrator {
  constructor() {
    this.stats = {
      systemSettings: { success: 0, failed: 0 },
      llmAdapters: { success: 0, failed: 0 },
      modelOwners: { success: 0, failed: 0 },
      pluginConfigs: { success: 0, failed: 0 }
    }
  }

  async migrate() {
    try {
      logger.info('开始配置文件迁移到 SQLite...')
      
      // 初始化数据库
      await DatabaseManager.initialize()
      
      // 备份现有配置
      await this.backupConfigs()
      
      // 迁移主配置文件
      await this.migrateMainConfig()
      
      // 迁移模型所有者配置
      await this.migrateModelOwners()
      
      // 迁移插件配置
      await this.migratePluginConfigs()
      
      // 输出迁移统计
      this.printStats()
      
      logger.info('配置文件迁移完成!')
    } catch (error) {
      logger.error('配置文件迁移失败:', error)
      throw error
    }
  }

  async backupConfigs() {
    const backupDir = path.resolve(__dirname, '../backup/config', new Date().toISOString().split('T')[0])
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    // 备份整个config目录
    const configDir = path.resolve(__dirname, '../config')
    if (fs.existsSync(configDir)) {
      await this.copyDirectory(configDir, path.join(backupDir, 'config'))
    }

    logger.info(`配置文件备份完成: ${backupDir}`)
  }

  async migrateMainConfig() {
    logger.info('开始迁移主配置文件...')
    
    const configPath = path.resolve(__dirname, '../config/config/config.yaml')
    if (!fs.existsSync(configPath)) {
      logger.warn('主配置文件不存在，跳过迁移')
      return
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf8')
      const config = yaml.load(configContent)
      
      // 迁移系统配置
      await this.migrateSystemSettings(config)
      
      // 迁移LLM适配器配置
      await this.migrateLLMAdapters(config.llm_adapters || {})
      
    } catch (error) {
      this.stats.systemSettings.failed++
      logger.error('迁移主配置文件失败:', error.message)
    }
  }

  async migrateSystemSettings(config) {
    const systemConfigs = []
    
    // 服务器配置
    if (config.server) {
      systemConfigs.push({
        key: 'server',
        value: config.server,
        category: 'server',
        description: '服务器配置'
      })
    }

    // Web配置
    if (config.web) {
      systemConfigs.push({
        key: 'web',
        value: config.web,
        category: 'web',
        description: 'Web界面配置'
      })
    }

    // OneBot配置
    if (config.onebot) {
      systemConfigs.push({
        key: 'onebot',
        value: config.onebot,
        category: 'onebot',
        description: 'OneBot协议配置'
      })
    }

    // 调试模式
    if (config.debug !== undefined) {
      systemConfigs.push({
        key: 'debug',
        value: config.debug,
        category: 'general',
        description: '调试模式开关'
      })
    }

    // 批量保存系统配置
    if (systemConfigs.length > 0) {
      await SystemSettingsDAO.setBatch(systemConfigs)
      this.stats.systemSettings.success += systemConfigs.length
      logger.info(`迁移系统配置成功: ${systemConfigs.length} 项`)
    }
  }

  async migrateLLMAdapters(llmAdapters) {
    const adapters = []
    
    for (const [adapterType, instances] of Object.entries(llmAdapters)) {
      if (!Array.isArray(instances)) continue
      
      instances.forEach((instance, index) => {
        if (!instance || typeof instance !== 'object') return
        
        // 生成实例名称
        const instanceName = instance.name || `${adapterType}-${index + 1}`
        
        adapters.push({
          adapter_type: adapterType,
          instance_name: instanceName,
          config_data: instance,
          enabled: instance.enable !== false // 默认启用，除非明确禁用
        })
      })
    }

    if (adapters.length > 0) {
      await LLMAdapterDAO.saveBatch(adapters)
      this.stats.llmAdapters.success += adapters.length
      logger.info(`迁移LLM适配器配置成功: ${adapters.length} 项`)
    }
  }

  async migrateModelOwners() {
    logger.info('开始迁移模型所有者配置...')
    
    const ownersPath = path.resolve(__dirname, '../config/config/owners.yaml')
    if (!fs.existsSync(ownersPath)) {
      logger.warn('模型所有者配置文件不存在，跳过迁移')
      return
    }

    try {
      const ownersContent = fs.readFileSync(ownersPath, 'utf8')
      const owners = yaml.load(ownersContent)
      
      if (Array.isArray(owners)) {
        await ModelOwnerDAO.saveBatch(owners)
        this.stats.modelOwners.success += owners.length
        logger.info(`迁移模型所有者配置成功: ${owners.length} 项`)
      }
    } catch (error) {
      this.stats.modelOwners.failed++
      logger.error('迁移模型所有者配置失败:', error.message)
    }
  }

  async migratePluginConfigs() {
    logger.info('开始迁移插件配置...')
    
    const pluginsDir = path.resolve(__dirname, '../config/plugins')
    if (!fs.existsSync(pluginsDir)) {
      logger.warn('插件配置目录不存在，跳过迁移')
      return
    }

    const files = fs.readdirSync(pluginsDir)
    
    for (const file of files) {
      if (file === '.gitignore') continue
      
      const filePath = path.join(pluginsDir, file)
      const pluginName = path.basename(file, path.extname(file))
      
      try {
        let config
        
        if (file.endsWith('.json')) {
          const content = fs.readFileSync(filePath, 'utf8')
          config = JSON.parse(content)
        } else if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const content = fs.readFileSync(filePath, 'utf8')
          config = yaml.load(content)
        } else {
          continue // 跳过不支持的文件类型
        }
        
        await PluginConfigDAO.create({
          plugin_name: pluginName,
          config_data: config,
          enabled: true
        })
        
        this.stats.pluginConfigs.success++
        logger.debug(`迁移插件配置成功: ${pluginName}`)
      } catch (error) {
        this.stats.pluginConfigs.failed++
        logger.error(`迁移插件配置失败 ${file}:`, error.message)
      }
    }
  }

  async copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }

    const entries = fs.readdirSync(src, { withFileTypes: true })
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }

  printStats() {
    logger.info('=== 配置迁移统计 ===')
    logger.info(`系统配置: 成功 ${this.stats.systemSettings.success}, 失败 ${this.stats.systemSettings.failed}`)
    logger.info(`LLM适配器: 成功 ${this.stats.llmAdapters.success}, 失败 ${this.stats.llmAdapters.failed}`)
    logger.info(`模型所有者: 成功 ${this.stats.modelOwners.success}, 失败 ${this.stats.modelOwners.failed}`)
    logger.info(`插件配置: 成功 ${this.stats.pluginConfigs.success}, 失败 ${this.stats.pluginConfigs.failed}`)
    
    const totalSuccess = Object.values(this.stats).reduce((sum, stat) => sum + stat.success, 0)
    const totalFailed = Object.values(this.stats).reduce((sum, stat) => sum + stat.failed, 0)
    
    logger.info(`总计: 成功 ${totalSuccess}, 失败 ${totalFailed}`)
  }

  // 验证迁移结果
  async validateMigration() {
    logger.info('开始验证迁移结果...')
    
    try {
      // 验证系统配置
      const systemSettings = await SystemSettingsDAO.getAllGroupedByCategory()
      logger.info(`验证系统配置: ${Object.keys(systemSettings).length} 个分类`)
      
      // 验证LLM适配器
      const llmAdapters = await LLMAdapterDAO.getAllGroupedByType()
      logger.info(`验证LLM适配器: ${Object.keys(llmAdapters).length} 种类型`)
      
      // 验证模型所有者
      const modelOwners = await ModelOwnerDAO.getAll()
      logger.info(`验证模型所有者: ${modelOwners.length} 项`)
      
      // 验证插件配置
      const pluginConfigs = await PluginConfigDAO.findAll()
      logger.info(`验证插件配置: ${pluginConfigs.length} 项`)
      
      logger.info('迁移结果验证完成')
      return true
    } catch (error) {
      logger.error('迁移结果验证失败:', error)
      return false
    }
  }
}

// 执行迁移
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrator = new ConfigMigrator()
  
  migrator.migrate()
    .then(() => migrator.validateMigration())
    .catch(error => {
      logger.error('迁移过程中发生错误:', error)
      process.exit(1)
    })
}

export default ConfigMigrator