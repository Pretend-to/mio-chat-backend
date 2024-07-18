// import MioFunction from '../../lib/functions.js'
/* global logger */
import fs from 'node:fs'

logger.info('--------- >_< ---------')
logger.info('amap-plugin初始化v1.0')
logger.info('-----------------------')

const files = fs
  .readdirSync('./plugins/amap-plugin/apps')
  .filter((file) => file.endsWith('.js'))

let ret = []

files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status != 'fulfilled') {
    logger.error(`载入插件错误：${logger.warn(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = new (ret[i].value[Object.keys(ret[i].value)[0]])()
}

logger.mark('amap-plugin加载成功~ by Krumio')
logger.mark('欢迎使用amap-plugin 当前版本号v1.0')
logger.mark('API支持：高德地图')

export {apps} 

