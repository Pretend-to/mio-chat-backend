// import MioFunction from '../../lib/functions.js'
import fs from 'node:fs'

logger.info('--------- >_< ---------')
logger.info('web-plugin初始化v1.0')
logger.info('-----------------------')

const files = fs
  .readdirSync('./plugins/web-plugin/apps')
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

logger.mark('web-plugin加载成功~ by Krumio')
logger.mark('欢迎使用web-plugin 当前版本号v1.0')

export {apps} 

