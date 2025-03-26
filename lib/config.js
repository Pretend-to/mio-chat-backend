/* eslint-disable camelcase */
import fs from 'fs'
import yaml from 'js-yaml'
import { fileURLToPath } from 'url'
import path from 'path'

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
    this.example_path = path.resolve(__dirname, '../config/config/config.example.yaml')
    this.onebot_plugin_path = path.resolve(__dirname, '../config/plugins/onebotConfig.yaml')
    this.llm_owners_path = path.resolve(__dirname, '../config/config/owners.yaml')
    this.llm_presets_dir = path.resolve(__dirname, '../presets')
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
    const exampleConfig = this.loadYamlFile(this.example_path)
    
    // Merge configurations to include any new settings from the example
    const mergedConfig = this.deepMerge(userConfig, exampleConfig)
    
    // Save the merged configuration
    this.writeYamlFile(this.config_path, mergedConfig)
    
    // Load the final configuration and apply it to this instance
    const finalConfig = this.loadConfig('default')
    Object.assign(this, finalConfig)
    
    // Load additional configurations
    this._loadAdditionalConfigs()
    
    // Handle debug mode
    this._setupDebugMode()
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
      files.forEach(file => {
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
    return this.loadYamlFile(filePath)
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
      default:
        throw new Error('无效的配置类型')
    }
  }

  /**
   * Get information about which LLM services are enabled.
   * @returns {Object} Object with availability flags for each LLM service.
   */
  getLLMEnabled() {
    // return {
    //   openaiAvalible: this.openai.enable,
    //   geminiAvalible: this.gemini.enable,
    // }
    const list = []
    const elm = {
      name: '',
      enable: false,
      avaliable: false,
      config: {},
    }

    if (this.openai.enable) {
      elm.name = 'openai'
      elm.enable = true
      elm.config = this.openai
      list.push(elm) 
    } 
    if (this.gemini.enable) {
      elm.name = 'gemini'
      elm.enable = true
      elm.config = this.gemini
      list.push(elm) 
    }

    return list
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
   * Get the default models for enabled LLM services.
   * @returns {Object} Object containing default models for enabled LLM services.
   */
  getDefaultModel() {
    const defaultModel = {}
    
    if (this.openai.enable) {
      defaultModel.openai = this.openai.default_model
    }
    
    if (this.gemini.enable) {
      defaultModel.gemini = `models/${this.gemini.default_model}`
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
   * Deeply merge two objects, preserving non-conflicting properties.
   * @param {Object} target - Target object.
   * @param {Object} source - Source object.
   * @returns {Object} The merged object.
   */
  deepMerge(target, source) {
    for (const key in source) {
      if (Object.hasOwnProperty.call(source, key)) {
        const isTargetObject = typeof target[key] === 'object' && target[key] !== null
        const isSourceObject = typeof source[key] === 'object' && source[key] !== null
        
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