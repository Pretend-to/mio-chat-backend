/* eslint-disable camelcase */
import fs from 'fs'
import yaml from 'js-yaml'
import { fileURLToPath } from 'url'
import path from 'path'
import logger from '../utils/logger.js'
import { getAdapterTypesSync, getAvailableAdapterTypes } from './chat/llm/adapters/registry.js'

/**
 * Configuration manager that handles loading, merging and accessing application settings.
 */
class Config {
  constructor() {
    this._initializePaths()
    this._initializeDefaultValues()
  }

  /**
   * Set up file paths used by the configuration system.
   * @private
   */
  _initializePaths() {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)

    // Configuration file paths
    this.config_path = path.resolve(__dirname, '../config/config/config.yaml')
    this.example_path = path.resolve(
      __dirname,
      '../config/config/config.example.yaml',
    )
    this.onebot_plugin_path = path.resolve(
      __dirname,
      '../config/plugins/onebotConfig.yaml',
    )
    this.llm_owners_path = path.resolve(
      __dirname,
      '../config/config/owners.yaml',
    )
    this.llm_presets_dir = path.resolve(__dirname, '../presets')
    this.vertex_auth_path = path.resolve(
      __dirname,
      '../config/config/vertex.json',
    )
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
   * Check if a file exists.
   * @param {string} filePath - Path to the file.
   * @returns {boolean} True if the file exists, false otherwise.
   */
  checkConfigExists(filePath) {
    try {
      fs.accessSync(filePath, fs.constants.F_OK)
      return true
    } catch (err) {
      return false
    }
  }

  /**
   * Initialize the configuration by loading or creating configuration files.
   */
  initConfig() {
    if (!this.checkConfigExists(this.config_path)) {
      this.createConfigFile()
    } else {
      this.loadAndMergeConfig()
    }
  }

  /**
   * Create a new configuration file from the example template.
   */
  createConfigFile() {
    const exampleContent = fs.readFileSync(this.example_path, 'utf8')
    fs.writeFileSync(this.config_path, exampleContent, 'utf8')
    logger.info(
      '配置文件不存在，已在路径: config/config/config.yaml 创建配置文件，请完善后重启服务',
    )
    process.exit(0)
  }

  /**
   * Load, merge and apply the configuration.
   */
  loadAndMergeConfig() {
    logger.info('配置文件加载成功!')

    // Load configurations
    const userConfig = this.loadConfig('default')
    
    // 检查并迁移旧格式
    const migratedConfig = this._migrateOldFormatToNew(userConfig)

    // 确保配置中包含所有在代码目录中存在的适配器键（自动补齐）
    try {
      const availableAdapterTypes = getAdapterTypesSync()
      if (!migratedConfig.llm_adapters) {
        migratedConfig.llm_adapters = {}
      }
      let addedAdapterField = false
      for (const atype of availableAdapterTypes) {
        if (!Object.prototype.hasOwnProperty.call(migratedConfig.llm_adapters, atype)) {
          migratedConfig.llm_adapters[atype] = []
          addedAdapterField = true
        }
      }

      // 如果进行了迁移或添加了适配器字段，保存回文件
      if (migratedConfig !== userConfig || addedAdapterField) {
        this.writeYamlFile(this.config_path, migratedConfig)
      }
    } catch (err) {
      logger.warn('在补齐 llm_adapters 字段时发生错误:', err.message)
      // 如果失败，仍然在后续流程中使用 migratedConfig
    }

    // Apply configuration to this instance
    Object.assign(this, migratedConfig)

    // Load additional configurations
    this._loadAdditionalConfigs()

    // Handle debug mode
    this._setupDebugMode()
  }
  /**
   * 将旧配置格式静默迁移到新的多实例格式
   * @private
   * @param {Object} config - 用户配置对象
   * @returns {Object} 迁移后的配置对象
   */
  _migrateOldFormatToNew(config) {
    const allAdapterTypes = getAdapterTypesSync()
    let hasOldFormat = false
    
    // 检测是否使用旧格式
    for (const adapterType of allAdapterTypes) {
      if (config[adapterType] && typeof config[adapterType] === 'object' && !Array.isArray(config[adapterType])) {
        hasOldFormat = true
        break
      }
    }

    // 如果没有旧格式，直接返回
    if (!hasOldFormat) {
      return config
    }

    logger.info('检测到旧配置格式，自动迁移到新的多实例格式...')

    // 创建新格式的配置
    const newConfig = { ...config }
    
    // 初始化 llm_adapters
    if (!newConfig.llm_adapters) {
      newConfig.llm_adapters = {}
    }

    // 迁移每个适配器类型
    for (const adapterType of allAdapterTypes) {
      const oldAdapterConfig = config[adapterType]
      
      if (oldAdapterConfig && typeof oldAdapterConfig === 'object' && !Array.isArray(oldAdapterConfig)) {
        // 将旧格式转换为数组格式
        newConfig.llm_adapters[adapterType] = [{
          name: '',  // 使用自动命名
          ...oldAdapterConfig
        }]
        
        // 删除旧格式的配置
        delete newConfig[adapterType]
        
        logger.info(`  ✓ 迁移 ${adapterType} 配置`)
      }
    }

    logger.info('配置迁移完成，已保存到文件')
    
    return newConfig
  }

