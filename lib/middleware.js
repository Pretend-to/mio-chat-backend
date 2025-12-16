import socketServer from './server/socket.io/index.js'
import Onebot from './chat/onebot/index.js'
import config from './config.js'
import { singleTools } from './plugin.js'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

export default class {
  constructor() {
    this.onebot = null
    this.llm = null
    this.plugins = []
    this.socketServer = socketServer

    this.initSocketServer()
  }

  async loadLLMAdapters() {
    this.llm = (await import('./chat/llm/index.js')).default

    const availableInstanceList = await config.getLLMEnabled()

    for (const instance of availableInstanceList) {
      const { instanceId, adapterType, displayName, config: instanceConfig } = instance
      
      await this.llm.initServer(
        instanceId,
        adapterType,
        displayName,
        instanceConfig,
        (error) => {
          if (error) {
            logger.error(`[${displayName}] 加载失败:`, error)
          } else {
            logger.info(`[${displayName}] 加载成功`)
            instance.setAvailable()
          }
        },
      )
    }

    await this.loadPlugins()
  }

  /**
   * 热重载LLM适配器（不重启服务）
   * @returns {Promise<{providers: string[], models: object}>} 返回更新后的提供商列表和模型列表
   */
  async reloadLLMAdapters() {
    logger.info('开始热重载LLM适配器...')
    
    // 重新读取配置文件
    await config.reload()
    
    // 清空现有适配器
    if (this.llm) {
      this.llm.clearAll()
    } else {
      this.llm = (await import('./chat/llm/index.js')).default
    }
    
    const availableInstanceList = await config.getLLMEnabled()
    const loadResults = []

    for (const instance of availableInstanceList) {
      const { instanceId, adapterType, displayName, config: instanceConfig } = instance
      
      const loadPromise = new Promise((resolve) => {
        this.llm.initServer(
          instanceId,
          adapterType,
          displayName,
          instanceConfig,
          (error) => {
            if (error) {
              logger.error(`[${displayName}] 热重载失败:`, error)
              resolve({ success: false, displayName, error: error.message })
            } else {
              logger.info(`[${displayName}] 热重载成功`)
              instance.setAvailable()
              resolve({ success: true, displayName })
            }
          },
        )
      })
      
      loadResults.push(await loadPromise)
    }

    const providers = config.getProvidersAvailable()
    const models = this.llm.getModelList(true) // 获取所有模型（管理员视图）

    // 向所有客户端推送模型更新（根据权限筛选）
    if (this.socketServer && this.socketServer.io) {
      const sockets = await this.socketServer.io.fetchSockets()
      const default_model = config.getDefaultModel()

      for (const socket of sockets) {
        const isAdmin = socket.userInfo?.isAdmin || false

        // 使用 LLM 服务的 getModelList 方法获取根据权限筛选的模型列表
        const filteredModels = this.llm?.getModelList(isAdmin) || {}

        // 根据可用模型过滤提供商
        const filteredProviders = providers.filter(provider => {
          const instanceId = provider.displayName
          const models = filteredModels[instanceId]
          return models && models.length > 0
        })

        const updateMessage = {
          protocol: 'system',
          type: 'models_updated',
          data: {
            providers: filteredProviders,
            models: filteredModels,
            default_model,
            timestamp: new Date().toISOString()
          }
        }

        socket.emit('message', JSON.stringify(updateMessage))
      }

      logger.info('[热重载] 已向所有客户端推送模型更新（根据权限筛选）')
    }

    logger.info(`LLM适配器热重载完成: ${loadResults.filter(r => r.success).length}/${loadResults.length} 成功`)

    return { providers, models, loadResults }
  }

