import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'
import { pathToFileURL } from 'url' // 引入 pathToFileURL

const PACKAGE_JSON = 'package.json'
const TOOLS_DIR = 'tools'

export default class Plugin {
  constructor(info, settings = {}) {
    if (this.constructor === Plugin) {
      throw new Error('抽象类不能直接实例化')
    }
    const requiredMethods = ['getFilePath', 'getInitialConfig'] // 必须实现的方法
    for (const method of requiredMethods) {
      if (typeof this[method] !== 'function') {
        throw new Error(`插件必须实现 ${method} 方法`)
      }
    }
    this.metaData = info || {}
    this.tools = new Map() // 初始化 tools Map
    this.pluginPath = this.getFilePath() // 由子类实现，获取插件目录路径

    if (settings.toolsPath) {
      this.toolsPath = settings.toolsPath
    } else {
      this.toolsPath = path.join(this.pluginPath, TOOLS_DIR) // 工具目录路径
    }

    this._loadMetadata() // 加载 package.json 信息 (Sets this.name)

    // 配置将在 initialize() 中异步加载
    this.config = this.getInitialConfig() // 先使用默认配置

    this.toolWatcher = null // 初始化 tool watcher 为 null
    this.isInitialScanComplete = false // 添加一个标志来标识初始扫描是否完成
    this.isReloading = false // Add a flag to prevent recursive reload
    this.debouncedLoadTools = this.debounce(this.loadTools.bind(this), 500) // Debounced tool loader
  }

  async initialize() {
    await this.loadConfig() // 首次加载配置
    await this.loadTools() // 首次加载工具
    this._setupWatchers() // 启动工具文件监听
  }

  _loadMetadata() {
    const packageJsonPath = path.join(this.pluginPath, PACKAGE_JSON)
    try {
      if (fs.existsSync(packageJsonPath)) {
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8')
        const packageJson = JSON.parse(packageJsonContent)
        const { name, description, version, author } = packageJson
        // Use package.json name first if available
        this.name = name || path.basename(this.pluginPath)
        const metaData = {
          name: this.name, // Ensure name is consistent
          description,
          version,
          author,
        }
        this.metaData = { ...this.metaData, ...metaData } // Merge, constructor info takes precedence if keys conflict? Or package.json? Let's prioritize package.json
      } else {
        // Ensure name is set even without package.json
        if (!this.metaData.name) {
          this.name = path.basename(this.pluginPath) // 从目录名获取插件名
          this.metaData.name = this.name
        } else {
          this.name = this.metaData.name
        }
      }
      // Defensive check if name is still somehow undefined
      if (!this.name) {
        throw new Error('Plugin name could not be determined.')
      }
    } catch (error) {
      logger.error(`[插件元数据加载失败] ${packageJsonPath}:`, error)
      throw error // Re-throw or handle appropriately
    }
  }

  async loadTools() {
    if (this.isReloading) {
      return // Prevent recursive calls
    }
    this.isReloading = true

    if (!fs.existsSync(this.toolsPath)) {
      logger.warn(`[${this.name}] [工具目录未找到] ${this.toolsPath}`)
      this.tools.clear() // Clear existing tools if directory disappears
      this.isReloading = false
      return
    }

    try {
      const toolFiles = await fs.promises.readdir(this.toolsPath)
      const previousToolNames = new Set(this.tools.keys())
      const currentToolNames = new Set()

      for (const toolFile of toolFiles) {
        // 非 js 文件跳过
        if (!toolFile.endsWith('.js') && !toolFile.endsWith('.mjs')) {
          // Allow .mjs too
          continue
        }
        const toolPath = path.join(this.toolsPath, toolFile)
        try {
          const cacheBuster = Date.now() // Add timestamp as query parameter
          const fileUrl = `${pathToFileURL(toolPath).toString()}?t=${cacheBuster}`
          const toolModule = await import(fileUrl)

          // Check if default export is a class constructor
          if (
            typeof toolModule.default === 'function' &&
            toolModule.default.prototype
          ) {
            const ToolClass = toolModule.default
            // Assume constructor takes no arguments or handles missing ones
            const tool = new ToolClass()
            // Assume tool instance has a 'name' property
            if (tool.name) {
              this.tools.set(tool.name, tool)
              currentToolNames.add(tool.name)
              tool.setPlugin(this) // Set the plugin reference for the tool
            } else {
              logger.error(
                `[${this.name}] [工具加载失败] ${toolPath}: Tool instance missing 'name' property.`,
              )
            }
          } else {
            logger.error(
              `[${this.name}] [工具加载失败] ${toolPath}: Default export is not a valid class.`,
            )
          }
        } catch (error) {
          logger.error(`[${this.name}] [工具加载失败] ${toolPath}:`)
          logger.error(error)
        }
      }

      // Remove tools that are no longer present
      for (const toolName of previousToolNames) {
        if (!currentToolNames.has(toolName)) {
          this.tools.delete(toolName)
          logger.info(`[${this.name}] Unloaded tool: ${toolName}`)
        }
      }
    } catch (error) {
      logger.error(
        `[${this.name}] Error reading tools directory (${this.toolsPath}):`,
        error,
      )
      this.tools.clear() // Clear tools on error reading directory
    }

    this.isReloading = false
  }

