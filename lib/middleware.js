/* eslint-disable camelcase */
/* eslint-disable no-undef */
import wsServer from './server/websocket.js'
import Onebot from './chat/onebot.js'
import openai from './chat/openai.js'
import { singleTools } from './plugin.js'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

export default class Middleware {
  constructor() {
    this.onebot = null
    this.openai = null
    this.plugins = []
    this.wsServer = new wsServer()
    this.tools = new Map()

    this.initWsServer()
  }

  initOnebot() {
    // 收到OneBot服务端上线消息
    this.onebot.on('online', () => {
      logger.info('OneBot 协议连接成功！')
    })

    // 收到OneBot服务端事件
    this.onebot.on('event', (e) => {
      // 把事件转发到WebSocket服务端
      this.wsServer.sendOnebot(e)
    })
  }

  initWsServer() {
    // 收到客户端消息
    this.wsServer.on('onebot_message', (e) => {
      if (this.onebot !== null) this.toOnebotServer(e)
    })

    // 收到客户端OpenAI消息
    this.wsServer.on('openai_message', async (e) => {
      logger.debug(e.data)
      const event = {
        body: e.data.data,
        request_id: e.data.request_id,
        user: {
          id: e.server.id,
          isAdmin: e.server.isAdmin,
          ip: e.server.ip,
          origin: e.server.origin,
        },
        server: e.server,
        pending() {
          logger.debug('openaiMessage pending')
          e.server.sendOpenaiMessage('pending', {}, this.request_id)
        },
        update(chunk, tool_call, reasoning_content) {
          // logger.debug('openaiMessage update')
          e.server.sendOpenaiMessage(
            'update',
            { chunk, tool_call, reasoning_content },
            this.request_id
          )
        },
        complete() {
          logger.debug('openaiMessage complete')
          e.server.sendOpenaiMessage('completed', {}, this.request_id)
        },
        reply(chunk, tool_call) {
          e.server.sendOpenaiMessage(
            'reply',
            { chunk, tool_call },
            this.request_id
          )
        },
        error(error) {
          logger.error(error)
          e.server.sendOpenaiMessage(
            'failed',
            { error: error instanceof Error ? error.stack : error },
            this.request_id
          )
        },
      }
      await openai.chat(event)
    })
  }

  startOnebot(config) {
    this.onebot = new Onebot(config)

    this.initOnebot()
  }

  async startOpenai() {
    logger.info('正在加载OpenAI模型...')
    try {
      const result = await openai.initModels()

      logger.info(
        'OpenAI模型加载成功,共加载了来自' +
          result.ownerCount +
          '个厂商的' +
          result.modelsCount +
          '个模型'
      )
      logger.info(
        '其中游客可用的模型有来自' +
          result.guestOwnerCount +
          '个厂商的' +
          result.guestModelsCount +
          '个模型'
      )

      this.openai = openai
    } catch (e) {
      logger.error(e)
    }
  }

  // 向OneBot服务端发送消息
  toOnebotServer(e) {
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

    // logger.debug(JSON.stringify(tools))
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
      return { error: error } // 返回错误信息
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
