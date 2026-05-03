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
      let start, end, isDefault = false

      if (keyword) {
        targetLine = lines.findIndex((l) => l.includes(keyword)) + 1
        if (targetLine === 0) {
          return { error: `Keyword "${keyword}" not found in ${filePath}` }
        }
        start = Math.max(0, targetLine - 1 - contextLines)
        end = Math.min(lines.length, targetLine + contextLines)
      } else if (line) {
        targetLine = line
        start = Math.max(0, targetLine - 1 - contextLines)
        end = Math.min(lines.length, targetLine + contextLines)
      } else {
        // 默认行为：读取前 500 行
        isDefault = true
        start = 0
        end = Math.min(lines.length, 500)
      }

      const context = lines
        .slice(start, end)
        .map((l, i) => `${start + i + 1}: ${l}`)
        .join('\n')

      const result = {
        success: true,
        file: filePath,
        totalLines: lines.length,
        context: context,
        range: `${start + 1}-${end}`,
      }

      if (!isDefault) result.targetLine = targetLine
      if (end < lines.length) {
        result.hint = `NOTICE: The file has ${lines.length} lines in total. Only lines ${start + 1} to ${end} are displayed above. To read more, use the 'line' parameter (e.g., set line to ${end + 250}).`
      }

      return result
    } catch (err) {
      return { error: `Read failed: ${err.message}` }
    }
  }
}
