import puppeteer from 'puppeteer-core'
import { findBrowserPath } from './browserSniffer.js'

export async function launchBrowser(customPath, options = {}) {
    try {
        const wsEndpoint = options.obscuraWSEndpoint || options.parentPlugin?.obscuraWSEndpoint
        if (wsEndpoint) {
            logger.info(`Puppeteer connecting to Obscura service at: ${wsEndpoint}`)
            return await puppeteer.connect({
                browserWSEndpoint: wsEndpoint
            })
        }

        const preWarmed = options.parentPlugin?.chromeBrowser
        if (preWarmed) {
            logger.debug('[Browser] Reusing pre-warmed Chrome browser instance.')
            return new Proxy(preWarmed, {
                get(target, prop) {
                    if (prop === 'close') {
                        return async () => {
                            logger.debug('[Browser] Intercepted browser.close() call on pre-warmed Chrome instance (noop).')
                        }
                    }
                    const value = Reflect.get(target, prop)
                    return typeof value === 'function' ? value.bind(target) : value
                }
            })
        }

        const browserPath = customPath || process.env.PUPPETEER_EXECUTABLE_PATH || findBrowserPath()
        if (!browserPath) {
            throw new Error(
                'Could not find a valid Chrome, Chromium, or Microsoft Edge installation on this system. ' +
                'Please install a compatible browser or specify the path via PUPPETEER_EXECUTABLE_PATH environment variable.'
            )
        }
        logger.info(`Puppeteer launching using browser at path: ${browserPath}`)
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: browserPath,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ],
        })
        return browser
    } catch (error) {
        logger.error('Failed to launch/connect browser:', error)
        throw error
    }
}
