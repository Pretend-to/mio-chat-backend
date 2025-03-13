/* eslint-disable camelcase */
/* eslint-disable no-undef */
import wsServer from './server/websocket.js'
import Onebot from './chat/onebot.js'
import config from './config.js'
import { singleTools } from './plugin.js'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

export default class Middleware {
  constructor() {
    this.onebot = null
    this.llm = null
    this.plugins = []
    this.wsServer = new wsServer()
    this.tools = new Map()

    this.initWsServer()
  }

  loadAdapters() {
    const openaiAvalible = config.openai.enable === true
    const geminiAvalible = config.gemini.enable === true
    const onebotAvalible = config.onebot.enable === true

    if (openaiAvalible) {
      const openaiConfig = config.openai
      this.llm.initServer('openai',openaiConfig)
    } 
    if (geminiAvalible) {
      const geminiConfig = config.gemini
      this.llm.initServer('gemini',geminiConfig)
    }

    if (onebotAvalible) {
      const onebotConfig = config.onebot
      this.onebot = new Onebot(onebotConfig) 
    }

    if (openaiAvalible || geminiAvalible) {
      this.loadPlugins()
    }
  }

  initOnebot() {
    // 收到OneBot服务端上线消息
    this.onebot.on('online', () => {
      logger.info('OneBot 协议连接成功！')
    })

    // 收到OneBot服务端事件
    this.onebot.on('event', (e) => {
      // 把事件转发到WebSocket服务端
      this.wsServer.publicOnebotMessage(e)
    })
  }

  initWsServer() {

    this.wsServer.setClientMessageHandler('onebot', (e) => {
      this.toOnebotServer(e)
    })

    this.wsServer.setClientMessageHandler('openai', (e) => {
      this.llm.handleMessage(e)
    })
  }

  startOnebot(config) {
    this.onebot = new Onebot(config)

    this.initOnebot()
  }

  // 向OneBot服务端发送消息
  toOnebotServer(e) {
    if(!this.onebot.avaliable) {
      logger.warn('OneBot服务端未连接,无法发送消息')
      return
    }
    try {
      logger.debug('收到客户端' + e.id + '的消息,尝试发送到OneBot服务端')
      logger.debug(e)
      const data = e.data
      logger.debug(data)
      const sender = data.sender
      sender.id = data.id
      switch (data.type) {
        case 'message': {
          logger.debug('收到私聊消息')
          const warpedMessage = this.onebot.messageWarrper(
            data.data,
            sender,
            data.message_id
          )
          logger.debug(warpedMessage)
          this.onebot.sendObject(warpedMessage)

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
    }

    pluginPaths.forEach(async (basePath) => {
      await loadPlugins(basePath)
    })
  }

  async loadPlugin(plugin, isReload = false) {
    const { name, version, author } = plugin.getMetaData()

    logger.info('--------- >_< ---------')
    logger.info(name + (isReload ? ' 重载...' : ' 初始化...'))
    logger.info('-----------------------')

    await plugin.initialize()

    this.plugins.push(plugin)

    // 从插件中的 tools Map 中获取所有工具
    const tools = plugin.tools
    for (const [toolName, toolInstance] of tools) {
      this.tools.set(toolName, toolInstance)
    }

    logger.mark(name + ' 加载成功~ by ' + `${author ? author : 'Krumio'}`)
    logger.mark(
      '欢迎使用' + name + '当前版本号 V' + `${version ? version : '0.0.1'}`
    )

    plugin.onReload(() => {
      this.loadPlugin(plugin, true)
    })

    return tools.size
  }

  getOpenaiTools(avaliableApps) {
    const tools = []

    for (const name of this.tools.keys()) {
      if (avaliableApps.includes(name)) {
        const tool = this.tools.get(name)
        tools.push(tool.json())
      }
    }

    return tools
  }

  async runTool(tool_call, user) {
    try {
      const app = this.tools.get(tool_call.name)
      if (!app) {
        logger.warn('未找到插件' + tool_call.name)
        throw new Error('未找到插件' + tool_call.name)
      }

      const params = tool_call.arguments ? tool_call.arguments : '{}'

      const e = {
        user,
        params: JSON.parse(params),
      }

      // 创建一个超时的Promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('执行超时，超过60秒')), 60000)
      )

      // 使用Promise.race来限制执行时间
      const result = await Promise.race([app.run(e), timeoutPromise])
      // logger.debug(result)
      return {
        error: null,
        result: result,
      }
    } catch (error) {
      logger.error(error) // 记录错误信息
      return { error } // 返回错误信息
    }
  }

  getPluginbyToolName(name) {
    for (const plugin of this.plugins) {
      if (plugin.tools.has(name)) {
        return plugin
      }
    }
  }
}
