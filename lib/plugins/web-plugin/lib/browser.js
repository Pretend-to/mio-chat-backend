import puppeteer from 'puppeteer'

export async function launchBrowser() {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
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
        logger.error('Failed to launch browser:', error)
        throw error
    }
}
