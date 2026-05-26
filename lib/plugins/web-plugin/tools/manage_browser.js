import { MioFunction } from '../../../function.js'
import { findBrowserPathByType } from '../lib/browserSniffer.js'
import { installObscuraInBackground, installChromiumInBackground } from '../lib/downloader.js'

export default class manage_browser extends MioFunction {
  constructor() {
    super({
      name: 'manage_browser',
      description: 'Manage browser engines for the web plugin. Query status, switch active browser engine (automatically updates pre-warmed instance), or trigger browser downloads.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'The management action to perform: "status" (check browser statuses), "select" (switch active browser), or "install" (download a browser).',
            enum: ['status', 'select', 'install']
          },
          browser: {
            type: 'string',
            description: 'Optional. The browser engine to switch to or install: "obscura", "chrome", "edge", or "chromium". Required for "select" and "install" actions.',
            enum: ['obscura', 'chrome', 'edge', 'chromium']
          }
        },
        required: ['action']
      }
    })
    this.func = this.handleAction
  }

  async handleAction(e) {
    const { action, browser } = e.params
    const plugin = this.parentPlugin

    if (!plugin) {
      return {
        success: false,
        error: 'Parent plugin reference not found.'
      }
    }

    if (action === 'status') {
      const engines = ['obscura', 'chrome', 'edge', 'chromium']
      const statuses = {}

      for (const eng of engines) {
        const p = findBrowserPathByType(eng)
        statuses[eng] = {
          installed: !!p,
          path: p || null
        }
      }

      return {
        success: true,
        activeBrowser: plugin.activeBrowser,
        preWarmingState: {
          chromePreWarmed: !!plugin.chromeBrowser,
          obscuraRunning: !!plugin.obscuraWSEndpoint,
          obscuraWSEndpoint: plugin.obscuraWSEndpoint
        },
        browsers: statuses
      }
    }

    if (action === 'select') {
      if (!browser) {
        return {
          success: false,
          error: 'Parameter "browser" is required for "select" action.'
        }
      }

      try {
        await plugin.switchBrowser(browser)
        return {
          success: true,
          activeBrowser: plugin.activeBrowser,
          message: `Successfully switched to and pre-warmed browser: ${browser}`
        }
      } catch (err) {
        logger.error(`Failed to switch browser: ${err.message}`)
        return {
          success: false,
          error: err.message
        }
      }
    }

    if (action === 'install') {
      if (!browser) {
        return {
          success: false,
          error: 'Parameter "browser" is required for "install" action.'
        }
      }

      const p = findBrowserPathByType(browser)
      if (p) {
        return {
          success: true,
          message: `Browser "${browser}" is already installed at: ${p}`
        }
      }

      if (browser === 'obscura') {
        logger.info('[WebPlugin] Triggering Obscura background download via manage_browser...')
        installObscuraInBackground(plugin)
        return {
          success: true,
          message: 'Obscura download and installation started in the background. Check logs for progress.'
        }
      }

      if (browser === 'chromium') {
        logger.info('[WebPlugin] Triggering Chromium background download via manage_browser...')
        installChromiumInBackground(plugin)
        return {
          success: true,
          message: 'Chromium download and installation started in the background. Check logs for progress.'
        }
      }

      return {
        success: false,
        error: `Installation of browser "${browser}" is not supported. Please install it on your OS manually.`
      }
    }

    return {
      success: false,
      error: `Unsupported action: ${action}`
    }
  }
}
