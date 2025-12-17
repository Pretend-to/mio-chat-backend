import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { fileURLToPath } from 'url'
import prismaManager from '../lib/database/prisma.js'
import PresetService from '../lib/database/services/PresetService.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import PluginConfigService from '../lib/database/services/PluginConfigService.js'
import logger from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 完整数据迁移器
 * 将所有 JSON/YAML 配置文件迁移到 SQLite 数据库
 */
class DataMigrator {
  constructor() {
    this.stats = {
      presets: { success: 0, failed: 0, skipped: 0 },
      systemSettings: { success: 0, failed: 0, skipped: 0 },
      pluginConfigs: { success: 0, failed: 0, skipped: 0 }
    }
    this.backupDir = path.resolve(__dirname, '../backup', new Date().toISOString().split('T')[0])
  }

  /**
   * 执行完整迁移
   */
  async migrate() {
    try {
      logger.info('开始完整数据迁移到 SQLite...')
      
      // 初始化数据库和服务
      await this.initializeServices()
      
      // 备份现有数据
      await this.backupExistingData()
      
      // 迁移预设数据
      await this.migratePresets()
      
      // 迁移系统配置
      await this.migrateSystemSettings()
      
      // 迁移插件配置
      await this.migratePluginConfigs()
      
      // 输出迁移统计
      this.printStats()
      
      logger.info('完整数据迁移完成!')
      return this.stats
    } catch (error) {
      logger.error('数据迁移失败:', error)
      throw error
    } finally {
      await prismaManager.disconnect()
    }
  }

  /**
   * 初始化数据库和服务
   */
  async initializeServices() {
    logger.info('初始化数据库和服务...')
    
    await prismaManager.initialize()
    await PresetService.initialize()
    await SystemSettingsService.initialize()
    await PluginConfigService.initialize()
    
    logger.info('数据库和服务初始化完成')
  }

  /**
   * 备份现有数据
   */
  async backupExistingData() {
    logger.info('备份现有数据...')
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
    }

    const backupTasks = [
      // 备份预设目录
      {
        source: path.resolve(__dirname, '../presets'),
        target: path.join(this.backupDir, 'presets')
      },
      // 备份配置目录
      {
        source: path.resolve(__dirname, '../config'),
        target: path.join(this.backupDir, 'config')
      }
    ]

    for (const task of backupTasks) {
      if (fs.existsSync(task.source)) {
        await this.copyDirectory(task.source, task.target)
      }
    }

