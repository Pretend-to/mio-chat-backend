/* eslint-disable camelcase */
import fs from 'fs'
import yaml from 'js-yaml'
import { fileURLToPath } from 'url'
import path from 'path'

class Config {
  constructor() {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    this.config_path = path.resolve(__dirname, '../config/config/config.yaml')
    this.onebot_plugin_path = path.resolve(__dirname, '../config/plugins/onebotConfig.yaml')
    this.openai_tools_path = path.resolve(__dirname, '../config/plugins/openaiConfig.yaml')
    this.openai_owners_path = path.resolve(__dirname, '../config/config/owners.yaml')
    this.openai_presets_dir = path.resolve(__dirname, '../config/presets/')
    this.example_path = path.resolve(__dirname, '../config/config/config.example.yaml')
    this.onebot = {}
    this.openai = {}
  }

  /**
   * 检查文件是否存在.
   * @param {string} filePath 文件路径.
   * @returns {boolean} 文件是否存在.
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
   * 初始化配置.
   */
  initConfig() {
    if (!this.checkConfigExists(this.config_path)) {
      // 配置文件不存在，创建配置文件
      this.createConfigFile()
    } else {
      // 配置文件已存在，加载并合并配置
      this.loadAndMergeConfig()
    }
  }

  /**
   * 创建配置文件.
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
   * 加载并合并配置.
   */
  loadAndMergeConfig() {
    logger.info('配置文件加载成功!')

    const userConfig = this.loadConfig('default')
    const exampleConfig = this.loadYamlFile(this.example_path)

    // 合并配置：将示例配置中新增的配置项合并到用户配置中
    const mergedConfig = this.deepMerge(userConfig, exampleConfig)

    // 将合并后的配置写入到本地配置文件
    this.writeYamlFile(this.config_path, mergedConfig)

    // 重新加载配置
    const finalConfig = this.loadConfig('default')
    Object.assign(this, finalConfig)

    this.onebot.plugins = this.loadPluginConfig(this.onebot_plugin_path)
    this.openai.owners = this.loadConfig('owners')
    this.loadOpenaiPresets()

    // 如果开启了debug模式，打印
    if (this.debug) {
      logger.warn('调试模式已开启!')
      global.debug = true
    }
  }

  /**
   * 加载插件配置.
   * @param {string} filePath 配置文件路径.
   * @returns 插件配置.
   */
  loadPluginConfig(filePath) {
    if (!this.checkConfigExists(filePath)) {
      logger.info('插件配置文件不存在,请完善后重启服务')
      return null // 或者返回一个默认的空配置
    } else {
      const type = filePath === this.onebot_plugin_path ? 'onebot' : 'openai'
      return this.loadConfig(type)
    }
  }

  /**
   * 加载OpenAI预设.
   */
  loadOpenaiPresets() {
    logger.info('正在加载OpenAI预设...')
    const files = fs.readdirSync(this.openai_presets_dir)
    const presets = []
    const recommended = []
    const hiddenPresets = []

    files.forEach((file) => {
      const filePath = path.resolve(this.openai_presets_dir, file)
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8')
        const content = JSON.parse(fileContent)

        if (content.hidden) {
          hiddenPresets.push(content)
        } else if (content.recommended) {
          recommended.push(content)
        } else {
          presets.push(content)
        }
      } catch (e) {
        logger.error(`加载OpenAI预设 ${file} 失败: ${e.message}`)
      }
    })

    logger.mark(`加载了 ${presets.length} 个 OpenAI 预设`)
    this.openai.commenPresets = presets
    this.openai.recommendedPresets = recommended
    this.openai.hiddenPresets = hiddenPresets
  }

  /**
   * 加载配置文件.
   * @param {string} type 配置类型 (default, onebot, openai).
   * @returns 配置内容.
   */
  loadConfig(type) {
    let filePath
    switch (type) {
      case 'default':
        filePath = this.config_path
        break
      case 'onebot':
        filePath = this.onebot_plugin_path
        break
      case 'openai':
        filePath = this.openai_tools_path
        break
      case 'owners':
        filePath = this.openai_owners_path
        break
      default:
        throw new Error('无效的配置类型')
    }

    return this.loadYamlFile(filePath)
  }

  /**
   * 更新配置.
   * @param {string} key 配置项 key.
   * @param {any} value 配置项 value.
   */
  updateConfig(key, value) {
    this.config[key] = value
    this.writeYamlFile(this.config_path, this.config)
    // 更新对象内部的配置
    this.config = this.loadConfig('default')
  }

  /**
   * 深合并两个对象，后面的对象会覆盖前面的对象，但会保留未冲突的属性.
   * @param {object} target 目标对象.
   * @param {object} source 源对象.
   * @returns 合并后的对象.
   */
  deepMerge(target, source) {
    for (const key in source) {
      // 使用 Object.hasOwnProperty.call 检查属性是否存在
      if (Object.hasOwnProperty.call(source, key)) {
        if (typeof target[key] === 'object' && typeof source[key] === 'object' && target[key] !== null && source[key] !== null) {
          // 如果 key 在 target 和 source 中都是对象，递归合并
          target[key] = this.deepMerge(target[key], source[key])
        } else if (!(key in target)) {
          // 如果 key 不存在于 target 中，则从 source 复制
          target[key] = source[key]
        }
      }
    }
    return target
  }

  /**
   * 读取 YAML 文件.
   * @param {string} filePath 文件路径.
   * @returns YAML 文件内容.
   */
  loadYamlFile(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8')
      return yaml.load(fileContent)
    } catch (e) {
      logger.error(`加载 YAML 文件 ${filePath} 失败: ${e.message}`)
      return {} // 加载失败返回一个空对象，避免程序崩溃
    }
  }

  /**
   * 写入 YAML 文件.
   * @param {string} filePath 文件路径.
   * @param {any} data 要写入的数据.
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

logger.info('正在初始化配置...')


const config = new Config()
config.initConfig()


if (config.debug) {
  logger.warn('调试模式已开启!')
  // eslint-disable-next-line no-undef
  global.debug = true
}


export default config