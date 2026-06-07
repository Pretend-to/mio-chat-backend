import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'
import { pathToFileURL, fileURLToPath } from 'url'
import { EventEmitter } from 'events'
import hookManager from './hooks/index.js'
import { HOOK_POINTS } from './hooks/types.js'

import HookManager from './hooks/HookManager.js'

const PACKAGE_JSON = 'package.json'
const TOOLS_DIR = 'tools'

export default class Plugin extends EventEmitter {
  constructor(info, settings = {}) {
    super()
    if (this.constructor === Plugin) {
      throw new Error('抽象类不能直接实例化')
    }

    if (info?.importMetaUrl) {
      this._autoPluginPath = path.dirname(fileURLToPath(info.importMetaUrl))
    } else {
      if (typeof this.getFilePath !== 'function') {
        throw new Error('插件必须实现 getFilePath 方法，或在 super() 中传入 importMetaUrl')
      }
    }

    this.metaData = info || {}
    this.tools = new Map()
    this.pluginPath = this._autoPluginPath || this.getFilePath()
    this.toolsPath = settings.toolsPath || path.join(this.pluginPath, TOOLS_DIR)
    this.hooksPath = path.join(this.pluginPath, 'hooks')
    this.presetsPath = path.join(this.pluginPath, 'presets')
    
    this._loadMetadata()

    this.config = typeof this.getInitialConfig === 'function' ? this.getInitialConfig() : {}
    this.hooks = new HookManager()
    this.localPresets = []
    
    // Watchers
    this.toolWatcher = null
    this.hooksWatcher = null
    this.presetWatcher = null
    
    // Debounced Methods
    this.debouncedLoadTools = this.debounce(this.loadTools.bind(this), 500)
    this.debouncedLoadLocalPresets = this.debounce(this.loadLocalPresets.bind(this), 500)
    
    this.isReloading = false
  }

  async initialize() {
    logger.debug(`[${this.name}] 正在初始化...`)
    await this.loadConfig()
    await this.loadTools({ silent: true })
    await this.loadHooks()
    await this.loadLocalPresets()
    this._setupWatchers()
    logger.debug(`[${this.name}] 初始化完成`)
  }

  /**
   * 扫描 hooks/ 目录并注册
   */
  async loadHooks() {
    if (!fs.existsSync(this.hooksPath)) return
    try {
      this.hooks = new HookManager() // 重置私有管理器
      const files = fs.readdirSync(this.hooksPath).filter((f) => f.endsWith('.js'))
      for (const file of files) {
        const hookPath = path.join(this.hooksPath, file)
        const hookUrl = `${pathToFileURL(hookPath).toString()}?t=${Date.now()}`
        const HookClass = (await import(hookUrl)).default
        if (typeof HookClass === 'function') {
          const hookInstance = new HookClass({ namespace: this.name })
          await this.hooks.register(hookInstance)
        }
      }
      if (files.length > 0) {
        logger.debug(`[${this.name}] 已加载 ${files.length} 个私有钩子`)
      }
    } catch (error) {
      logger.error(`[${this.name}] 加载钩子失败:`, error)
    }
  }

  /**
   * 加载插件静态预设（仅读入内存）
   */
  async loadLocalPresets() {
    if (!fs.existsSync(this.presetsPath)) {
      this.localPresets = []
      return
    }
    try {
      const files = fs.readdirSync(this.presetsPath).filter((f) => f.endsWith('.json'))
      this.localPresets = files.map((f) => {
        try {
          const content = fs.readFileSync(path.join(this.presetsPath, f), 'utf-8')
          return {
            ...JSON.parse(content),
            provider: this.name,
            source: 'plugin',
          }
        } catch (e) {
          logger.error(`[${this.name}] 解析预设文件失败 ${f}:`, e.message)
          return null
        }
      }).filter(Boolean)
      
      if (this.localPresets.length > 0) {
        logger.debug(`[${this.name}] 已加载 ${this.localPresets.length} 个静态预设`)
      }
    } catch (error) {
      logger.error(`[${this.name}] 加载静态预设失败:`, error)
    }
  }

