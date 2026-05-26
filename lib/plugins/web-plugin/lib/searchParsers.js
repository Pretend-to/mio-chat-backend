/**
 * Client-side search result parsers.
 * These functions are executed directly within the browser context using Puppeteer's page.evaluate().
 */
export const searchParsers = {
  duckduckgo: () => {
    const results = []
    const items = document.querySelectorAll('.result')
    items.forEach(item => {
      const titleEl = item.querySelector('.result__a')
      const snippetEl = item.querySelector('.result__snippet')
      if (titleEl) {
        let rawLink = titleEl.getAttribute('href') || ''
        
        // Clean DuckDuckGo redirection wrapper (e.g. //duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com)
        if (rawLink.includes('uddg=')) {
          try {
            // Use URL parser inside page evaluate
            const urlObj = new URL(rawLink, window.location.origin)
            const uddg = urlObj.searchParams.get('uddg')
            if (uddg) {
              rawLink = decodeURIComponent(uddg)
            }
          } catch (e) {
            // Ignore and fallback
          }
        } else if (rawLink.startsWith('//')) {
          rawLink = 'https:' + rawLink
        }

        results.push({
          title: titleEl.innerText.trim(),
          link: rawLink,
          snippet: snippetEl ? snippetEl.innerText.trim() : ''
        })
      }
    })
    return results
  },
  
  bing: () => {
    const results = []
    const items = document.querySelectorAll('li.b_algo')
    items.forEach(item => {
      const titleEl = item.querySelector('h2 a')
      const snippetEl = item.querySelector('.b_caption p') || item.querySelector('.b_snippet') || item.querySelector('.b_algoSlug')
      if (titleEl) {
        results.push({
          title: titleEl.innerText.trim(),
          link: titleEl.getAttribute('href'),
          snippet: snippetEl ? snippetEl.innerText.trim() : ''
        })
      }
    })
    return results
  },

  baidu: () => {
    const results = []
    const items = document.querySelectorAll('.result.c-container')
    items.forEach(item => {
      const titleEl = item.querySelector('h3 a')
      const snippetEl = item.querySelector('.c-abstract') || item.querySelector('.content-left_YtN3L') || item.querySelector('.c-span18')
      if (titleEl) {
        results.push({
          title: titleEl.innerText.trim(),
          link: titleEl.getAttribute('href'),
          snippet: snippetEl ? snippetEl.innerText.trim() : ''
        })
      }
    })
    return results
  },

  google: () => {
    const results = []
    const items = document.querySelectorAll('div.g')
    items.forEach(item => {
      const titleEl = item.querySelector('h3')
      const linkEl = item.querySelector('a')
      const snippetEl = item.querySelector('.VwiC3b') || item.querySelector('.aCOpbc') || item.querySelector('.yDfsK')
      if (titleEl && linkEl) {
        let rawLink = linkEl.getAttribute('href') || ''
        
        // Clean Google redirection wrapper (e.g. /url?q=https%3A%2F%2Fexample.com)
        if (rawLink.startsWith('/url?')) {
          try {
            const urlObj = new URL(rawLink, 'https://www.google.com')
            const q = urlObj.searchParams.get('q')
            if (q) {
              rawLink = decodeURIComponent(q)
            }
          } catch (e) {
            // Ignore
          }
        }

        results.push({
          title: titleEl.innerText.trim(),
          link: rawLink,
          snippet: snippetEl ? snippetEl.innerText.trim() : ''
        })
      }
    })
    return results
  }
}
