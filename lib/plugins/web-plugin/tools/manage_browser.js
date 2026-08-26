import { MioFunction } from '../../../function.js'
import { findBrowserPathByType } from '../lib/browserSniffer.js'
import { installChromiumInBackground, installObscuraInBackground } from '../lib/downloader.js'

export default class manage_browser extends MioFunction {
  constructor() {
    super({
      description: 'Manage browser engines for the web plugin. Query status, switch active browser engine (automatically updates pre-warmed instance), or trigger browser downloads.',
      name: 'manage_browser',
      parameters: {
        properties: {
          action: {
            description: 'The management action to perform: "status" (check browser statuses), "select" (switch active browser), or "install" (download a browser).',
            enum: ['status', 'select', 'install'],
            type: 'string'
          },
          browser: {
            description: 'Optional. The browser engine to switch to or install: "obscura", "chrome", "edge", or "chromium". Required for "select" and "install" actions.',
            enum: ['obscura', 'chrome', 'edge', 'chromium'],
            type: 'string'
          }
        },
        required: ['action'],
        type: 'object'
      }
    })
    this.func = this.handleAction
  }

  async handleAction(e) {
    const { action, browser } = e.params
    const plugin = this.parentPlugin

    if (!plugin) {
      return {
        error: 'Parent plugin reference not found.',
        success: false
      }
    }

    if (action === 'status') {
      plugin.detectAllBrowsers() // Refresh comprehensive browser scan
      const statuses = {}

      for (const [name, p] of Object.entries(plugin.detectedBrowsers)) {
        statuses[name] = {
          installed: Boolean(p),
          path: p || null
        }
      }

      return {
        activeBrowser: plugin.activeBrowser,
        browsers: statuses,
        preWarmingState: {
          chromePreWarmed: !!plugin.chromeBrowser,
          obscuraRunning: !!plugin.obscuraWSEndpoint,
          obscuraWSEndpoint: plugin.obscuraWSEndpoint
        },
        success: true
      }
    }

    if (action === 'select') {
      if (!browser) {
        return {
          error: 'Parameter "browser" is required for "select" action.',
          success: false
        }
      }

      try {
        await plugin.switchBrowser(browser)
        return {
          activeBrowser: plugin.activeBrowser,
          message: `Successfully switched to and pre-warmed browser: ${browser}`,
          success: true
        }
      } catch (error) {
        logger.error(`Failed to switch browser: ${error.message}`)
        return {
          success: false,
          error: error.message
        }
      }
    }

    if (action === 'install') {
      if (!browser) {
        return {
          error: 'Parameter "browser" is required for "install" action.',
          success: false
        }
      }

      const p = findBrowserPathByType(browser)
      if (p) {
        return {
          message: `Browser "${browser}" is already installed at: ${p}`,
          success: true
        }
      }

      if (browser === 'obscura') {
        logger.info('[WebPlugin] Triggering Obscura background download via manage_browser...')
        installObscuraInBackground(plugin)
        return {
          message: 'Obscura download and installation started in the background. Check logs for progress.',
          success: true
        }
      }

      if (browser === 'chromium') {
        logger.info('[WebPlugin] Triggering Chromium background download via manage_browser...')
        installChromiumInBackground(plugin)
        return {
          message: 'Chromium download and installation started in the background. Check logs for progress.',
          success: true
        }
      }

      return {
        error: `Installation of browser "${browser}" is not supported. Please install it on your OS manually.`,
        success: false
      }
    }

    return {
      error: `Unsupported action: ${action}`,
      success: false
    }
  }
}
