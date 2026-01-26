import logger from '../utils/logger.js'
import { getAdapterTypesSync, getAvailableAdapterTypes } from './chat/llm/adapters/registry.js'

/**
 * Configuration manager that handles loading, merging and accessing application settings.
 */
class Config {
  constructor() {
    this._initializeDefaultValues()
  }



  /**
   * Initialize default configuration values.
   * @private
   */
  _initializeDefaultValues() {
    this.onebot = {}
    this.presets = {
      common: [],
      recommended: [],
      hidden: [],
    }
    // 存储所有已加载成功的实例信息 { instanceId: string, adapterType: string, displayName: string }
    this.availableInstances = []
  }



  /**
   * Initialize the configuration by loading from database.
   */
  async initConfig() {
    // 配置已迁移到数据库，从数据库加载配置
    await this.loadAndMergeConfig()
  }

  /**
   * Load, merge and apply the configuration.
   */
  async loadAndMergeConfig() {
    logger.info('配置系统初始化成功! (使用数据库存储)')

    // 初始化默认配置结构
    const defaultConfig = {
      llm_adapters: {},
      server: { 
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3080,
        host: process.env.HOST || '0.0.0.0'
      },
      web: {},
      onebot: {},
      debug: process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'
    }
    
    // 应用默认配置
    Object.assign(this, defaultConfig)

    // 从数据库加载系统配置
    await this._loadSystemConfigFromDatabase()

    // 确保配置中包含所有在代码目录中存在的适配器键
    try {
      const availableAdapterTypes = getAdapterTypesSync()
      if (!this.llm_adapters) {
        this.llm_adapters = {}
      }
      for (const atype of availableAdapterTypes) {
        if (!Object.prototype.hasOwnProperty.call(this.llm_adapters, atype)) {
          this.llm_adapters[atype] = []
        }
      }
    } catch (err) {
      logger.warn('在补齐 llm_adapters 字段时发生错误:', err.message)
    }

    // Load additional configurations
    await this._loadAdditionalConfigs()

    // Handle debug mode
    this._setupDebugMode()
  }


  /**
   * Load additional configuration components.
   * @private
   */
  async _loadAdditionalConfigs() {
    // Load plugin configurations from database
    try {
      await this.loadPluginConfigFromDatabase()
    } catch (error) {
      logger.error('从数据库加载插件配置失败:', error)
      // 设置默认值
      this.onebot.plugins = null
    }

    // Load owner configurations from database
    try {
      await this.loadOwnersFromDatabase()
    } catch (error) {
      logger.error('从数据库加载模型所有者配置失败:', error)
      // 设置默认值
      this.owners = []
    }

    // Vertex 认证配置处理将在运行时从数据库配置中处理

    // Load LLM presets
    try {
      await this.loadLLMPresets()
    } catch (error) {
      logger.error('加载预设时发生错误:', error)
    }
  }

  /**
   * Set up debug mode if enabled in configuration.
   * @private
   */
  _setupDebugMode() {
    if (this.debug) {
      global.debug = true
    }
  }

  /**
   * Load plugin configurations from database
   * @private
   */
  async loadPluginConfigFromDatabase() {
    try {
      // 检查是否需要 OneBot 配置迁移
      await this._checkAndMigrateOneBotConfig()
      
      // OneBot 配置现在从 SystemSettingsService 加载，这里只处理其他插件配置
      // 设置默认的 OneBot 配置结构（实际值会在 _loadSystemConfigFromDatabase 中加载）
      if (!this.onebot) {
        this.onebot = {
          enable: false,
          reverse_ws_url: '',
          bot_qq: '',
          admin_qq: '',
          token: '',
          plugins: null
        }
      }
      
      logger.info('插件配置加载完成（OneBot 配置从系统设置加载）')
    } catch (error) {
      logger.error('从数据库加载插件配置失败:', error)
      throw error
    }
  }

