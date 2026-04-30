/**
 * Shared logic for extracting content from a Puppeteer page.
 * @param {import('puppeteer').Page} page 
 * @returns {Promise<object>}
 */
export async function extractPageContent(page) {
    return await page.evaluate(() => {
        // 1. Expand all summary/details elements
        document.querySelectorAll('summary, details').forEach(el => {
            if (el.tagName === 'DETAILS') {
                el.open = true
            } else if (el.parentElement?.tagName === 'DETAILS') {
                el.parentElement.open = true
            } else {
                el.click()
            }
        })

        // 2. Remove known noise elements
        const noiseSelectors = [
            'nav', 'footer', 'header', 'aside', 
            '.ads', '.sidebar', '.menu', '.nav',
            'script', 'style', 'iframe', 'noscript'
        ]
        noiseSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => el.remove())
        })

        // 3. Extract basic info
        const title = document.title || ''
        const allText = document.body.innerText.trim()
        
        // 4. Extract images
        const images = Array.from(document.querySelectorAll('img')).map(img => ({
            title: img.alt || img.title || '',
            url: img.src
        })).filter(img => img.url && img.url.startsWith('http'))

        // 5. Extract links
        const links = Array.from(document.querySelectorAll('a')).map(link => ({
            title: link.innerText.trim() || link.title || '',
            url: link.href
        })).filter(link => link.url && link.url.startsWith('http'))

        return {
            title,
            pureText: allText.substring(0, 10000), // Limit to 10k chars
            images: images.slice(0, 10), // Limit to 10 images
            links: links.slice(0, 20) // Limit to 20 links
        }
    })
}
