import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const configPath = path.join(__dirname, 'config.json')
const defaultConfigPath = path.join(__dirname, 'default','config.json')

// 先检查config文件是否存在
if (!fs.existsSync(configPath)) {
  // 如果不存在，则复制默认配置文件到当前目录
  fs.copyFileSync(defaultConfigPath, configPath)
}

const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

// if(configData.apiKey === '')
//   logger.warn('未配置高德apiKey，amap插件功能将不可用，请前往 "https://console.amap.com/dev/key/app" 获取后填入' + configPath + '中的apiKey字段')

export default configData