  initSocketServer() {
    this.socketServer.setClientMessageHandler('onebot', (e) => {
      this.toOnebotServer(e)
    })

    this.socketServer.setClientMessageHandler('llm', (e) => {
      if (this.llm) {
        this.llm.handleMessage(e)
      } else {
        logger.warn('未启用 LLM 适配器，无法处理消息')
      }
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
    if (!this.onebot || !this.onebot.isAvaliable()) {
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
            messageId,
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
        `${pluginType}插件加载完成，加载了${pluginsCount}个插件,共加载了${toolsCount}个工具`,
      )
    }

    for (const basePath of pluginPaths) {
      await loadPlugins(basePath)
    }

    if (this.llm) {
      this.llm.setPlugins(this.plugins)
    }
  }

  async loadPlugin(plugin) {
    await plugin.initialize()

    this.plugins.push(plugin)
    let size = 0
    const toolsMap = plugin.getTools()
    for (const tools of toolsMap.values()) {
      const toolsArray = Array.from(tools) // 转为数组
      size += toolsArray.length // 累加工具数量
    }
    return size
  }

  /**
   * 热重载所有插件（不重启服务）
   * @returns {Promise<{plugins: Array, total: number, loadResults: Array}>}
   */
  async reloadAllPlugins() {
    logger.info('开始热重载所有插件...')
    
    const results = []
    
    for (const plugin of this.plugins) {
      try {
        // 重新加载工具
        await plugin.loadTools()
        
        // 如果插件有自定义初始化逻辑，调用它
        if (typeof plugin.initialize === 'function') {
          await plugin.initialize()
        }
        
        const toolsMap = plugin.getTools()
        let toolCount = 0
        for (const tools of toolsMap.values()) {
          toolCount += Array.from(tools).length
        }
        
        results.push({
          name: plugin.name,
          success: true,
          toolCount,
        })
        
        logger.info(`[${plugin.name}] 热重载成功，加载了 ${toolCount} 个工具`)
      } catch (error) {
        results.push({
          name: plugin.name,
          success: false,
          error: error.message,
        })
        logger.error(`[${plugin.name}] 热重载失败:`, error)
      }
    }
    
    // 更新 LLM 适配器的插件引用
    if (this.llm) {
      this.llm.setPlugins(this.plugins)
    }
    
    const successCount = results.filter(r => r.success).length
    logger.info(`插件热重载完成: ${successCount}/${results.length} 成功`)
    
    return {
      plugins: this.plugins.map(p => p.name),
      total: this.plugins.length,
      loadResults: results,
    }
  }

  /**
   * 热重载单个插件
   * @param {string} pluginName - 插件名称
   * @returns {Promise<{success: boolean, toolCount?: number, error?: string}>}
   */
  async reloadPlugin(pluginName) {
    logger.info(`开始热重载插件: ${pluginName}`)
    
    const plugin = this.plugins.find(p => p.name === pluginName)
    
    if (!plugin) {
      throw new Error(`插件 ${pluginName} 不存在`)
    }
    
    try {
      // 重新加载工具
      await plugin.loadTools()
      
      // 如果插件有自定义初始化逻辑，调用它
      if (typeof plugin.initialize === 'function') {
        await plugin.initialize()
      }
      
      const toolsMap = plugin.getTools()
      let toolCount = 0
      for (const tools of toolsMap.values()) {
        toolCount += Array.from(tools).length
      }
      
      // 更新 LLM 适配器的插件引用
      if (this.llm) {
        this.llm.setPlugins(this.plugins)
      }
      
      logger.info(`[${pluginName}] 热重载成功，加载了 ${toolCount} 个工具`)
      
      return {
        success: true,
        toolCount,
      }
    } catch (error) {
      logger.error(`[${pluginName}] 热重载失败:`, error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * 重新加载预设
   * @returns {Promise<void>}
   */
  async reloadPresets() {
    try {
      logger.info('重新加载预设...')
      await config.reloadPresets()

      // 通知所有连接的客户端预设已更新
      if (this.socketServer && this.socketServer.io) {
        const sockets = await this.socketServer.io.fetchSockets()
        for (const socket of sockets) {
          socket.emit('message', JSON.stringify({
            protocol: 'system',
            type: 'presets_updated',
            data: {
              timestamp: new Date().toISOString()
            }
          }))
        }
      }

      logger.info('预设重新加载完成')
    } catch (error) {
      logger.error('重新加载预设失败:', error)
      throw error
    }
  }

  enableSocketServer(httpServer) {
    this.socketServer.initialize(httpServer)
  }
}
