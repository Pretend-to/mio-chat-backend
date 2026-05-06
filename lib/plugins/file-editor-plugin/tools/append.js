import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import logger from '../../../../utils/logger.js'

export default class append extends MioFunction {
  constructor() {
    super({
      name: 'append',
      description:
        'Append content to the end of an existing file. Automatically ensures the appended content starts on a new line.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Absolute path or relative path to the file.',
          },
          content: {
            type: 'string',
            description: 'The content to append.',
          },
        },
        required: ['filePath', 'content'],
      },
      adminOnly: true,
    })
    this.func = this._execute
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

      const finalContent = needsNewline ? '\n' + content : content
      fs.appendFileSync(absolutePath, finalContent, 'utf8')

      logger.info(`[FileEditor] Appended content to: ${filePath}`)
      return {
        success: true,
        message: 'Content appended successfully.',
        file: filePath,
      }
    } catch (err) {
      return { error: `Operation failed: ${err.message}` }
    }
  }
}
