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
            description:
              'The path to the file to read (absolute or relative to workspace root).',
          },
          startLine: {
            type: 'number',
            description:
              'Starting line number (1-indexed). Supports negative values like Python slices (e.g., -5 = 5 lines from end). Defaults to 1.',
          },
          endLine: {
            type: 'number',
            description:
              'Ending line number (inclusive). Supports negative values. When used without startLine, reads from line 1 to endLine. If not provided in range mode, reads up to 800 lines.',
          },
          keyword: {
            type: 'string',
            description:
              'Search for this keyword and return context around its first occurrence. Returns match count + positions too.',
          },
          contextLines: {
            type: 'number',
            description:
              'When using "keyword", how many lines of context to show before and after. Defaults to 10.',
            default: 10,
          },
          raw: {
            type: 'boolean',
            description:
              'If true, returns the content WITHOUT line number prefixes, suitable for direct use as a "target" in replace operations.',
            default: false,
          },
        },
        required: ['filePath'],
      },
      adminOnly: true,
    })
    this.func = this._execute
  }

  async _execute(e) {
    const {
      filePath,
      startLine,
      endLine,
      keyword,
      contextLines = 10,
      raw = false,
    } = e.params

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath)

    if (!fs.existsSync(absolutePath)) {
      return { error: `File not found at path: ${filePath}` }
    }

    try {
      const stats = fs.statSync(absolutePath)
      if (stats.isDirectory()) {
        return {
          error: `"${filePath}" is a directory. Use a directory listing tool instead.`,
        }
      }

      // Binary detection (first 1024 bytes)
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
          message:
            'This file appears to be a binary file. Content cannot be displayed as text.',
        }
      }

      const content = fs.readFileSync(absolutePath, 'utf8')
      const lines = content.split('\n')
      const totalLines = lines.length

      // ========================  KEYWORD MODE  ========================
      if (keyword) {
        // Find ALL match positions
        const allMatches = []
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(keyword)) {
            allMatches.push(i)
          }
        }

        if (allMatches.length === 0) {
          return {
            success: true,
            file: filePath,
            totalLines,
            content: '',
            keyword: keyword,
            matchCount: 0,
            message: `Keyword "${keyword}" not found in file.`,
          }
        }

        // First match for context display
        const firstMatch = allMatches[0]
        let ctxStart = Math.max(0, firstMatch - contextLines)
        let ctxEnd = Math.min(totalLines, firstMatch + contextLines + 1)

        // If raw mode, display all match lines instead of context
        const displayedLines = lines.slice(ctxStart, ctxEnd)

        const response = {
          success: true,
          file: filePath,
          totalLines,
          size: stats.size,
          keyword: keyword,
          matchCount: allMatches.length,
          matchPositions: allMatches.map((l) => l + 1),
          startLine: ctxStart + 1,
          endLine: ctxEnd,
          content: raw
            ? displayedLines.join('\n')
            : displayedLines
                .map((l, i) => `${ctxStart + i + 1}: ${l}`)
                .join('\n'),
          message: `Found "${keyword}" at line ${firstMatch + 1}${allMatches.length > 1 ? ` (${allMatches.length} total matches at lines: ${allMatches.map(l => l + 1).join(', ')})` : ''}.`,
        }

        if (ctxEnd < totalLines) {
          response.pagination = {
            nextStart: ctxEnd + 1,
            hasMore: true,
            hint: `To read the next part, set startLine to ${ctxEnd + 1}.`,
          }
        }

        return response
      }

      // ========================  RANGE MODE  ========================
      // Resolve startLine and endLine with negative index support
      let resolvedStart, resolvedEnd

      if (startLine !== undefined && endLine !== undefined) {
        // Both provided
        resolvedStart = startLine < 1 ? totalLines + startLine + 1 : startLine
        resolvedEnd = endLine < 1 ? totalLines + endLine + 1 : endLine
      } else if (startLine !== undefined) {
        // Only startLine provided — default to +800
        resolvedStart = startLine < 1 ? totalLines + startLine + 1 : startLine
        resolvedEnd = Math.min(totalLines, resolvedStart + 800)
      } else if (endLine !== undefined) {
        // Only endLine provided — read from line 1
        resolvedStart = 1
        resolvedEnd = endLine < 1 ? totalLines + endLine + 1 : endLine
      } else {
        // Neither — default
        resolvedStart = 1
        resolvedEnd = Math.min(totalLines, 800)
      }

      // Clamp to valid range
      resolvedStart = Math.max(1, Math.min(resolvedStart, totalLines))
      resolvedEnd = Math.max(1, Math.min(resolvedEnd, totalLines))

      if (resolvedStart > resolvedEnd) {
        // Swap if invalid
        ;[resolvedStart, resolvedEnd] = [resolvedEnd, resolvedStart]
      }

      const displayedLines = lines.slice(resolvedStart - 1, resolvedEnd)

      const response = {
        success: true,
        file: filePath,
        totalLines,
        size: stats.size,
        startLine: resolvedStart,
        endLine: resolvedEnd,
        content: raw
          ? displayedLines.join('\n')
          : displayedLines
              .map((l, i) => `${resolvedStart + i}: ${l}`)
              .join('\n'),
      }

      // Hint for raw content usage
      if (raw && displayedLines.length > 0) {
        response.rawHint =
          'This content is returned without line numbers — suitable for use as a "target" in replace operations.'
      }

      if (resolvedEnd < totalLines) {
        response.pagination = {
          nextStart: resolvedEnd + 1,
          hasMore: true,
          hint: `To read the next part, set startLine to ${resolvedEnd + 1}.`,
        }
      }

      return response
    } catch (err) {
      return { error: `System error while reading file: ${err.message}` }
    }
  }
}
