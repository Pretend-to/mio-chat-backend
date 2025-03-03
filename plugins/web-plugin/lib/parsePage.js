import puppeteer from 'puppeteer';

async function puppeteerParse(url) {
    let browser = null;
    try {
        browser = await puppeteer.launch(); // Ensure headless is set for server environments
        const page = await browser.newPage();
        logger.debug('Puppeteer: Page created');
        await page.goto(url, { waitUntil: 'domcontentloaded' }); // Add timeout
        logger.debug('Puppeteer: Page loaded');
        const result = await page.evaluate(() => {
            const texts = [];
            const images = [];
            const hyperLinks = [];

            // Expand all summary elements
            const summaryElements = document.querySelectorAll('summary');
            summaryElements.forEach((summary) => {
                summary.click();
            });

            // Select all text
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(document.body);
            selection.removeAllRanges();
            selection.addRange(range);

            const selectedText = selection.toString().trim();
            if (selectedText) {
                texts.push(selectedText);
            }

            const imgElements = document.querySelectorAll('img');
            imgElements.forEach((img) => {
                images.push({ title: img.alt || '', url: img.src }); // No URI encoding here
            });

            const linkElements = document.querySelectorAll('a');
            linkElements.forEach((link) => {
                const title = link.innerText.trim() || link.title || link.href;
                hyperLinks.push({ title: title, url: link.href }); // No URI encoding here
            });

            return {
                pureText: texts.join('\n'),
                images: images,
                hyperLinks: hyperLinks,
            };
        });

        return {
            success: true,
            source: 'puppeteer',
            pureText: result.pureText,
            images: result.images,
            hyperLinks: result.hyperLinks,
        };
    } catch (error) {
        logger.error(`Puppeteer Error: ${error.message}`);
        return {
            success: false, // Indicate failure, but RESOLVE
            source: 'puppeteer',
            error: { message: error.message },
        };
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                logger.error(`Error closing browser: ${closeError.message}`);
            }
        }
    }
}

async function apiParse(url) {
    try {
        const res = await fetch(`https://magic-html-api.vercel.app/api/extract?url=${url}`, { timeout: 30000 }); // Add Timeout
        if (!res.ok) {
            throw new Error(`API Error: ${res.status} - ${res.statusText}`);
        }
        const data = await res.json();
        const { success, content } = data;

        if (content && success) {
            return {
                success: true,
                source: 'api',
                pureText: content, // Or adapt to your desired format
                images: [],
                hyperLinks: [],
            };
        } else {
            return {
                success: false, // Indicate failure, but RESOLVE
                source: 'api',
                error: { message: 'API returned no content or indicated failure.' },
            };
        }
    } catch (error) {
        logger.error(`API Error: ${error.message}`);
        return {
            success: false, // Indicate failure, but RESOLVE
            source: 'api',
            error: { message: error.message },
        };
    }
}

export default async function parsePage(url) {

    const puppeteerPromise = puppeteerParse(url);
    const apiPromise = apiParse(url);

    try {
        const result = await Promise.race([puppeteerPromise, apiPromise]);

        if (result.success) {
            return result; // Return the successful result immediately
        } else {
            // Both resolved, but neither successful. Wait For all
            const allResults = await Promise.all([puppeteerPromise, apiPromise]);
            const successfulResult = allResults.find(r => r.success);
            if (successfulResult) {
                return successfulResult;
            }
            // Both Promises resolved unsuccessfully
            return {
               success: false,
               source: "all_failed",
               error: { message: "Both Puppeteer and API methods failed to retrieve data." },
            }
        }
    } catch (error) {
        // This *should* not happen, because the promises are designed to always resolve.
        logger.error(`Unexpected error: ${error.message}`);
        return {
            success: false,
            source: 'unexpected_error',
            error: { message: 'An unexpected error occurred during the scraping process.' },
        };
    }
}