import { MioFunction } from '../../../function.js'
import { parseFileWithUrl } from '../../../../utils/parseFile.js'
import path from 'path'

const DOCUMENT_EXTENSIONS = new Set([
  '.pdf', '.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt',
  '.odt', '.ods', '.odp', '.csv', '.tsv', '.json', '.xml',
  '.yaml', '.yml', '.txt', '.log', '.md', '.markdown'
])

export default class parse extends MioFunction {
  constructor() {
    super({
      adminOnly: false,
      description:
        'Extract text and structured content from files (PDF, Word, Excel, Markdown, TXT) or web URLs (via Jina Reader or WebPlugin browser extractor).',
      name: 'parse',
      parameters: {
        properties: {
          fileUrls: {
            description:
              'The URLs (web pages or document links) or local file paths (e.g. file:///path/to/doc.pdf) to parse. Can be a single URL string or an array of URLs.',
            oneOf: [
              { type: 'string' },
              {
                items: { type: 'string' },
                type: 'array',
              }
            ],
          },
          urls: {
            description: 'Alias for fileUrls. Single URL string or list of URLs to parse.',
            oneOf: [
              { type: 'string' },
              {
                items: { type: 'string' },
                type: 'array',
              }
            ],
          },
          engine: {
            default: 'auto',
            description:
              'Parsing engine to use for web URLs: "auto" (auto select best method), "jina" (uses r.jina.ai clean markdown reader), "exact" (uses WebPlugin browser DOM extractor), or "file" (force document parser).',
            enum: ['auto', 'jina', 'exact', 'file'],
            type: 'string',
          },
          maxChars: {
            default: 20000,
            description: 'Maximum characters of text to return per file/URL (default: 20000).',
            type: 'integer',
          }
        },
        type: 'object',
      },
    })
    this.func = this.parseContent
  }

  async parseContent(e) {
    const { fileUrls, urls, engine = 'auto', maxChars = 20000 } = e.params || {}
    const rawTarget = urls || fileUrls

    if (!rawTarget) {
      return { error: '请提供需要解析的文件或网页 URL (fileUrls / urls)' }
    }

    const targetList = Array.isArray(rawTarget) ? rawTarget : [rawTarget]
    const result = []

    const promises = targetList.map(async (urlItem) => {
      if (!urlItem || typeof urlItem !== 'string') return
      const targetUrl = urlItem.trim()
      try {
        const content = await this._dispatchParse(targetUrl, engine, maxChars)
        result.push({
          content,
          url: targetUrl,
          fileUrl: targetUrl,
          success: true
        })
      } catch (error) {
        result.push({
          error: error.message,
          url: targetUrl,
          fileUrl: targetUrl,
          success: false
        })
      }
    })

    await Promise.allSettled(promises)
    return { result, status: 'success' }
  }

  async _dispatchParse(targetUrl, engine, maxChars) {
    const isDoc = this._isDocument(targetUrl)

    if (engine === 'file' || isDoc || targetUrl.startsWith('file://')) {
      const { content, error } = await parseFileWithUrl(targetUrl)
      if (error) throw new Error(error)
      return this._truncate(content, maxChars)
    }

    if (engine === 'jina') {
      return await this._parseWithJina(targetUrl, maxChars)
    }

    if (engine === 'exact') {
      return await this._parseWithExact(targetUrl, maxChars)
    }

    // engine === 'auto' (默认策略：Jina 优先 -> 失败降级到 WebPlugin Exact)
    try {
      return await this._parseWithJina(targetUrl, maxChars)
    } catch (jinaErr) {
      logger.warn(`[ParseTool] Jina parse failed for ${targetUrl} (${jinaErr.message}), falling back to exact extractor...`)
      return await this._parseWithExact(targetUrl, maxChars)
    }
  }

  async _parseWithJina(targetUrl, maxChars) {
    const jinaUrl = `https://r.jina.ai/${targetUrl}`
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/markdown',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(20000)
    })

    if (!response.ok) {
      throw new Error(`r.jina.ai HTTP ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()
    if (!text || text.trim().length === 0) {
      throw new Error('r.jina.ai 返回空内容')
    }

    return this._truncate(text, maxChars)
  }

  async _parseWithExact(targetUrl, maxChars) {
    try {
      const { default: puppPaser } = await import('../../web-plugin/lib/puppPaser.js')
      const parser = new puppPaser(targetUrl)
      const parseResult = await parser.parse()

      if (parseResult.success) {
        const title = parseResult.title ? `# ${parseResult.title}\n\n` : ''
        const bodyText = parseResult.pureText || ''
        const fullContent = `${title}${bodyText}`
        return this._truncate(fullContent, maxChars)
      } else {
        throw new Error(parseResult.error?.message || 'Puppeteer 提取页面内容失败')
      }
    } catch (err) {
      // 若无浏览器环境，尝试标准 HTTP 文本提取
      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const html = await res.text()
      const textOnly = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      return this._truncate(textOnly, maxChars)
    }
  }

  _isDocument(urlStr) {
    try {
      const parsed = new URL(urlStr)
      const ext = path.extname(parsed.pathname).toLowerCase()
      return DOCUMENT_EXTENSIONS.has(ext)
    } catch {
      const ext = path.extname(urlStr).toLowerCase()
      return DOCUMENT_EXTENSIONS.has(ext)
    }
  }

  _truncate(str, maxChars) {
    if (!str) return ''
    if (str.length <= maxChars) return str
    return `${str.substring(0, maxChars)}\n\n... (内容已截断，达到最大字符数限制 ${maxChars})`
  }
}
