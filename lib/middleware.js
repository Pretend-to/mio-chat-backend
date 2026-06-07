import socketServer from './server/socket.io/index.js'
import Onebot from './chat/onebot/index.js'
import config from './config.js'
import { singleTools } from './plugin.js'
import chokidar from 'chokidar'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import hookManager from './hooks/index.js'
import { HOOK_POINTS } from './hooks/types.js'
import skillService from './chat/llm/services/SkillService.js'

export default class {
  constructor() {
    this.onebot = null
    this.llm = null
    this.plugins = []
    this._pluginWatchers = []
    this.socketServer = socketServer

    this.initSocketServer()
  }

  async loadLLMAdapters() {
    this.llm = (await import('./chat/llm/index.js')).default

    config.clearAvailableInstances()
    const availableInstanceList = await config.getLLMEnabled()

    if (availableInstanceList.length === 0) {
      logger.info('当前没有配置任何 LLM 适配器实例，LLM 模块已初始化，可通过管理界面动态添加')
    } else {
      // 并行初始化所有 LLM 适配器，单个失败不影响其他
      const results = await Promise.allSettled(
        availableInstanceList.map(instance => {
          const { instanceId, adapterType, displayName, config: instanceConfig } = instance
          return new Promise(resolve => {
            this.llm.initServer(
              instanceId,
              adapterType,
              displayName,
              instanceConfig,
              (error) => {
                if (error) {
                  resolve({ success: false, displayName, error })
                } else {
                  logger.debug(`[${displayName}] 加载成功`)
                  instance.setAvailable()
                  resolve({ success: true, displayName })
                }
              },
            )
          })
        })
      )

      const loadedList = results.map(r => r.value).filter(Boolean)
      const successNames = loadedList.filter(r => r.success).map(r => r.displayName)
      const failList = loadedList.filter(r => !r.success)

      if (successNames.length > 0) {
        logger.info(`LLM 适配器加载成功: ${successNames.join(', ')}`)
      }
      if (failList.length > 0) {
        for (const fail of failList) {
          logger.error(`[${fail.displayName}] 加载失败:`, fail.error)
        }
      }
    }

    await skillService.initialize()
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
    config.clearAvailableInstances()
    const { clearCache } = await import('./chat/llm/adapters/registry.js')
    clearCache()
    await skillService.initialize()
    
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
              logger.debug(`[${displayName}] 热重载失败:`, error)
              resolve({ success: false, displayName, error: error.message })
            } else {
              logger.debug(`[${displayName}] 热重载成功`)
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

    const { default: sessions } = await import('./server/socket.io/services/sessions.js')
    const clients = sessions.getAllClients()
    const default_model = await config.getDefaultModel()

    // 动态获取各适配器的元数据以注入描述，防止前端硬编码
    let metadataMap = {}
    try {
      const { getAdapterMetadataList } = await import('./chat/llm/adapters/registry.js')
      const metadataList = await getAdapterMetadataList()
      for (const meta of metadataList) {
        if (meta && meta.type) {
          metadataMap[meta.type.toLowerCase()] = meta
        }
      }
    } catch (err) {
      logger.warn('获取适配器元数据列表失败:', err.message)
    }

    // 将 default_model 和 description 集成到每个 provider 中
    const enrichedProviders = providers.map((provider) => {
      const meta = metadataMap[provider.adapterType?.toLowerCase()]
      return {
        ...provider,
        default_model: default_model[provider.displayName] || null,
        description: meta ? meta.description : '大语言模型适配器'
      }
    })

    for (const client of clients) {
      // 使用 LLM 服务的 getModelList 方法获取根据权限筛选的模型列表
      const filteredModels = this.llm?.getModelList(client.isAdmin) || {}

      // 根据可用模型过滤提供商
      const filteredProviders = enrichedProviders.filter(provider => {
        const instanceId = provider.displayName
        const models = filteredModels[instanceId]
        return models && models.length > 0
      })

      client.sendSystemMessage('models_updated', {
        providers: filteredProviders,
        models: filteredModels,
        default_model,
        timestamp: new Date().toISOString()
      })
    }

    logger.info(`[热重载] 已向 ${clients.length} 个客户端推送模型更新（根据权限筛选）`)
    logger.info(`LLM适配器热重载完成: ${loadResults.filter(r => r.success).length}/${loadResults.length} 成功`)

    return { providers: enrichedProviders, models, loadResults }
  }