  /**
   * Load additional configuration components.
   * @private
   */
  _loadAdditionalConfigs() {
    // Load plugin configurations
    this.onebot.plugins = this.loadPluginConfig(this.onebot_plugin_path)

    // Load owner configurations
    this.owners = this.loadConfig('owners')

    // 处理 Vertex 实例的认证配置
    const vertexInstances = this.llm_adapters?.vertex
    if (Array.isArray(vertexInstances)) {
      for (const vertexInst of vertexInstances) {
        if (!vertexInst.enable) continue

        // 如果提供了 service_account_json 字符串，解析它
        if (vertexInst.service_account_json && vertexInst.service_account_json.trim()) {
          try {
            vertexInst.authConfig = JSON.parse(vertexInst.service_account_json)
            logger.info('Vertex 实例使用 service_account_json 配置')
          } catch (error) {
            logger.error('Vertex service_account_json 解析失败:', error.message)
          }
        }
        // 否则，如果提供了文件路径，从文件加载
        else if (vertexInst.auth_file_path && vertexInst.auth_file_path.trim()) {
          try {
            vertexInst.authConfig = this.loadJsonFile(vertexInst.auth_file_path)
            logger.info(`Vertex 实例从文件加载认证配置: ${vertexInst.auth_file_path}`)
          } catch (error) {
            logger.warn(`Vertex 密钥文件加载失败: ${vertexInst.auth_file_path}`, error.message)
          }
        }
        // 否则尝试从默认路径加载（向后兼容）
        else {
          try {
            const defaultAuthConfig = this.loadConfig('vertex')
            vertexInst.authConfig = defaultAuthConfig
            logger.info('Vertex 实例使用默认路径的认证配置')
          } catch (error) {
            logger.warn(
              'Vertex 未配置认证信息，请配置 service_account_json 或 auth_file_path',
            )
          }
        }

        // 添加 Gemini 配置用于 Vertex（如果需要）
        const geminiInst = this.llm_adapters?.gemini?.[0]
        if (geminiInst) {
          vertexInst.geminiConfig = geminiInst
        }
      }
    }

    // Load LLM presets
    this.loadLLMPresets()
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
   * Get the models owners configuration.
   * @returns {Object} The models owners configuration.
   */
  getModelsOwners() {
    return this.owners
  }

  /**
   * Load plugin configuration from a specified file path.
   * @param {string} filePath - Path to the plugin configuration file.
   * @returns {Object|null} The plugin configuration or null if the file doesn't exist.
   */
  loadPluginConfig(filePath) {
    if (!this.checkConfigExists(filePath)) {
      logger.info('插件配置文件不存在,请完善后重启服务')
      return null
    }

    const type = filePath === this.onebot_plugin_path ? 'onebot' : 'openai'
    return this.loadConfig(type)
  }

  /**
   * Load LLM presets from the presets directory.
   */
  loadLLMPresets() {
    logger.info('正在加载 LLM 预设...')
    const presetCategories = { common: [], recommended: [], hidden: [] }
    const loadPresetsFromDir = (dir, files) => {
      files.forEach((file) => {
        const filePath = path.resolve(dir, file)
        this._loadPresetFile(filePath, presetCategories)
      })
    }

    try {
      const builtInPresetsPath = path.join(this.llm_presets_dir, 'built-in')
      const customPresetsPath = path.join(this.llm_presets_dir, 'custom')

      loadPresetsFromDir(builtInPresetsPath, fs.readdirSync(builtInPresetsPath))
      loadPresetsFromDir(customPresetsPath, fs.readdirSync(customPresetsPath))

      logger.mark(`加载了 ${presetCategories.common.length} 个 LLM 预设`)
      this.presets = presetCategories
    } catch (error) {
      this._handlePresetLoadError(error)
    }
  }

  /**
   * Process a single preset file and categorize it.
   * @param {string} file - The preset file name.
   * @param {Object} categories - Object to store categorized presets.
   * @private
   */
  _loadPresetFile(filePath, categories) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8')
      const content = JSON.parse(fileContent)

      if (content.hidden) {
        categories.hidden.push(content)
      } else if (content.recommended) {
        categories.recommended.push(content)
      } else {
        categories.common.push(content)
      }
    } catch (e) {
      logger.error(`加载OpenAI预设 ${filePath} 失败: ${e.message}`)
    }
  }

  /**
   * Handle errors when loading presets.
   * @param {Error} error - The error that occurred.
   * @private
   */
  _handlePresetLoadError(error) {
    if (error.code === 'ENOENT') {
      logger.warn(`预设目录不存在: ${this.llm_presets_dir}`)
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
   * @param {string} type - Configuration type ('default', 'onebot', 'openai', 'owners').
   * @returns {Object} The loaded configuration.
   * @throws {Error} If the type is invalid.
   */
  loadConfig(type) {
    const filePath = this._getConfigFilePath(type)
    if (!this.checkConfigExists(filePath)) {
      throw new Error(`配置文件不存在: ${filePath}`)
    }
    if (type !== 'vertex') {
      return this.loadYamlFile(filePath)
    } else {
      return this.loadJsonFile(filePath)
    }
  }

  /**
   * Get the file path for a specific configuration type.
   * @param {string} type - Configuration type.
   * @returns {string} The file path.
   * @throws {Error} If the type is invalid.
   * @private
   */
  _getConfigFilePath(type) {
    switch (type) {
      case 'default':
        return this.config_path
      case 'onebot':
        return this.onebot_plugin_path
      case 'openai':
        return this.openai_tools_path
      case 'owners':
        return this.llm_owners_path
      case 'vertex':
        return this.vertex_auth_path
      default:
        throw new Error('无效的配置类型')
    }
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

    // 遍历所有可用实例，返回每个实例的默认模型
    for (const instance of this.availableInstances) {
      const { displayName, adapterType, instanceId } = instance
      
      // 从配置中查找对应实例的配置
      const instances = await this.getLLMEnabled()
      const instanceConfig = instances.find((inst) => inst.instanceId === instanceId)
      
      if (instanceConfig && instanceConfig.config.default_model) {
        let modelName = instanceConfig.config.default_model
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
   */
  updateConfig(key, value) {
    this.config[key] = value
    this.writeYamlFile(this.config_path, this.config)
    this.config = this.loadConfig('default')
  }

  /**
   * Reload configuration from disk (for hot reload)
   * @returns {Promise<void>}
   */
  async reload() {
    logger.info('重新加载配置文件...')
    
    // 重新加载和合并配置（这会自动处理 Vertex 等配置）
    this.loadAndMergeConfig()
    this._loadAdditionalConfigs()
    
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
   * Load and parse a YAML file.
   * @param {string} filePath - Path to the YAML file.
   * @returns {Object} The parsed YAML content or an empty object if loading fails.
   */
  loadYamlFile(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8')
      return yaml.load(fileContent)
    } catch (e) {
      logger.error(`加载 YAML 文件 ${filePath} 失败: ${e.message}`)
      return {} // Return empty object to avoid crashes
    }
  }

  loadJsonFile(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(fileContent)
    } catch (e) {
      logger.error(`加载 JSON 文件 ${filePath} 失败: ${e.message}`)
      return {} // Return empty object to avoid crashes
    }
  }

  /**
   * Write data to a YAML file.
   * @param {string} filePath - Path to the YAML file.
   * @param {any} data - Data to write.
   */
  writeYamlFile(filePath, data) {
    try {
      const yamlString = yaml.dump(data)
      fs.writeFileSync(filePath, yamlString, 'utf8')
    } catch (e) {
      logger.error(`写入 YAML 文件 ${filePath} 失败: ${e.message}`)
    }
  }
}

// Initialize configuration
logger.info('正在初始化配置...')
const config = new Config()
config.initConfig()

// Set debug mode globally if enabled
if (config.debug) {
  logger.warn('调试模式已开启!')
  global.debug = true
}

export default config
