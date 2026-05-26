import Plugin from '../../plugin.js'
import axios from 'axios'
import { findBrowserPath } from './lib/browserSniffer.js'

export default class WebPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }

  async initialize() {
    await super.initialize()
    
    // Sniff browser path on startup and log
    const configPath = this.config.chromePath || this.config.parse?.puppeteer?.chromePath
    if (configPath) {
      logger.info(`[WebPlugin] Configured chromePath: ${configPath}`)
    } else {
      const detectedPath = findBrowserPath()
      if (detectedPath) {
        logger.info(`[WebPlugin] Smart-sniffed Chromium/Chrome path: ${detectedPath}`)
      } else {
        logger.warn(`[WebPlugin] No Chromium/Chrome installation found on this system!`)
        // Trigger background installation task
        this.installChromiumInBackground()
      }
    }
  }

  async installChromiumInBackground() {
    logger.info('[WebPlugin] Checking network connectivity for Chromium background installation...')
    const net = await this.testNetwork()
    
    if (!net.googleConnected && !net.mirrorConnected) {
      logger.error('[WebPlugin] Network is offline or extremely slow/unreachable. Cannot download Chromium in background.')
      return
    }

    // Run the installation asynchronously without awaiting it
    this.runInstallation(net).catch(err => {
      logger.error('[WebPlugin] Background Chromium installation failed:', err.message)
    })
  }

  async testNetwork() {
    let googleConnected = false
    let mirrorConnected = false

    // Fast check for Google
    try {
      const start = Date.now()
      await axios.get('https://storage.googleapis.com', { timeout: 2000 })
      googleConnected = true
      logger.debug(`[WebPlugin] Google connection test succeeded in ${Date.now() - start}ms`)
    } catch (e) {
      logger.debug('[WebPlugin] Google connection test failed or timed out:', e.message)
    }

    // Fast check for npmmirror
    try {
      const start = Date.now()
      await axios.get('https://cdn.npmmirror.com', { timeout: 2000 })
      mirrorConnected = true
      logger.debug(`[WebPlugin] npmmirror connection test succeeded in ${Date.now() - start}ms`)
    } catch (e) {
      logger.debug('[WebPlugin] npmmirror connection test failed or timed out:', e.message)
    }

    return { googleConnected, mirrorConnected }
  }

  async runInstallation(net) {
    const { install, Browser, detectBrowserPlatform, resolveBuildId } = await import('@puppeteer/browsers')
    const os = await import('os')
    const path = await import('path')

    const platform = detectBrowserPlatform()
    const home = os.homedir()
    const cacheDir = path.join(home, '.cache/puppeteer')

    let buildId = '131.0.6778.204' // Default stable fallback
    let downloadBaseUrl = undefined

    if (net.googleConnected) {
      try {
        buildId = await resolveBuildId(Browser.CHROME, platform, 'stable')
        logger.info(`[WebPlugin] Resolved latest Chrome stable build ID: ${buildId}`)
      } catch (err) {
        logger.warn(`[WebPlugin] Failed to resolve build ID from Google, using stable fallback: ${err.message}`)
        if (net.mirrorConnected) {
          downloadBaseUrl = 'https://cdn.npmmirror.com/binaries/chrome-for-testing'
        }
      }
    } else if (net.mirrorConnected) {
      downloadBaseUrl = 'https://cdn.npmmirror.com/binaries/chrome-for-testing'
      logger.info('[WebPlugin] Google is unreachable/blocked. Using npmmirror to download.')
    }

    logger.info(`[WebPlugin] Starting background installation of Chrome ${buildId} to ${cacheDir}...`)
    const startTime = Date.now()

    const installedBrowser = await install({
      browser: Browser.CHROME,
      buildId,
      cacheDir,
      platform,
      downloadBaseUrl,
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    logger.info(`[WebPlugin] Background Chrome installation completed successfully in ${duration}s! Executable: ${installedBrowser.executablePath}`)
  }

  getInitialConfig() {
    return {
      search: {
        engine: 'bing',
        puppeteer: true,
      },
      parse: {
        puppeteer: {
          engine: 'bing',
          chromePath: '',
        },
      },
      chromePath: '',
    }
  }
}
