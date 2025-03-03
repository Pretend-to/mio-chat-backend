import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'
import { pathToFileURL } from 'url' // 引入 pathToFileURL
const PACKAGE_JSON = 'package.json'
const CONFIG_DIR = 'config/plugins'
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
    this.configPath = path.join(process.cwd(), CONFIG_DIR) // 全局配置目录路径
    if (settings.toolsPath) {
      this.toolsPath = settings.toolsPath
    } else {
      this.toolsPath = path.join(this.pluginPath, TOOLS_DIR) // 工具目录路径
    }
    this._loadMetadata() // 加载 package.json 信息
    this.loadConfig() // 加载插件配置
    this.toolWatcher = null   // 初始化 watcher 为 null
    this.isInitialScanComplete = false  // 添加一个标志来标识初始扫描是否完成
  }

  async initialize() {
    await this.loadTools() // 首次加载工具
    this._setupWatchers() // 启动文件监听
  }

  _loadMetadata() {
    const packageJsonPath = path.join(this.pluginPath, PACKAGE_JSON)
    try {
      if (fs.existsSync(packageJsonPath)) {
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8')
        const packageJson = JSON.parse(packageJsonContent)
        const { name, description, version, author } = packageJson
        this.name = name || path.basename(this.pluginPath)
        const metaData = {
          name,
          description,
          version,
          author,
        }
        this.metaData = metaData
      } else {
        if (this.metaData.name) {
          this.name = this.metaData.name
        } else {
          this.name = path.basename(this.pluginPath) // 从目录名获取插件名
          this.metaData.name = this.name
        }
      }
    } catch (error) {
      logger.error(`[插件元数据加载失败] ${packageJsonPath}:`, error)
      throw error
    }
  }
  async loadTools() {
    if (!fs.existsSync(this.toolsPath)) {
      logger.warn(`[工具目录未找到] ${this.toolsPath}`)
      return
    }
    try {
      const toolFiles = await fs.promises.readdir(this.toolsPath)
      this.tools.clear() // Reset tools Map
      for (const toolFile of toolFiles) {
        const toolPath = path.join(this.toolsPath, toolFile)
        try {
          const fileUrl = pathToFileURL(toolPath).toString() // Convert path to file URL
          const toolModule = await import(fileUrl) // 动态导入工具模块
          const tool = new toolModule.default() // 实例化工具
          this.tools.set(tool.name, tool)
        } catch (error) {
          logger.error(`[工具加载失败] ${toolPath}:`, error.message)
        }
      }
    } catch (error) {
      logger.error('Error reading tools directory:', error)
    }
  }
  loadConfig() {
    const configPath = path.join(process.cwd(), CONFIG_DIR, `${this.name}.json`)
    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf-8')
        try {
          this.config = JSON.parse(configContent) // 直接赋值
        } catch (parseError) {
          logger.error(`[配置文件解析失败] ${configPath}:`, parseError)
          this.config = this.getInitialConfig() // 解析失败，使用默认配置
        }
      } else {
        this.config = this.getInitialConfig() // 使用默认配置
        fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2), 'utf-8') // 写入配置文件
        logger.info(`[创建默认配置文件] ${configPath}`)
      }
    } catch (error) {
      logger.error(`[配置文件加载错误] ${configPath}:`, error)
      // 可以选择抛出错误、使用默认配置、记录日志
    }
  }
  _setupWatchers() { // 私有方法，监听插件变化
    if(this.toolWatcher) return // 避免重复创建 watcher

    this.toolWatcher = chokidar.watch(this.toolsPath, {
      ignored: /(^|[/\\])\../, // 忽略点文件
      persistent: true, // 保持监听状态
      depth: 0, // 只监听 tools 目录下的文件变化
      awaitWriteFinish: { // 等待文件写入完成
        stabilityThreshold: 2000, // 稳定时间
        pollInterval: 100 // 轮询间隔
      }
    })

    this.toolWatcher
      .on('add', (filePath) => {
        if (!this.isInitialScanComplete) { // 忽略初始扫描期间的 add 事件
          return
        }
        logger.info(`[新增工具文件]${filePath.split('\\').pop()}`)
        this.loadTools() // 重新加载工具
      })
      .on('change', (filePath) => {
        logger.info(`[更改工具文件] ${filePath.split('\\').pop()}`)
        this.loadTools() // 重新加载工具
      })
      .on('unlink', (filePath) => {
        logger.info(`[移除工具文件] ${filePath.split('\\').pop()}`)
        this.loadTools() // 重新加载工具
      })
      .on('error', error => logger.error(`[文件监听错误] ${this.toolsPath}:`, error))
      .on('ready', () => {
        this.isInitialScanComplete = true // 标记初始扫描完成
      })
  }
  getTools() {
    const toolsArray = []
    for (const tool of this.tools.values()) {
      toolsArray.push(tool.json())
    }
    return toolsArray
  }
  getConfig() {
    this.loadConfig()
    return this.config
  }
  getMetaData() {
    return this.metaData
  }
}

export class singleTools extends Plugin {
  constructor() {
    super({
      name: 'custom',
    }, {
      toolsPath: path.join(process.cwd(), 'plugins', 'custom')
    })
    this.initialize() // 在构造函数调用 initialize 方法
  }
  getFilePath() {
    return path.dirname(pathToFileURL(import.meta.url).toString())
  }
  getInitialConfig() {
    return {}
  }
}