  /**
   * 广播插件更新到所有客户端
   */
  async broadcastPluginsUpdate() {
    try {
      const { default: sessions } = await import('./server/socket.io/services/sessions.js')
      const clients = sessions.getAllClients()
      
      for (const client of clients) {
        client.sendSystemMessage('plugins_updated', {
          timestamp: new Date().toISOString()
        })
      }
      
      logger.info(`[插件系统] 已向 ${clients.length} 个活跃端推送插件更新通知`)
    } catch (error) {
      logger.error('[插件系统] 推送插件更新失败:', error)
    }
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
        // 发送错误消息给客户端
        e.error(new Error('未配置任何 LLM 适配器，请在管理界面中添加适配器配置'))
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

    // Start project-level watcher for plugin directory changes
    this._setupPluginWatchers()
  }

  async loadPlugin(plugin) {
    // ── 生命周期：加载前 ──
    await hookManager.execute(HOOK_POINTS.PLUGIN_BEFORE_INIT, { plugin })

    await plugin.initialize()

    // ── 生命周期：工具加载完成后 ──
    await hookManager.execute(HOOK_POINTS.PLUGIN_TOOLS_LOADED, { plugin })

    // ── 同步插件预设 ──
    await plugin.seedPresets()

    plugin.on('reloaded', () => {
      this.broadcastPluginsUpdate()
    })

    this.plugins.push(plugin)

    // ── 生命周期：加载后 ──
    await hookManager.execute(HOOK_POINTS.PLUGIN_AFTER_INIT, { plugin })

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
    
    // 清空现有插件列表并重新扫描加载
    this.plugins = []
    await this.loadPlugins()
    
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
    
    // 广播更新
    await this.broadcastPluginsUpdate()
    
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
      
      // 广播更新
      await this.broadcastPluginsUpdate()
      
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

    // ─── Plugin Directory Watcher ──────────────────────────────────────────
  // Watches lib/plugins/ and plugins/ for new/deleted plugin directories
  // and index.js changes — triggers hot reload without server restart.

  _setupPluginWatchers() {
    const bases = [
      path.join(process.cwd(), 'lib', 'plugins'),
      path.join(process.cwd(), 'plugins'),
    ]

    const debouncedReload = this._debounce((folderPath) => {
      this._reloadPluginByPath(folderPath)
    }, 600)

    const debouncedLoad = this._debounce((folderPath) => {
      this._loadPluginByPath(folderPath)
    }, 600)

    for (const basePath of bases) {
      if (!fs.existsSync(basePath)) continue

      const watcher = chokidar.watch(basePath, {
        ignored: /(^|[/\\])\../,
        persistent: true,
        depth: 2,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 1500,
          pollInterval: 100,
        },
      })

      watcher
        .on('addDir', (dirPath) => {
          // Only care about depth-1 dirs (plugin folders), not tools/ subdirs
          const rel = path.relative(basePath, dirPath)
          if (!rel || rel.includes(path.sep)) return
          const indexJs = path.join(dirPath, 'index.js')
          if (fs.existsSync(indexJs)) {
            logger.info(`[PluginWatcher] 检测到新插件目录: ${rel}`)
            debouncedLoad(dirPath)
          }
        })
        .on('unlinkDir', (dirPath) => {
          const rel = path.relative(basePath, dirPath)
          if (!rel || rel.includes(path.sep)) return
          logger.info(`[PluginWatcher] 检测到插件目录被删除: ${rel}`)
          this._unloadPluginByPath(dirPath)
        })
        .on('change', (filePath) => {
          if (!filePath.endsWith(path.sep + 'index.js')) return
          const folderPath = path.dirname(filePath)
          const rel = path.relative(basePath, folderPath)
          if (!rel || rel.includes(path.sep)) return
          logger.info(`[PluginWatcher] 检测到插件入口变更: ${rel}/index.js`)
          debouncedReload(folderPath)
        })
        .on('error', (err) =>
          logger.error('[PluginWatcher] 监听错误:', err),
        )

      this._pluginWatchers.push(watcher)
      logger.info(`[PluginWatcher] 已启动监听: ${basePath}`)
    }
  }