  async loadConfig() {
    // Start with default config
    let configData = this.getInitialConfig()
    
    try {
      // Try to load from database first
      const { default: PluginConfigService } = await import('./database/services/PluginConfigService.js')
      
      // 确保服务已初始化
      if (!PluginConfigService.prisma) {
        await PluginConfigService.initialize()
      }
      
      const dbConfig = await PluginConfigService.findByName(this.name)
      
      if (dbConfig && dbConfig.configData) {
        configData = dbConfig.configData
        logger.debug(`[${this.name}] 从数据库加载配置`)
      } else {
        // If no database config exists, create one with default config
        await PluginConfigService.create(this.name, configData, true)
        logger.info(`[${this.name}] 创建默认配置到数据库`)
      }
    } catch (error) {
      logger.error(`[${this.name}] 从数据库加载配置失败，使用默认配置:`, error)
      // Fall back to default config
    }
    
    this.config = configData
  }

  _setupWatchers() {
    // 私有方法，监听工具文件变化
    // --- Tool Watcher ---
    if (!this.toolWatcher && fs.existsSync(this.toolsPath)) {
      // Only watch if directory exists
      this.toolWatcher = chokidar.watch(this.toolsPath, {
        ignored: /(^|[/\\])\../, // 忽略点文件
        persistent: true, // 保持监听状态
        depth: 0, // 只监听 tools 目录下的文件变化
        ignoreInitial: true, // Important: Ignore initial scan events for tools
        awaitWriteFinish: {
          // 等待文件写入完成
          stabilityThreshold: 2000, // 稳定时间
          pollInterval: 100, // 轮询间隔
        },
      })

      this.toolWatcher
        .on('add', (filePath) => {
          logger.info(
            `[${this.name}] [新增工具文件] ${path.basename(filePath)}`,
          )
          this.debouncedLoadTools() // Use the debounced function
        })
        .on('change', (filePath) => {
          logger.info(
            `[${this.name}] [更改工具文件] ${path.basename(filePath)}`,
          )
          this.debouncedLoadTools() // Use the debounced function
        })
        .on('unlink', (filePath) => {
          logger.info(
            `[${this.name}] [移除工具文件] ${path.basename(filePath)}`,
          )
          this.debouncedLoadTools() // Use the debounced function
        })
        .on('error', (error) =>
          logger.error(
            `[${this.name}] [工具文件监听错误] ${this.toolsPath}:`,
            error,
          ),
        )
    } else if (!fs.existsSync(this.toolsPath)) {
      logger.warn(
        `[${this.name}] Tools directory ${this.toolsPath} not found. Tool watcher not started.`,
      )
    } else {
      logger.debug(`[${this.name}] Tool watcher already exists.`)
    }
  }

  // Debounce function
  debounce(func, wait) {
    let timeout
    return function (...args) {
      const context = this
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(context, args), wait)
    }
  }

  getTools() {
    const map = new Map() // Create a new Map for each call to getTools()
    map.set(this.name, this.tools.values()) // Set the name of the plugin
    return map
  }

  async getConfig() {
    await this.loadConfig()
    return this.config
  }

  /**
   * 更新插件配置（仅更新内存中的配置，不保存到数据库）
   * 数据库的保存由 PluginConfigService 处理
   */
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
    logger.debug(`[${this.name}] 配置已更新`)
  }

  /**
   * 重新加载配置（从数据库）
   */
  async reloadConfig() {
    await this.loadConfig()
    logger.info(`[${this.name}] 配置已重新加载`)
  }

  getMetaData() {
    return this.metaData
  }

  // --- Optional Cleanup Method ---
  async destroy() {
    logger.info(`[${this.name}] Destroying plugin...`)
    if (this.toolWatcher) {
      logger.debug(`[${this.name}] Closing tool watcher.`)
      await this.toolWatcher.close()
      this.toolWatcher = null
    }
    this.tools.clear()
    // Clear timeouts if necessary (though debounce should handle this)
    logger.info(`[${this.name}] Plugin destroyed.`)
  }
}

// --- Example Child Class (Unchanged) ---
export class singleTools extends Plugin {
  constructor() {
    super(
      {
        name: 'custom',
      },
      {
        toolsPath: path.join(process.cwd(), 'plugins', 'custom'),
      },
    )
  }
  getFilePath() {
    return path.dirname(pathToFileURL(import.meta.url).toString())
  }
  getInitialConfig() {
    return {}
  }
}
