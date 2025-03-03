export default class APIParser {
  constructor(targetUrl, apiConfig) {
    this.baseUrl = apiConfig.baseUrl
    this.path = apiConfig.path
    this.query = apiConfig.query
    this.targetUrl = targetUrl
  }
  
  get url() {
    const url = new URL(this.baseUrl)
    url.pathname = this.path
  
    // Replace {url} in query parameters
    const finalQuery = JSON.parse(JSON.stringify(this.query).replace(/\{url\}/g, this.targetUrl))  // Use regex for global replace
  
    url.search = new URLSearchParams(finalQuery).toString()
    logger.debug(`API URL: ${url.toString()}`) // Log URL once
    return url.toString()
  }
  
  async parse() {
    let startTime = Date.now()
    let apiUrl = this.url // Store the generated URL
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds timeout
  
      const res = await fetch(apiUrl, { signal: controller.signal })
      clearTimeout(timeoutId)
  
      if (!res.ok) {
        throw new Error(`API Error: ${res.status} - ${res.statusText} for URL: ${apiUrl}`)
      }
  
      const data = await res.json()
      const { success, content } = data
  
      if (success && content) {
        // Consider validating the 'content' here to ensure it's safe and in the expected format.
        return {
          success: true,
          source: 'api',
          pureText: content,
          images: [],
          hyperLinks: [],
        }
      } else {
        logger.warn(`API returned no content or indicated failure for URL: ${apiUrl}`)
        return {
          success: false,
          source: 'api',
          error: { message: 'API returned no content or indicated failure.' },
        }
      }
    } catch (error) {
      logger.error(`API Error for URL ${apiUrl}: ${error.message}`)  // Include URL in error message
      return {
        success: false,
        source: 'api',
        error: { message: error.message },
      }
    } finally {
      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000
      logger.info(`API parsing of ${apiUrl} completed in ${duration.toFixed(2)}s`)
    }
  }
}