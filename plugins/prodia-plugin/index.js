import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import fs from 'node:fs/promises'

const pluginInfo = {
  name: new URL(import.meta.url).pathname.split('/').pop(),
  description: '帮AI调用Prodia的插件',
  version: '0.0.2',
  author: 'Krumio',
  config: {
    token:'',
    apiKey:''
  },
}

const initPlugin = async () => {
  // 必要时在这里添加代码以初始化插件
  // 获取当前模块的路径
  const currentModuleUrl = import.meta.url
  const currentModulePath = fileURLToPath(currentModuleUrl)
  
  // 获取上级目录
  const parentDir = dirname(currentModulePath)
  const configFilePath = `${parentDir}/config/config.json` // 构建 config.json 的路径

  try {
    // 检查 config.json 是否存在
    await fs.access(configFilePath)
    logger.info('prodia-plugin 配置文件存在，检查配置完整性...')
    const config = JSON.parse(await fs.readFile(configFilePath, 'utf-8'))
    if (!config.token || config.token === 'your_token_here') {
      logger.warn('配置文件缺少 token 字段，请前往 https://app.prodia.com/api 获取 token 并填入配置文件')
      return
    }
    if (!config.apiKey || config.apiKey === 'your_apiKey_here') {
      logger.warn('配置文件缺少 apiKey 字段，将无法使用 sd 1.5 模型')
    }
    logger.info('prodia-plugin 配置完整，初始化成功')
    pluginInfo.config = config
  } catch (error) {
    logger.warn('prodia-plugin 配置文件不存在，将创建默认配置文件...')
    const defaultConfig = {
      token: 'your_token_here',
      apiKey: 'your_apiKey_here'
    }
    await fs.writeFile(configFilePath, JSON.stringify(defaultConfig, null, 2))
    logger.warn('配置文件缺少 token 字段，请前往 https://app.prodia.com/api 获取 token 并填入配置文件')
  }
}

export  {
  pluginInfo,
  initPlugin
}