    logger.info(`数据备份完成: ${this.backupDir}`)
  }

  /**
   * 迁移预设数据
   */
  async migratePresets() {
    logger.info('开始迁移预设数据...')
    
    const presetsDir = path.resolve(__dirname, '../presets')
    const builtInDir = path.join(presetsDir, 'built-in')
    const customDir = path.join(presetsDir, 'custom')

    // 迁移内置预设
    if (fs.existsSync(builtInDir)) {
      await this.migratePresetsFromDir(builtInDir, 'built-in')
    }

    // 迁移自定义预设
    if (fs.existsSync(customDir)) {
      await this.migratePresetsFromDir(customDir, 'custom')
    }

    logger.info(`预设迁移完成: 成功 ${this.stats.presets.success}, 失败 ${this.stats.presets.failed}, 跳过 ${this.stats.presets.skipped}`)
  }

  /**
   * 从目录迁移预设
   */
  async migratePresetsFromDir(dir, type) {
    const files = fs.readdirSync(dir).filter(file => file.endsWith('.json'))
    
    logger.info(`迁移 ${type} 预设: ${files.length} 个文件`)
    
    for (const file of files) {
      try {
        const filePath = path.join(dir, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const preset = JSON.parse(content)
        
        // 检查是否已存在
        const exists = await PresetService.exists(preset.name)
        if (exists) {
          logger.debug(`预设已存在，跳过: ${preset.name}`)
          this.stats.presets.skipped++
          continue
        }
        
        // 设置预设类型和分类
        preset.type = type
        if (preset.hidden) {
          preset.category = 'hidden'
        } else if (preset.recommended) {
          preset.category = 'recommended'
        } else {
          preset.category = 'common'
        }
        
        // 保存到数据库
        await PresetService.create(preset)
        this.stats.presets.success++
        
        logger.debug(`迁移预设成功: ${preset.name}`)
      } catch (error) {
        this.stats.presets.failed++
        logger.error(`迁移预设失败 ${file}:`, error.message)
      }
    }
  }

  /**
   * 迁移系统配置
   */
  async migrateSystemSettings() {
    logger.info('开始迁移系统配置...')
    
    const configPath = path.resolve(__dirname, '../config/config/config.yaml')
    const ownersPath = path.resolve(__dirname, '../config/config/owners.yaml')
    
    // 迁移主配置文件
    if (fs.existsSync(configPath)) {
      await this.migrateMainConfig(configPath)
    }
    
    // 迁移模型所有者配置
    if (fs.existsSync(ownersPath)) {
      await this.migrateOwnersConfig(ownersPath)
    }
    
    logger.info(`系统配置迁移完成: 成功 ${this.stats.systemSettings.success}, 失败 ${this.stats.systemSettings.failed}`)
  }

  /**
   * 迁移主配置文件
   */
  async migrateMainConfig(configPath) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf8')
      const config = yaml.load(configContent)
      
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

      // LLM适配器配置
      if (config.llm_adapters) {
        systemConfigs.push({
          key: 'llm_adapters',
          value: config.llm_adapters,
          category: 'llm',
          description: 'LLM适配器配置'
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
      for (const setting of systemConfigs) {
        try {
          const exists = await SystemSettingsService.exists(setting.key)
          if (exists) {
            logger.debug(`系统配置已存在，跳过: ${setting.key}`)
            this.stats.systemSettings.skipped++
            continue
          }
          
          await SystemSettingsService.set(
            setting.key,
            setting.value,
            setting.category,
            setting.description
          )
          this.stats.systemSettings.success++
        } catch (error) {
          this.stats.systemSettings.failed++
          logger.error(`迁移系统配置失败 ${setting.key}:`, error.message)
        }
      }
    } catch (error) {
      this.stats.systemSettings.failed++
      logger.error('迁移主配置文件失败:', error.message)
    }
  }

  /**
   * 迁移模型所有者配置
   */
  async migrateOwnersConfig(ownersPath) {
    try {
      const ownersContent = fs.readFileSync(ownersPath, 'utf8')
      const owners = yaml.load(ownersContent)
      
      if (Array.isArray(owners)) {
        const exists = await SystemSettingsService.exists('model_owners')
        if (exists) {
          logger.debug('模型所有者配置已存在，跳过')
          this.stats.systemSettings.skipped++
          return
        }
        
        await SystemSettingsService.set(
          'model_owners',
          owners,
          'llm',
          '模型所有者配置'
        )
        this.stats.systemSettings.success++
        logger.info(`迁移模型所有者配置成功: ${owners.length} 项`)
      }
    } catch (error) {
      this.stats.systemSettings.failed++
      logger.error('迁移模型所有者配置失败:', error.message)
    }
  }

  /**
   * 迁移插件配置
   */
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
        // 检查是否已存在
        const exists = await PluginConfigService.exists(pluginName)
        if (exists) {
          logger.debug(`插件配置已存在，跳过: ${pluginName}`)
          this.stats.pluginConfigs.skipped++
          continue
        }
        
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
        
        await PluginConfigService.create(pluginName, config, true)
        this.stats.pluginConfigs.success++
        
        logger.debug(`迁移插件配置成功: ${pluginName}`)
      } catch (error) {
        this.stats.pluginConfigs.failed++
        logger.error(`迁移插件配置失败 ${file}:`, error.message)
      }
    }
    
    logger.info(`插件配置迁移完成: 成功 ${this.stats.pluginConfigs.success}, 失败 ${this.stats.pluginConfigs.failed}, 跳过 ${this.stats.pluginConfigs.skipped}`)
  }

  /**
   * 复制目录
   */
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

  /**
   * 输出迁移统计
   */
  printStats() {
    logger.info('=== 数据迁移统计 ===')
    
    Object.entries(this.stats).forEach(([category, stats]) => {
      const total = stats.success + stats.failed + stats.skipped
      logger.info(`${category}: 总计 ${total}, 成功 ${stats.success}, 失败 ${stats.failed}, 跳过 ${stats.skipped}`)
    })
    
    const totalSuccess = Object.values(this.stats).reduce((sum, stat) => sum + stat.success, 0)
    const totalFailed = Object.values(this.stats).reduce((sum, stat) => sum + stat.failed, 0)
    const totalSkipped = Object.values(this.stats).reduce((sum, stat) => sum + stat.skipped, 0)
    const grandTotal = totalSuccess + totalFailed + totalSkipped
    
    logger.info(`总计: ${grandTotal} 项, 成功 ${totalSuccess}, 失败 ${totalFailed}, 跳过 ${totalSkipped}`)
    logger.info(`备份位置: ${this.backupDir}`)
  }

  /**
   * 验证迁移结果
   */
  async validateMigration() {
    logger.info('开始验证迁移结果...')
    
    try {
      // 验证预设
      const presets = await PresetService.getAllPresets()
      const presetCount = Object.values(presets).reduce((sum, category) => sum + category.length, 0)
      logger.info(`验证预设: ${presetCount} 个`)
      
      // 验证系统配置
      const systemSettings = await SystemSettingsService.getAllGroupedByCategory()
      const settingCount = Object.values(systemSettings).reduce((sum, category) => sum + Object.keys(category).length, 0)
      logger.info(`验证系统配置: ${settingCount} 项`)
      
      // 验证插件配置
      const pluginConfigs = await PluginConfigService.findAll()
      logger.info(`验证插件配置: ${pluginConfigs.length} 项`)
      
      logger.info('迁移结果验证完成')
      return {
        presets: presetCount,
        systemSettings: settingCount,
        pluginConfigs: pluginConfigs.length
      }
    } catch (error) {
      logger.error('迁移结果验证失败:', error)
      throw error
    }
  }
}

// 执行迁移
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrator = new DataMigrator()
  
  migrator.migrate()
    .then(() => migrator.validateMigration())
    .then((validation) => {
      logger.info('数据迁移和验证全部完成!')
      logger.info('验证结果:', validation)
      process.exit(0)
    })
    .catch(error => {
      logger.error('迁移过程中发生错误:', error)
      process.exit(1)
    })
}

export default DataMigrator