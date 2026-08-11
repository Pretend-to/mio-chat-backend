import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import { lintFile } from '../lib/linter.js'

export default class append extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description:
        'Append content to the end of an existing file. Automatically ensures the appended content starts on a new line.',
      name: 'append',
      parameters: {
        properties: {
          content: {
            description: 'The content to append.',
            type: 'string',
          },
          filePath: {
            description: 'Absolute path or relative path to the file.',
            type: 'string',
          },
        },
        required: ['filePath', 'content'],
        type: 'object',
      },
    })
    this.func = this._execute
  }
  getDisplayName(params) {
    const { filePath } = params
    const fileName = filePath ? path.basename(filePath) : ''
    return `Appending to ${fileName || 'file'}`
  }
  async _execute(e) {
    const { filePath, content } = e.params
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath)

    if (!fs.existsSync(absolutePath)) {
      return { error: `File not found: ${filePath}` }
    }

    try {
      // Read existing content to check trailing newline
      const existing = fs.readFileSync(absolutePath, 'utf8')
      const needsNewline = existing.length > 0 && !existing.endsWith('\n')

      const finalContent = needsNewline ? `\n${  content}` : content
      fs.appendFileSync(absolutePath, finalContent, 'utf8')

      const lintResults = await lintFile(absolutePath)
      return {
        file: filePath,
        lint: lintResults && lintResults.length > 0 ? lintResults : undefined,
        message: 'Content appended successfully.',
        success: true
      }
    } catch (error) {
      return { error: `Operation failed: ${error.message}` }
    }
  }
}
