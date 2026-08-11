import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'

export default class grep extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: 'Search for regular expression patterns in a text file and return matching lines with their line numbers.',
      name: 'grep',
      parameters: {
        properties: {
          caseSensitive: {
            default: false,
            description: 'If true, performs a case-sensitive match. Defaults to false (case-insensitive).',
            type: 'boolean',
          },
          filePath: {
            description: 'The path to the file to search (absolute or relative to workspace root).',
            type: 'string',
          },
          pattern: {
            description: 'The regular expression pattern to search for (e.g., "model SystemSetting|SystemSetting").',
            type: 'string',
          },
        },
        required: ['filePath', 'pattern'],
        type: 'object',
      },
    })
    this.func = this._execute
  }

  getDisplayName(params) {
    const { filePath, pattern } = params
    const fileName = filePath ? path.basename(filePath) : ''
    return `Searching for "${pattern}" in ${fileName || 'file'}`
  }

  async _execute(e) {
    const { filePath, pattern, caseSensitive = false } = e.params

    if (!filePath) {
      return { error: 'Missing required parameter "filePath".' }
    }
    if (!pattern) {
      return { error: 'Missing required parameter "pattern".' }
    }

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
          error: `"${filePath}" is a directory. Please provide a file path.`,
        }
      }

      // Read file content
      const content = fs.readFileSync(absolutePath, 'utf8')
      const lines = content.split('\n')
      const totalLines = lines.length

      // Build RegExp
      const flags = caseSensitive ? '' : 'i'
      const regex = new RegExp(pattern, flags)

      const matches = []
      for (let i = 0; i < totalLines; i++) {
        if (regex.test(lines[i])) {
          matches.push({
            lineContent: lines[i],
            lineNumber: i + 1,
          })
        }
      }

      return {
        file: filePath,
        matchCount: matches.length,
        matches: matches,
        pattern: pattern,
        success: true,
      }
    } catch (error) {
      return { error: `System error while grepping file: ${error.message}` }
    }
  }
}
