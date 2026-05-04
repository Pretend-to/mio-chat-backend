import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'

export default class read extends MioFunction {
  constructor() {
    super({
      name: 'read',
      description:
        'Read the content of a text file. Supports reading specific line ranges, searching for keywords, or reading the first few hundred lines. Optimized for large files.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'The path to the file to read (absolute or relative to workspace root).',
          },
          startLine: {
            type: 'number',
            description: 'The starting line number to read (1-indexed). Defaults to 1.',
            default: 1,
          },
          endLine: {
            type: 'number',
            description: 'The ending line number to read (inclusive). If not provided, it reads up to 800 lines from startLine.',
          },
          keyword: {
            type: 'string',
            description: 'If provided, the tool will search for this keyword and return context around its first occurrence.',
          },
          contextLines: {
            type: 'number',
            description: 'When using "keyword", how many lines of context to show before and after. Defaults to 10.',
            default: 10,
          },
        },
        required: ['filePath'],
      },
      adminOnly: true,
    })
    this.func = this._execute
  }

  async _execute(e) {
    const { filePath, startLine = 1, endLine, keyword, contextLines = 10 } = e.params
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath)

    if (!fs.existsSync(absolutePath)) {
      return { error: `File not found at path: ${filePath}` }
    }

    try {
      const stats = fs.statSync(absolutePath)
      if (stats.isDirectory()) {
        return { error: `"${filePath}" is a directory. Use a directory listing tool instead.` }
      }

      // Check if file is likely binary (first 1024 bytes check)
      const buffer = Buffer.alloc(1024)
      const fd = fs.openSync(absolutePath, 'r')
      const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0)
      fs.closeSync(fd)
      
      let isBinary = false
      for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0) {
          isBinary = true
          break
        }
      }

      if (isBinary) {
        return {
          success: true,
          file: filePath,
          size: stats.size,
          type: 'binary',
          message: 'This file appears to be a binary file. Content cannot be displayed as text.'
        }
      }

      const content = fs.readFileSync(absolutePath, 'utf8')
      const lines = content.split('\n')
      const totalLines = lines.length
      
      let finalStart = 0
      let finalEnd = 0
      let message = ''

      if (keyword) {
        const foundIndex = lines.findIndex(l => l.includes(keyword))
        if (foundIndex === -1) {
          return { error: `Keyword "${keyword}" not found in file.` }
        }
        finalStart = Math.max(0, foundIndex - contextLines)
        finalEnd = Math.min(totalLines, foundIndex + contextLines + 1)
        message = `Found keyword "${keyword}" at line ${foundIndex + 1}.`
      } else {
        // Range based reading
        finalStart = Math.max(0, startLine - 1)
        if (endLine) {
          finalEnd = Math.min(totalLines, endLine)
        } else {
          // Default to 800 lines max to prevent token overflow
          finalEnd = Math.min(totalLines, finalStart + 800)
        }
      }

      const displayedLines = lines.slice(finalStart, finalEnd)
      const formattedContent = displayedLines
        .map((l, i) => `${finalStart + i + 1}: ${l}`)
        .join('\n')

      const response = {
        success: true,
        file: filePath,
        totalLines,
        size: stats.size,
        startLine: finalStart + 1,
        endLine: finalEnd,
        content: formattedContent,
      }

      if (message) response.message = message
      
      if (finalEnd < totalLines) {
        response.pagination = {
          nextStart: finalEnd + 1,
          hasMore: true,
          hint: `To read the next part, set startLine to ${finalEnd + 1}.`
        }
      }

      return response
    } catch (err) {
      return { error: `System error while reading file: ${err.message}` }
    }
  }
}