  /**
   * 检查并迁移 OneBot 配置（无感迁移）
   * @private
   */
  async _checkAndMigrateOneBotConfig() {
    try {
      // 动态导入数据库服务
      const { default: SystemSettingsService } = await import('./database/services/SystemSettingsService.js')
      const { default: PluginConfigService } = await import('./database/services/PluginConfigService.js')
      
      // 确保服务已初始化
      if (!SystemSettingsService.prisma) {
        await SystemSettingsService.initialize()
      }
      if (!PluginConfigService.prisma) {
        await PluginConfigService.initialize()
      }
      
      // 检查是否存在旧的 OneBot 配置
      const oldConfig = await PluginConfigService.findByName('onebotConfig')
      if (!oldConfig) {
        return // 没有旧配置，无需迁移
      }
      
      // 检查新位置是否已存在配置
      const newConfig = await SystemSettingsService.get('onebot')
      if (newConfig) {
        return // 新配置已存在，无需迁移
      }
      
      // 执行无感迁移
      logger.info('🔄 检测到 OneBot 配置需要迁移，正在自动迁移...')
      
      const configData = oldConfig.configData
      await SystemSettingsService.set('onebot', configData, 'onebot', 'OneBot 协议配置')
      
      logger.info('✅ OneBot 配置自动迁移完成')
      
      // 注意：不删除旧配置，保持安全
      
    } catch (error) {
      logger.warn('OneBot 配置自动迁移失败，将使用默认配置:', error.message)
      // 不抛出错误，让应用继续启动
    }
  }

  /**
   * Load system configuration from database
   * @private
   */
  async _loadSystemConfigFromDatabase() {
    try {
      // 动态导入数据库服务（避免循环依赖）
      const { default: SystemSettingsService } = await import('./database/services/SystemSettingsService.js')
      
      // 确保服务已初始化
      if (!SystemSettingsService.prisma) {
        await SystemSettingsService.initialize()
      }
      
      // 从数据库加载系统配置
      const adminCode = await SystemSettingsService.get('admin_code')
      const userCode = await SystemSettingsService.get('user_code')
      const serverPort = await SystemSettingsService.get('server_port')
      const debugMode = await SystemSettingsService.get('debug_mode')
      const webFullScreen = await SystemSettingsService.get('web_full_screen')
      const webTitle = await SystemSettingsService.get('web_title')
      const webBeian = await SystemSettingsService.get('web_beian')
      const llmAdapters = await SystemSettingsService.get('llm_adapters')
      const onebotConfig = await SystemSettingsService.get('onebot')
      
      // 应用配置到内存中
      if (adminCode && adminCode.value) {
        this.web.admin_code = adminCode.value
      }
      
      if (userCode && userCode.value) {
        this.web.user_code = userCode.value
      }
      
      if (serverPort && serverPort.value) {
        this.server.port = serverPort.value
      }
      
      // 环境变量优先级最高，覆盖数据库配置
      if (process.env.PORT) {
        this.server.port = parseInt(process.env.PORT, 10)
        logger.info(`使用环境变量 PORT=${process.env.PORT} 覆盖数据库端口配置`)
      }
      
      if (process.env.HOST) {
        this.server.host = process.env.HOST
        logger.info(`使用环境变量 HOST=${process.env.HOST} 覆盖默认主机配置`)
      }
      
      if (debugMode && debugMode.value !== null) {
        this.debug = debugMode.value
      }
      
      if (webFullScreen && webFullScreen.value !== null) {
        this.web.full_screen = webFullScreen.value
      }
      
      if (webTitle && webTitle.value) {
        this.web.title = webTitle.value
      }
      
      if (webBeian && webBeian.value) {
        this.web.beian = webBeian.value
      }
      
      // 加载 LLM 适配器配置
      if (llmAdapters && llmAdapters.value) {
        this.llm_adapters = llmAdapters.value
        logger.info('从数据库加载 LLM 适配器配置成功')
      }
      
      // 加载 OneBot 配置
      if (onebotConfig && onebotConfig.value) {
        Object.assign(this.onebot, onebotConfig.value)
        logger.info('从数据库加载 OneBot 配置成功')
      } else {
        logger.info('使用默认 OneBot 配置')
      }
      
      logger.info('从数据库加载系统配置成功')
    } catch (error) {
      logger.warn('从数据库加载系统配置失败，使用默认值:', error.message)
    }
  }

