/* eslint-disable camelcase */
/* eslint-disable no-undef */
import logger from './logger.js'
import wsServer from './server/websocket.js'
import Onebot from './chat/onebot.js'
import openai from './chat/openai.js'
import fs from 'fs'

export default class Middleware {
  constructor() {
    this.onebot = null
    this.openai = null
    this.plugins = []
    this.wsServer = new wsServer()
    this.singlePlugins = []
    this.apps = {}

    // TODO: support openai api
    // this.onenai = null;

    this.initWsServer()
  }

  initOnebot() {
    // 收到OneBot服务端上线消息
    this.onebot.on('online', () => {
      logger.info('OneBot 协议连接成功！')
    })

    // 收到OneBot服务端事件
    this.onebot.on('event', async (e) => {
      // 把事件转发到WebSocket服务端
      this.wsServer.sendOnebot(e)
    })
  }

  initWsServer() {
    // 收到客户端消息
    this.wsServer.on('onebot_message', (e) => {
      this.toOnebotServer(e)
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
        },
        pending() {
          logger.debug('openaiMessage pending')
          e.server.sendOpenaiMessage('pending', {}, this.request_id)
        },
        update(index, chunk) {
          // logger.debug('openaiMessage update')
          e.server.sendOpenaiMessage(
            'update',
            { index, chunk },
            this.request_id
          )
        },
        complete() {
          logger.debug('openaiMessage complete')
          e.server.sendOpenaiMessage('completed', {}, this.request_id)
        },
        error(error) {
          logger.error(error)
          e.server.sendOpenaiMessage('failed', { error }, this.request_id)
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
    this.toolsPrompt = 'As a helpful assistant,you are supposed to use these tools below to help user:\n'

    const floders = fs.readdirSync('./plugins')
    for (const folder of floders) {
      if (folder == 'example') continue
      logger.info('正在加载插件' + folder)
      const plugin = {
        name: folder,
        apps: (await import('../plugins/' + folder + '/index.js')).apps,
      }
      this.plugins.push(plugin)
    }
    logger.info(`插件加载完成，加载了${this.plugins.length}个插件`)
    logger.debug(this.plugins)
    this.apps = {}
    for (const plugin of this.plugins) {
      for (const app of Object.keys(plugin.apps)) {
        this.apps[app] = plugin.apps[app]
        this.toolsPrompt += `${app}:${plugin.apps[app].description}\n`
      }
    }

    const singlePlugins = fs
      .readdirSync('./plugins/example')
      .filter((file) => file.endsWith('.js'))

    let ret = []

    singlePlugins.forEach((file) => {
      ret.push(import(`../plugins/example/${file}`))
    })

    ret = await Promise.allSettled(ret)

    for (let i in singlePlugins) {
      let name = singlePlugins[i].replace('.js', '')

      if (ret[i].status != 'fulfilled') {
        logger.error(`载入插件错误：${logger.warn(name)}`)
        logger.error(ret[i].reason)
        continue
      }

      this.apps[name] = new (ret[i].value[Object.keys(ret[i].value)[0]])()
      this.singlePlugins.push(this.apps[name])
      this.toolsPrompt += `${name}:${this.apps[name].description}\n`

    }

    this.toolsPrompt += 'Always remember to use the tools to get the answer.'

    logger.debug(this.toolsPrompt)

  }

  getOpenaiTools(avaliablePlugins) {
    const tools = []

    for (const plgunName of avaliablePlugins) {
      const plugin = this.plugins.find((plugin) => plugin.name == plgunName)
      if (!plugin) continue
      for (const app of Object.keys(plugin.apps)) {
        tools.push(plugin.apps[app].json())
      }
    }

    for (const app of this.singlePlugins) {
      tools.push(app.json())
    }

    // logger.debug(JSON.stringify(tools))
    return tools
  }

  async runTool(tool_call) {
    try {
      const app = this.apps[tool_call.name]
      if (!app) {
        logger.warn('未找到插件' + tool_call.name)
        return
      }
      
      const e = {
        user: tool_call.user,
        params: JSON.parse(tool_call.arguments)
      }
  
      // 创建一个超时的Promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('执行超时，超过20秒')), 20000)
      )
  
      // 使用Promise.race来限制执行时间
      const result = await Promise.race([app.run(e), timeoutPromise])
      logger.debug(result)
      return result
      
    } catch (error) {
      logger.error(error) // 记录错误信息
      return { error: error.message } // 返回错误信息
    }
  }
}
