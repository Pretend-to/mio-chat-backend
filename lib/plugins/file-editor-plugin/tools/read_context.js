import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'

export default class readContext extends MioFunction {
  constructor() {
    super({
      name: 'readContext',
      description:
        'Read a specific part of a file with surrounding context. Useful for large files to avoid filling context window.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Absolute path or relative path to the file.',
          },
          keyword: {
            type: 'string',
            description:
              'Optional: Search for this string and center the context around the first match.',
          },
          line: {
            type: 'number',
            description:
              'Optional: Center the context around this line number (1-indexed). Use this if you already know the line number.',
          },
          contextLines: {
            type: 'number',
            description:
              'Number of lines to show before and after the target. Default: 10.',
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
    const { filePath, keyword, line, contextLines = 10 } = e.params
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath)

    if (!fs.existsSync(absolutePath)) {
      return { error: `File not found: ${filePath}` }
    }

    try {
      const content = fs.readFileSync(absolutePath, 'utf8')
      const lines = content.split('\n')
      let targetLine = -1

      if (keyword) {
        targetLine = lines.findIndex((l) => l.includes(keyword)) + 1
        if (targetLine === 0) {
          return { error: `Keyword "${keyword}" not found in ${filePath}` }
        }
      } else if (line) {
        targetLine = line
      } else {
        return { error: 'You must provide either a keyword or a line number.' }
      }

      const start = Math.max(0, targetLine - 1 - contextLines)
      const end = Math.min(lines.length, targetLine + contextLines)

      const context = lines
        .slice(start, end)
        .map((l, i) => `${start + i + 1}: ${l}`)
        .join('\n')

      return {
        success: true,
        file: filePath,
        targetLine,
        totalLines: lines.length,
        context: context,
        range: `${start + 1}-${end}`,
      }
    } catch (err) {
      return { error: `Read failed: ${err.message}` }
    }
  }
}