  /**
   * Load owners configuration from database
   * @private
   */
  async loadOwnersFromDatabase() {
    try {
      // 动态导入数据库服务（避免循环依赖）
      const { default: SystemSettingsService } = await import('./database/services/SystemSettingsService.js')
      
      // 确保服务已初始化
      if (!SystemSettingsService.prisma) {
        await SystemSettingsService.initialize()
      }
      
      // 从数据库获取模型所有者配置
      const ownersSetting = await SystemSettingsService.get('model_owners')
      
      if (ownersSetting && ownersSetting.value) {
        this.owners = ownersSetting.value
        logger.info(`从数据库加载了 ${this.owners.length} 个模型所有者配置`)
      } else {
        this.owners = []
        logger.warn('数据库中未找到模型所有者配置')
      }
    } catch (error) {
      logger.error('从数据库加载模型所有者配置失败:', error)
      throw error
    }
  }

  /**
   * Get the models owners configuration.
   * @returns {Object} The models owners configuration.
   */
  getModelsOwners() {
    return this.owners
  }



  /**
   * Load LLM presets from the database.
   */
  async loadLLMPresets() {
    logger.info('正在从数据库加载 LLM 预设...')
    
    try {
      // 动态导入数据库服务（避免循环依赖）
      const { default: PresetService } = await import('./database/services/PresetService.js')
      
      // 确保服务已初始化
      if (!PresetService.prisma) {
        await PresetService.initialize()
      }
      
      // 从数据库加载预设
      const presetCategories = await PresetService.getAllPresets()
      
      const totalCount = Object.values(presetCategories).reduce((sum, category) => sum + category.length, 0)
      logger.mark(`从数据库加载了 ${totalCount} 个 LLM 预设`)
      
      this.presets = presetCategories
    } catch (error) {
      logger.error('从数据库加载预设失败:', error)
      // 如果数据库加载失败，使用空预设
      this.presets = { common: [], recommended: [], hidden: [] }
    }
  }



  /**
   * Get all LLM presets.
   * @returns {Object} Object containing common, recommended, and hidden presets.
   */
  getAllPresets() {
    return this.presets
  }

  /**
   * Load configuration based on type.
   * @param {string} type - Configuration type.
   * @returns {Object} The loaded configuration.
   * @throws {Error} Always throws since file-based config is deprecated.
   * @deprecated All configuration now loaded from database
   */
  loadConfig(type) {
    throw new Error(`文件配置加载已废弃: ${type}，请使用数据库配置`)
  }

  /**
   * Get information about which LLM adapter instances are enabled.
   * @returns {Array} Array of enabled adapter instances with their configurations.
   */
  async getLLMEnabled() {
    const instances = []
    const allAdapterTypes = await getAvailableAdapterTypes()

    // 只支持新格式,旧格式应该已经在加载时被迁移
    if (!this.llm_adapters) {
      logger.warn('未找到 llm_adapters 配置，请检查配置文件')
      return instances
    }

    // 遍历所有适配器类型
    for (const adapterType of allAdapterTypes) {
      const instancesList = this.llm_adapters[adapterType]
      if (!Array.isArray(instancesList)) continue

      let instanceCounter = 0
      for (const instanceConfig of instancesList) {
        if (!instanceConfig.enable) continue

        instanceCounter++
        // 如果没有指定 name，自动生成
        const displayName =
          instanceConfig.name || `${adapterType}-${instanceCounter}`
        // instanceId 就是 displayName
        const instanceId = displayName

        instances.push({
          instanceId,
          adapterType,
          displayName,
          config: instanceConfig,
          setAvailable: () => {
            this.availableInstances.push({
              instanceId,
              adapterType,
              displayName,
            })
          },
        })
      }
    }

    return instances
  }

  /**
   * Get list of available provider instances.
   * @returns {Array} Array of instance objects with displayName and adapterType.
   */
  getProvidersAvailable() {
    return this.availableInstances.map((inst) => ({
      displayName: inst.displayName,
      adapterType: inst.adapterType
    }))
  }

