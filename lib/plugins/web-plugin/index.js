import Plugin from '../../plugin.js'
import { findBrowserPathByType } from './lib/browserSniffer.js'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { getFreePort, installObscuraInBackground } from './lib/downloader.js'
import { launchBrowser } from './lib/browser.js'

export default class WebPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
    this.obscuraPath = null
    this.obscuraWSEndpoint = null
    this.obscuraProcess = null
    this.chromeBrowser = null
    this.activeBrowser = null
    this.detectedBrowsers = {}
    this._switching = false
  }

  async initialize() {
    await super.initialize()
    
    // 1. Decoupled comprehensive scan of all available browsers
    this.detectAllBrowsers()

    // Determine target/selected browser engine
    const preferredBrowser = this.config.browser || this.config.parse?.puppeteer?.browser
    
    if (preferredBrowser) {
      logger.info(`[WebPlugin] Preferred browser engine configured: ${preferredBrowser}`)
      const foundPath = this.detectedBrowsers[preferredBrowser]
      if (foundPath) {
        this.activeBrowser = preferredBrowser
        await this.preWarmBrowser(preferredBrowser, foundPath)
      } else {
        logger.warn(`[WebPlugin] Preferred browser "${preferredBrowser}" is configured but not installed on this system. Sniffing fallbacks...`)
        await this.autoSniffAndPreWarm()
      }
    } else {
      await this.autoSniffAndPreWarm()
    }

    // Detect active search engine connectivity
    await this.detectActiveSearchEngine()
  }

  detectAllBrowsers() {
    this.detectedBrowsers = {
      obscura: this.findObscuraPath(),
      chromium: findBrowserPathByType('chromium'),
      chrome: findBrowserPathByType('chrome'),
      edge: findBrowserPathByType('edge')
    }
    
    logger.debug('[WebPlugin] Comprehensive browser scan results: ' + 
      Object.entries(this.detectedBrowsers)
        .map(([name, path]) => `${name}: ${path ? 'Installed (' + path + ')' : 'Not Found'}`)
        .join(', ')
    )
  }

  async autoSniffAndPreWarm() {
    // Calling Priority order: obscura -> chromium -> chrome -> edge
    const priorityList = ['obscura', 'chromium', 'chrome', 'edge']
    
    for (const type of priorityList) {
      const resolvedPath = this.detectedBrowsers[type]
      if (resolvedPath) {
        this.activeBrowser = type
        logger.info(`[WebPlugin] Auto-selection: chosen "${type}" as active browser based on priority (Path: ${resolvedPath})`)
        await this.preWarmBrowser(type, resolvedPath)
        return
      }
    }

    // None detected: download Obscura in background
    logger.warn(`[WebPlugin] No browsers (Obscura, Chromium, Chrome, Edge) detected. Installing Obscura in background...`)
    this.activeBrowser = 'obscura'
    installObscuraInBackground(this)
  }

  async preWarmBrowser(type, resolvedPath) {
    if (type === 'obscura') {
      this.obscuraPath = resolvedPath
      await this.startObscuraService()
    } else {
      logger.info(`[WebPlugin] Pre-warming local ${type} browser instance...`)
      try {
        this.chromeBrowser = await launchBrowser(resolvedPath)
        logger.info(`[WebPlugin] Local ${type} browser instance pre-warmed successfully.`)
      } catch (err) {
        logger.error(`[WebPlugin] Failed to pre-warm local ${type}: ${err.message}`)
      }
    }
  }

  async switchBrowser(browserType) {
    if (this._switching) {
      throw new Error('Browser switch is already in progress.')
    }
    this._switching = true
    try {
      logger.info(`[WebPlugin] Switching active browser engine to: ${browserType}`)
      
      // 1. Clean up existing pre-warmed browser or service
      await this.cleanupBrowser()
      
      // 2. Lookup path for the new browser
      const resolvedPath = findBrowserPathByType(browserType)
      if (!resolvedPath) {
        throw new Error(`Browser "${browserType}" is not installed on this system. Please install it first.`)
      }
      
      // 3. Pre-warm/start new browser
      await this.preWarmBrowser(browserType, resolvedPath)
      this.activeBrowser = browserType
      
      // 4. Update memory config and save
      const currentConfig = this.config || {}
      if (!currentConfig.parse) currentConfig.parse = {}
      if (!currentConfig.parse.puppeteer) currentConfig.parse.puppeteer = {}
      
      currentConfig.browser = browserType
      currentConfig.parse.puppeteer.browser = browserType
      currentConfig.chromePath = browserType === 'obscura' ? '' : resolvedPath
      currentConfig.parse.puppeteer.chromePath = browserType === 'obscura' ? '' : resolvedPath
      
      await this.updateConfig(currentConfig)
      
      // Save new config to Database
      const { default: PluginConfigService } = await import('../../database/services/PluginConfigService.js')
      if (!PluginConfigService.prisma) {
        await PluginConfigService.initialize()
      }
      const exists = await PluginConfigService.exists(this.metaData.name)
      if (exists) {
        await PluginConfigService.update(this.metaData.name, currentConfig)
      } else {
        await PluginConfigService.create(this.metaData.name, currentConfig, true)
      }
      
      logger.info(`[WebPlugin] Successfully switched to and pre-warmed browser: ${browserType}`)
    } finally {
      this._switching = false
    }
  }

  async cleanupBrowser() {
    if (this.chromeBrowser) {
      logger.info('[WebPlugin] Cleaning up: Closing pre-warmed browser...')
      try {
        await this.chromeBrowser.close()
      } catch (err) {
        logger.error(`[WebPlugin] Error closing pre-warmed browser: ${err.message}`)
      }
      this.chromeBrowser = null
    }

    if (this.obscuraProcess) {
      logger.info('[WebPlugin] Cleaning up: Killing Obscura service process...')
      try {
        this.obscuraProcess.kill()
      } catch (err) {
        logger.error(`[WebPlugin] Error killing Obscura process: ${err.message}`)
      }
      this.obscuraProcess = null
      this.obscuraWSEndpoint = null
    }
  }

  findObscuraPath() {
    const home = os.homedir()
    const platform = os.platform()
    const binaryName = platform === 'win32' ? 'obscura.exe' : 'obscura'
    const localPath = path.join(home, '.cache/obscura', binaryName)
    if (fs.existsSync(localPath)) {
      return localPath
    }
    return null
  }

  async startObscuraService() {
    if (this.obscuraWSEndpoint) return // Already running
    
    try {
      const port = await getFreePort(9222)
      logger.info(`[WebPlugin] Starting Obscura background service at path: ${this.obscuraPath} on port ${port}`)
      
      this.obscuraProcess = spawn(this.obscuraPath, ['serve', '--port', String(port), '--stealth'])
      
      this.obscuraProcess.on('error', (err) => {
        logger.error(`[WebPlugin] Obscura process error: ${err.message}`)
      })
 
      this.obscuraProcess.on('exit', (code) => {
        logger.info(`[WebPlugin] Obscura process exited with code: ${code}`)
        this.obscuraWSEndpoint = null
        this.obscuraProcess = null
      })
 
      // Wait 500ms for server port binding
      await new Promise(resolve => setTimeout(resolve, 500))
      
      this.obscuraWSEndpoint = `ws://127.0.0.1:${port}`
      logger.info(`[WebPlugin] Obscura service successfully launched at: ${this.obscuraWSEndpoint}`)
    } catch (err) {
      logger.error(`[WebPlugin] Failed to start Obscura service: ${err.message}`)
    }
  }

  async detectActiveSearchEngine() {
    const engines = [
      { id: 'duckduckgo', name: 'DuckDuckGo (HTML)', url: 'https://html.duckduckgo.com', priority: 1 },
      { id: 'bing', name: 'Bing', url: 'https://www.bing.com', priority: 2 },
      { id: 'cn_bing', name: 'CN Bing', url: 'https://cn.bing.com', priority: 2 },
      { id: 'baidu', name: 'Baidu', url: 'https://www.baidu.com', priority: 3 },
      { id: 'google', name: 'Google', url: 'https://www.google.com', priority: 4 }
    ]

    logger.info('[WebPlugin] Testing search engine connectivity on startup...')
    const checks = await Promise.all(
      engines.map(async (eng) => {
        try {
          const start = Date.now()
          const res = await fetch(eng.url, { 
            signal: AbortSignal.timeout(2000), 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } 
          })
          return {
            ...eng,
            ok: res.ok || (res.status >= 200 && res.status < 400),
            latency: Date.now() - start
          }
        } catch (err) {
          return { ...eng, ok: false, error: err.message }
        }
      })
    )

    const available = checks
      .filter(eng => eng.ok)
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        return a.latency - b.latency
      })

    if (available.length > 0) {
      const selected = available[0]
      this.activeEngine = selected.id
      logger.info(`[WebPlugin] Active search engine selected: ${selected.name} (Latency: ${selected.latency}ms)`)
    } else {
      logger.warn('[WebPlugin] No search engines are reachable. Defaulting to duckduckgo.')
      this.activeEngine = 'duckduckgo'
    }
  }

  getInitialConfig() {
    return {
      browser: '',
      search: {
        engine: 'duckduckgo',
        puppeteer: true,
      },
      parse: {
        puppeteer: {
          browser: '',
          engine: 'duckduckgo',
          chromePath: '',
        },
      },
      chromePath: '',
    }
  }

  async destroy() {
    await this.cleanupBrowser()
    await super.destroy()
  }
}