  /**
   * 将插件 Hook 传播到全局
   * 采用“先清理后注入”策略，支持热重载
   */
  async _propagateHooks() {
    await hookManager.unregisterByNamespace(this.name)
    hookManager.absorb(this.hooks)
  }
  _loadMetadata() {
    const packageJsonPath = path.join(this.pluginPath, PACKAGE_JSON)
    try {
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
        this.name = packageJson.name || path.basename(this.pluginPath)
        this.metaData = { ...this.metaData, ...packageJson }
      } else {
        this.name = this.metaData.name || path.basename(this.pluginPath)
        this.metaData.name = this.name
      }
    } catch (error) {
      logger.error(`[${this.name}] 元数据加载失败:`, error)
      this.name = path.basename(this.pluginPath)
    }
  }

  async loadTools(options = { silent: false }) {
    if (this.isReloading) return
    this.isReloading = true

    if (!fs.existsSync(this.toolsPath)) {
      this.tools.clear()
      this.isReloading = false
      return
    }

    try {
      const toolFiles = await fs.promises.readdir(this.toolsPath)
      const currentToolNames = new Set()

      for (const toolFile of toolFiles) {
        if (!toolFile.endsWith('.js') && !toolFile.endsWith('.mjs')) continue
        const toolPath = path.join(this.toolsPath, toolFile)
        try {
          const toolUrl = `${pathToFileURL(toolPath).toString()}?t=${Date.now()}`
          const toolModule = await import(toolUrl)
          if (typeof toolModule.default === 'function') {
            const tool = new toolModule.default()
            
            // 校验工具是否允许加载
            const allowed = await hookManager.execute(HOOK_POINTS.TOOL_BEFORE_LOAD, {
              tool,
              plugin: this
            })

            if (allowed && tool.name) {
              this.tools.set(tool.name, tool)
              currentToolNames.add(tool.name)
              tool.setPlugin(this)
            }
          }
        } catch (error) {
          logger.error(`[${this.name}] 工具加载失败 ${toolFile}:`, error.message)
        }
      }

      for (const name of this.tools.keys()) {
        if (!currentToolNames.has(name)) this.tools.delete(name)
      }
    } catch (error) {
      logger.error(`[${this.name}] 读取工具目录失败:`, error)
    }

    this.isReloading = false
    if (!options.silent) this.emit('reloaded')
  }

  async loadConfig() {
    let configData = typeof this.getInitialConfig === 'function' ? this.getInitialConfig() : {}
    try {
      const { default: PluginConfigService } = await import('./database/services/PluginConfigService.js')
      await PluginConfigService.initialize()
      const dbConfig = await PluginConfigService.findByName(this.name)
      if (dbConfig?.configData) {
        configData = dbConfig.configData
      } else {
        await PluginConfigService.create(this.name, configData, true)
      }
    } catch (error) {
      logger.error(`[${this.name}] 加载数据库配置失败:`, error.message)
    }
    this.config = configData
  }

  _setupWatchers() {
    const watchOptions = {
      ignored: /(^|[/\\\\])\\../,
      persistent: true,
      depth: 0,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 },
    }

    if (!this.toolWatcher && fs.existsSync(this.toolsPath)) {
      this.toolWatcher = chokidar.watch(this.toolsPath, watchOptions)
      this.toolWatcher.on('all', (event) => {
        if (['add', 'change', 'unlink'].includes(event)) this.debouncedLoadTools()
      })
    }

    if (!this.hooksWatcher && fs.existsSync(this.hooksPath)) {
      this.hooksWatcher = chokidar.watch(this.hooksPath, watchOptions)
      this.hooksWatcher.on('all', async (event) => {
        if (['add', 'change', 'unlink'].includes(event)) {
          await this.loadHooks()
          this._propagateHooks()
        }
      })
    }

    if (!this.presetWatcher && fs.existsSync(this.presetsPath)) {
      this.presetWatcher = chokidar.watch(this.presetsPath, watchOptions)
      this.presetWatcher.on('all', (event) => {
        if (['add', 'change', 'unlink'].includes(event)) this.debouncedLoadLocalPresets()
      })
    }
  }

  debounce(func, wait) {
    let timeout
    return function (...args) {
      const context = this
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(context, args), wait)
    }
  }

  getTools() {
    const map = new Map()
    map.set(this.name, Array.from(this.tools.values()))
    return map
  }

  async getConfig() {
    return this.config
  }

  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
  }

  async reloadConfig() {
    await this.loadConfig()
  }

  getMetaData() {
    return this.metaData
  }

  async destroy() {
    if (this.toolWatcher) await this.toolWatcher.close()
    if (this.hooksWatcher) await this.hooksWatcher.close()
    if (this.presetWatcher) await this.presetWatcher.close()
    this.tools.clear()
    this.localPresets = []
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