  /**
   * Get detailed information about available instances.
   * @returns {Array} Array of instance objects with full details.
   */
  getAvailableInstancesDetail() {
    return this.availableInstances
  }

  isOnebotEnabled() {
    return this.onebot.enable
  }

  /**
   * Get the Onebot configuration.
   * @returns {Object} The Onebot configuration.
   */
  getOnebotConfig() {
    return this.onebot
  }

  /**
   * Get configuration for a specific LLM type.
   * @param {string} type - LLM type ('openai' or 'gemini').
   * @returns {Object} The LLM configuration.
   */
  getLLMConfig(type) {
    if (type === 'openai') {
      return this.openai
    } else if (type === 'gemini') {
      return this.gemini
    }
  }

  /**
   * Get the default model for each LLM instance.
   * @returns {Object} Object containing default models for each available instance.
   */
  async getDefaultModel() {
    const defaultModel = {}

    // 直接从配置中获取所有启用的实例
    const instances = await this.getLLMEnabled()
    
    for (const instance of instances) {
      const { displayName, adapterType, config: instanceConfig } = instance
      
      if (instanceConfig && instanceConfig.default_model) {
        let modelName = instanceConfig.default_model
        // Gemini 需要添加 models/ 前缀
        if (adapterType === 'gemini' && !modelName.startsWith('models/')) {
          modelName = `models/${modelName}`
        }
        defaultModel[displayName] = modelName
      }
    }

    return defaultModel
  }

  /**
   * Update a configuration value.
   * @param {string} key - Configuration key.
   * @param {any} value - New value.
   * @deprecated This method is deprecated, use database services instead
   */
  updateConfig(_key, _value) {
    logger.warn('updateConfig is deprecated, use database services instead')
    throw new Error('Configuration updates should be done through database services')
  }

  /**
   * Reload configuration from disk (for hot reload)
   * @returns {Promise<void>}
   */
  async reload() {
    logger.info('重新加载配置文件...')
    
    // 重新加载和合并配置（这会自动处理 Vertex 等配置）
    await this.loadAndMergeConfig()
    await this._loadAdditionalConfigs()
    
    // 重置可用实例列表，会在 loadLLMAdapters 中重新填充
    this.availableInstances = []
    
    logger.info('配置文件重新加载完成')
  }

  /**
   * Deeply merge two objects, preserving non-conflicting properties.
   * @param {Object} target - Target object.
   * @param {Object} source - Source object.
   * @returns {Object} The merged object.
   */
  deepMerge(target, source) {
    for (const key in source) {
      if (Object.hasOwnProperty.call(source, key)) {
        const isTargetObject =
          typeof target[key] === 'object' && target[key] !== null
        const isSourceObject =
          typeof source[key] === 'object' && source[key] !== null

        if (isTargetObject && isSourceObject) {
          // Recursively merge nested objects
          target[key] = this.deepMerge(target[key], source[key])
        } else if (!(key in target)) {
          // Copy properties that don't exist in target
          target[key] = source[key]
        }
      }
    }

    return target
  }



  /**
   * 重新加载预设
   */
  async reloadPresets() {
    try {
      logger.info('重新加载所有预设...')
      await this.loadLLMPresets()
      logger.info('预设重新加载完成')
      return this.getAllPresets()
    } catch (error) {
      logger.error('重新加载预设失败:', error)
      throw error
    }
  }
}

// Initialize configuration
logger.info('正在初始化配置...')
const config = new Config()

// 异步初始化配置
let configInitialized = false
const initPromise = config.initConfig().then(() => {
  configInitialized = true
  // Set debug mode globally if enabled
  if (config.debug) {
    logger.warn('调试模式已开启!')
    global.debug = true
  }
  logger.info('配置初始化完成')
}).catch(error => {
  logger.error('配置初始化失败:', error)
})

// 导出配置对象和初始化状态
config._isInitialized = () => configInitialized
config._waitForInit = () => initPromise

export default config
