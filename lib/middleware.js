import socketServer from './server/socket.io/index.js'
import Onebot from './chat/onebot/index.js'
import config from './config.js'
import { singleTools } from './plugin.js'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

export default class  {
  constructor() {
    this.onebot = null
    this.llm = null
    this.plugins = []
    this.socketServer = socketServer
    this.tools = new Map()

    this.initSocketServer()
  }

  async loadLLMAdapters() {
    this.llm = (await import('./chat/llm/index.js')).default

    const avaliableAdapterList = config.getLLMEnabled()

    for (const adapter of avaliableAdapterList) {
      const { name, config } = adapter
      await this.llm.initServer(name, config, (error)=>{
        if (error) {
          logger.error(`[${name}] 加载失败:`, error) 
        } else {
          logger.info(`[${name}] 加载成功`)
          adapter.setAvaliable()
        }
      })
    }

    await this.loadPlugins()
  }

  initSocketServer() {

    this.socketServer.setClientMessageHandler('onebot', (e) => {
      this.toOnebotServer(e)
    })

    this.socketServer.setClientMessageHandler('llm', (e) => {
      this.llm.handleMessage(e)
    })
  }

  startOnebot(config) {
    this.onebot = new Onebot(config)

    // 收到OneBot服务端上线消息
    this.onebot.on('connected', () => {
      logger.info('OneBot 协议连接成功！')
    })
  
    // 收到OneBot服务端事件
    this.onebot.on('event', (e) => {
      // 把事件转发到WebSocket服务端
      this.socketServer.publicOnebotMessage(e)
    })
  }

  // 向OneBot服务端发送消息
  toOnebotServer(e) {
    if(!this.onebot.isAvaliable()) {
      logger.warn('OneBot服务端未连接,无法发送消息')
      return
    }
    try {
      const { data, sender, message_id: messageId } = e
      switch (e.type) {
        case 'message': {
          const warpedMessage = this.onebot.getWrappedMessage(
            data,
            sender,
            messageId
          )
          logger.mark('收到客户端消息,开始转发')
          // logger.json(warpedMessage)
          this.onebot.sendMessage(warpedMessage)

          break
        }
        default:
          logger.warn('收到未知消息类型')
      }
    } catch (e) {
      console.error('处理客户端消息失败', e)
    }
  }

  // 加载插件系统
  async loadPlugins() {
    logger.info('正在加载插件...')

    const internalPluginsBasePath = path.join(process.cwd(), 'lib', 'plugins')
    const externalPluginsBasePath = path.join(process.cwd(), 'plugins')

    const pluginPaths = [internalPluginsBasePath, externalPluginsBasePath]

    const loadPlugins = async (basePath) => {
      let pluginsCount = 0
      let toolsCount = 0
      const folders = fs.readdirSync(basePath)

      for (const folder of folders) {
        let plugin
        let pluginPath

        if (folder === 'custom') {
          plugin = new singleTools()
          pluginPath = 'custom plugin' // For logging purposes
        } else {
          pluginPath = path.join(basePath, folder, 'index.js')
          const pluginUrl = pathToFileURL(pluginPath).toString()
          try {
            const pluginModule = await import(pluginUrl)
            plugin = new pluginModule.default()
          } catch (e) {
            logger.error(`插件加载失败: ${pluginPath}`, e)
            continue // Skip to the next folder if import fails
          }
        }

        try {
          const pluginToolsCount = await this.loadPlugin(plugin)
          pluginsCount++ // Increment even for custom plugins
          toolsCount += pluginToolsCount

          if (folder === 'custom') {
            logger.info(`自定义插件加载完成，共加载了${pluginToolsCount}个工具`)
          }
        } catch (e) {
          logger.error(`插件加载失败: ${pluginPath}`, e)
        }
      }

      const pluginType = basePath === internalPluginsBasePath ? '内部' : '外部'
      logger.info(
        `${pluginType}插件加载完成，加载了${pluginsCount}个插件,共加载了${toolsCount}个工具`
      )

      this.llm.setTools(this.tools)
    }

    for (const basePath of pluginPaths) {
      await loadPlugins(basePath)
    }
  }

  async loadPlugin(plugin, isReload = false) {
    const { name } = plugin.getMetaData()

    // logger.info('--------- >_< ---------')
    // logger.info(name + (isReload ? ' 重载...' : ' 初始化...'))
    // logger.info('-----------------------')
    isReload && logger.mark(name + '重载...')

    await plugin.initialize()

    this.plugins.push(plugin)

    // 从插件中的 tools Map 中获取所有工具
    const tools = plugin.tools
    for (const [toolName, toolInstance] of tools) {
      this.tools.set(toolName, toolInstance)
    }

    // logger.mark(name + ' 加载成功~ by ' + `${author ? author : 'Krumio'}`)
    // logger.mark(
    //   '欢迎使用' + name + '当前版本号 V' + `${version ? version : '0.0.1'}`
    // )

    plugin.onReload(() => {
      this.loadPlugin(plugin, true)
    })

    return tools.size
  }


  getPluginbyToolName(name) {
    for (const plugin of this.plugins) {
      if (plugin.tools.has(name)) {
        return plugin
      }
    }
  }

  enableSocketServer(httpServer) {
    this.socketServer.initialize(httpServer)
  }
}
