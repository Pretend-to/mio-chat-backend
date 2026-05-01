import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import logger from '../../../../utils/logger.js'

export default class writeFile extends MioFunction {
  constructor() {
    super({
      name: 'writeFile',
      description: 'Create a new file or overwrite an existing one with new content. Automatically creates parent directories if they do not exist.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Absolute path or relative path to the file.',
          },
          content: {
            type: 'string',
            description: 'The full content to write to the file.',
          },
          overwrite: {
            type: 'boolean',
            description: 'Whether to overwrite the file if it already exists. Defaults to true.',
            default: true
          }
        },
        required: ['filePath', 'content'],
      },
      adminOnly: true
    })
    this.func = this._execute
  }

  async _execute(e) {
    const { filePath, content, overwrite = true } = e.params
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

    if (fs.existsSync(absolutePath) && !overwrite) {
      return { error: `File already exists and overwrite is set to false: ${filePath}` }
    }

    try {
      const dir = path.dirname(absolutePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(absolutePath, content, 'utf8')

      logger.info(`[FileEditor] Successfully wrote file: ${filePath}`)
      return { 
        success: true, 
        message: 'File written successfully.',
        file: filePath
      }
    } catch (err) {
      return { error: `Operation failed: ${err.message}` }
    }
  }
}
