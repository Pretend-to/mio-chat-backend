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
    this.onebot_plugin_path = path.resolve(
      __dirname,
      '../config/plugins/onebotConfig.yaml',
    )
    this.openai_plugin_path = path.resolve(
      __dirname,
      '../config/plugins/openaiConfig.yaml',
    )
    this.example_path = path.resolve(
      __dirname,
      '../config/config/config.example.yaml',
    )
    this.onebot = {}
    this.openai = {}
  }

  checkConfigexists(filePath) {
    // 检查文件是否存在
    try {
      fs.accessSync(filePath, fs.constants.F_OK)
      return true
    } catch (err) {
      return false
    }
  }

  initConfig() {
    // 先检查配置文件是否存在，如果配置文件不存在，则创建一个配置文件
    if (!fs.existsSync(this.config_path)) {
      const exampleContent = fs.readFileSync(this.example_path, 'utf8')
      fs.writeFileSync(this.config_path, exampleContent, 'utf8')
      logger.info(
        '配置文件不存在，已在路径:' +
          'config/config/config.yaml' +
          '创建配置文件，请完善后重启服务',
      )
      // eslint-disable-next-line no-undef
      process.exit(0)
    } else {
      logger.info('配置文件加载成功!')
      const userConfig = this.loadConfig()
      // 把 userConfig 的所有属性传递给 this
      Object.assign(this, userConfig)
      this.onebot.plugins = this.loadPluginConfig(this.onebot_plugin_path)
      this.openai.plugins = this.loadPluginConfig(this.openai_plugin_path)
    }
  }

  loadPluginConfig(filePath) {
    if (!this.checkConfigexists(filePath)) {
      logger.info(
        '配置文件不存在,请完善后重启服务',
      )
    } else {
      const pluginConfig = this.loadConfig(filePath == this.onebot_plugin_path? 'onebot' : 'openai')
      return pluginConfig
    }
  }

  loadConfig(type = 'default') {
    if(type == 'default'){
      const fileContent = fs.readFileSync(this.config_path, 'utf8')
      return yaml.load(fileContent)
    }else if (type == 'onebot'){
      const fileContent = fs.readFileSync(this.onebot_plugin_path, 'utf8')
      return yaml.load(fileContent)
    }else if (type == 'openai'){
      const fileContent = fs.readFileSync(this.openai_plugin_path, 'utf8')
      return yaml.load(fileContent)
    }
  }

  updateConfig(key, value) {
    this.config[key] = value
    const yamlString = yaml.stringify(this.config)
    fs.writeFileSync(this.config_path, yamlString, 'utf8')

    // 更新对象内部的配置
    this.config = this.loadConfig()
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
