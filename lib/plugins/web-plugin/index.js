import Plugin from '../../plugin.js'
import { findBrowserPath } from './lib/browserSniffer.js'
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
  }

  async initialize() {
    await super.initialize()
    
    // 1. Sniff browser path on startup and log
    const configPath = this.config.chromePath || this.config.parse?.puppeteer?.chromePath
    let browserDetected = false
    let resolvedPath = null

    if (configPath) {
      logger.info(`[WebPlugin] Configured chromePath: ${configPath}`)
      browserDetected = true
      resolvedPath = configPath
    } else {
      const detectedPath = findBrowserPath()
      if (detectedPath) {
        logger.info(`[WebPlugin] Smart-sniffed Chromium/Chrome path: ${detectedPath}`)
        browserDetected = true
        resolvedPath = detectedPath
      }
    }

    // 2. If Chrome is found, pre-warm and launch a resident instance
    if (browserDetected && resolvedPath) {
      logger.info('[WebPlugin] Pre-warming local Chrome browser instance...')
      try {
        this.chromeBrowser = await launchBrowser(resolvedPath)
        logger.info('[WebPlugin] Local Chrome browser instance pre-warmed successfully.')
      } catch (err) {
        logger.error(`[WebPlugin] Failed to pre-warm local Chrome: ${err.message}`)
      }
    }

    // 3. If no Chrome is found, check/install Obscura as preferred
    if (!browserDetected) {
      const obscuraPath = this.findObscuraPath()
      if (obscuraPath) {
        this.obscuraPath = obscuraPath
        logger.info(`[WebPlugin] No Chrome found. Found cached Obscura binary at: ${obscuraPath}. Setting it as preferred.`)
        await this.startObscuraService()
      } else {
        logger.warn(`[WebPlugin] No Chromium/Chrome or Obscura installation found on this system!`)
        // Trigger Obscura background download helper
        installObscuraInBackground(this)
      }
    }

    // Detect active search engine connectivity
    await this.detectActiveSearchEngine()
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
      search: {
        engine: 'duckduckgo',
        puppeteer: true,
      },
      parse: {
        puppeteer: {
          engine: 'duckduckgo',
          chromePath: '',
        },
      },
      chromePath: '',
    }
  }

  async destroy() {
    if (this.chromeBrowser) {
      logger.info('[WebPlugin] Cleaning up: Closing pre-warmed Chrome browser...')
      try {
        await this.chromeBrowser.close()
      } catch (err) {
        logger.error(`[WebPlugin] Error closing pre-warmed Chrome: ${err.message}`)
      }
      this.chromeBrowser = null
    }

    if (this.obscuraProcess) {
      logger.info('[WebPlugin] Cleaning up: Killing Obscura service process...')
      this.obscuraProcess.kill()
      this.obscuraProcess = null
      this.obscuraWSEndpoint = null
    }
    await super.destroy()
  }
}
