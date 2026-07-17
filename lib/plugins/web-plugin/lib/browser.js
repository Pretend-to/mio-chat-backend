import puppeteer from 'puppeteer-core'
import { findBrowserPath, findBrowserPathByType } from './browserSniffer.js'

function wrapBrowser(browser, isPreWarmed = false) {
    return new Proxy(browser, {
        get(target, prop) {
            if (prop === 'close') {
                if (isPreWarmed) {
                    return async () => {
                        logger.debug('[Browser] Intercepted browser.close() call on pre-warmed Chrome instance (noop).')
                    }
                }
            }
            if (prop === 'newPage') {
                return async (...args) => {
                    const page = await target.newPage(...args)
                    try {
                        // 1. Set realistic User-Agent
                        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')
                        
                        // 2. Inject stealth script on new documents
                        await page.evaluateOnNewDocument(() => {
                            // Hide webdriver
                            Object.defineProperty(navigator, 'webdriver', {
                                get: () => undefined
                            });
                            // Mock plugins
                            Object.defineProperty(navigator, 'plugins', {
                                get: () => [
                                    { description: 'Portable Document Format', filename: 'internal-pdf-viewer', name: 'Chromium PDF Viewer' }
                                ]
                            });
                            // Mock languages
                            Object.defineProperty(navigator, 'languages', {
                                get: () => ['zh-CN', 'zh', 'en-US', 'en']
                            });
                            // Mock chrome runtime
                            window.chrome = {
                                runtime: {}
                            };
                            // Mock permissions query
                            const originalQuery = window.navigator.permissions.query;
                            window.navigator.permissions.query = (parameters) => (
                                parameters.name === 'notifications'
                                    ? Promise.resolve({ state: typeof Notification !== 'undefined' ? Notification.permission : 'denied' })
                                    : originalQuery(parameters)
                            );
                        })
                    } catch (stealthErr) {
                        logger.warn('[Browser] Failed to apply stealth overrides:', stealthErr)
                    }
                    return page
                }
            }
            const value = Reflect.get(target, prop)
            return typeof value === 'function' ? value.bind(target) : value
        }
    })
}

export async function launchBrowser(customPath, options = {}) {
    try {
        // 优先通过 parentPlugin.getBrowser() 走懒加载 + 空闲回收
        // _internalCall 标记防止 getBrowser → launchBrowser → getBrowser 无限递归
        const parentPlugin = options.parentPlugin
        if (parentPlugin && typeof parentPlugin.getBrowser === 'function' && !options.preferFullBrowser && !options._internalCall) {
            return parentPlugin.getBrowser(options)
        }

        const wsEndpoint = options.obscuraWSEndpoint || parentPlugin?.obscuraWSEndpoint
        if (wsEndpoint && !options.preferFullBrowser) {
            logger.info(`Puppeteer connecting to Obscura service at: ${wsEndpoint}`)
            const browser = await puppeteer.connect({
                browserWSEndpoint: wsEndpoint
            })
            return wrapBrowser(browser, false)
        }

        // 注：在懒加载模式下，_internalCall=true 时走到这里直接 launch，
        // parentPlugin.chromeBrowser 此时为 null，preWarmed 分支已移除。
        let browserPath = customPath || process.env.PUPPETEER_EXECUTABLE_PATH
        if (!browserPath && options.parentPlugin?.activeBrowser && options.parentPlugin?.activeBrowser !== 'obscura') {
            browserPath = findBrowserPathByType(options.parentPlugin.activeBrowser)
        }
        if (!browserPath) {
            browserPath = findBrowserPath()
        }
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
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-blink-features=AutomationControlled'
            ],
        })
        // 如果来自 getBrowser 懒加载，标记为受管理（拦截 close，由空闲回收控制生命周期）
        return wrapBrowser(browser, options._internalCall || false)
    } catch (error) {
        logger.error('Failed to launch/connect browser:', error)
        throw error
    }
}