  async _reloadPluginByPath(folderPath) {
    const pluginName = path.basename(folderPath)
    const indexJs = path.join(folderPath, 'index.js')
    if (!fs.existsSync(indexJs)) {
      logger.warn(`[PluginWatcher] index.js 不存在，跳过重载: ${indexJs}`)
      return
    }

    try {
      // Find existing plugin
      const existingIdx = this.plugins.findIndex(
        (p) => p.pluginPath === folderPath,
      )
      if (existingIdx >= 0) {
        const old = this.plugins[existingIdx]
        await old.destroy().catch(() => {})
        this.plugins.splice(existingIdx, 1)
      }

      // Bust ESM cache and re-import
      const pluginUrl =
        pathToFileURL(indexJs).toString() + `?t=${Date.now()}`
      const pluginModule = await import(pluginUrl)
      const plugin = new pluginModule.default()

      await this.loadPlugin(plugin)
      logger.info(
        `[PluginWatcher] 插件重载成功: ${pluginName} (${plugin.tools.size} tools)`,
      )

      // Update LLM adapter + broadcast
      if (this.llm) this.llm.setPlugins(this.plugins)
      await this.broadcastPluginsUpdate()
    } catch (err) {
      logger.error(
        `[PluginWatcher] 插件重载失败: ${pluginName}:`,
        err,
      )
    }
  }

  async _loadPluginByPath(folderPath) {
    const pluginName = path.basename(folderPath)
    const indexJs = path.join(folderPath, 'index.js')
    if (!fs.existsSync(indexJs)) return

    // Avoid double-load if already registered
    if (this.plugins.some((p) => p.pluginPath === folderPath)) {
      logger.debug(
        `[PluginWatcher] 插件已存在，跳过加载: ${pluginName}`,
      )
      return
    }

    try {
      const pluginUrl =
        pathToFileURL(indexJs).toString() + `?t=${Date.now()}`
      const pluginModule = await import(pluginUrl)
      const plugin = new pluginModule.default()

      await this.loadPlugin(plugin)
      logger.info(
        `[PluginWatcher] 新插件加载成功: ${pluginName} (${plugin.tools.size} tools)`,
      )

      if (this.llm) this.llm.setPlugins(this.plugins)
      await this.broadcastPluginsUpdate()
    } catch (err) {
      logger.error(
        `[PluginWatcher] 新插件加载失败: ${pluginName}:`,
        err,
      )
    }
  }

  async _unloadPluginByPath(folderPath) {
    const pluginName = path.basename(folderPath)
    const existingIdx = this.plugins.findIndex(
      (p) => p.pluginPath === folderPath,
    )
    if (existingIdx < 0) return

    try {
      const old = this.plugins[existingIdx]

      // ── 生命周期：销毁前 ──
      await hookManager.execute(HOOK_POINTS.PLUGIN_BEFORE_DESTROY, {
        plugin: old,
      })

      await old.destroy().catch(() => {})

      // ── 生命周期：销毁后 ──
      await hookManager.execute(HOOK_POINTS.PLUGIN_AFTER_DESTROY, {
        plugin: old,
      })

      // ── 精确清理插件注册的全局 hooks ──
      await hookManager.unregisterByNamespace(old.name)

      this.plugins.splice(existingIdx, 1)
      logger.info(`[PluginWatcher] 插件已卸载: ${pluginName}`)

      if (this.llm) this.llm.setPlugins(this.plugins)
      await this.broadcastPluginsUpdate()
    } catch (err) {
      logger.error(`[PluginWatcher] 插件卸载失败: ${pluginName}:`, err)
    }
  }


  _debounce(func, wait) {
    let timer
    return (...args) => {
      clearTimeout(timer)
      timer = setTimeout(() => func(...args), wait)
    }
  }

  enableSocketServer(httpServer) {
    this.socketServer.initialize(httpServer)
  }
}
