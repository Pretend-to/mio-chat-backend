import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import { lintFile } from '../lib/linter.js'

export default class write extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: 'Create a new file or overwrite an existing one with new content. Automatically creates parent directories if they do not exist.',
      name: 'write',
      parameters: {
        properties: {
          content: {
            description: 'The full content to write to the file.',
            type: 'string',
          },
          filePath: {
            description: 'Absolute path or relative path to the file.',
            type: 'string',
          },
          overwrite: {
            default: true,
            description: 'Whether to overwrite the file if it already exists. Defaults to true.',
            type: 'boolean'
          }
        },
        required: ['filePath', 'content'],
        type: 'object',
      }
    })
    this.func = this._execute
  }
  getDisplayName(params) {
    const { filePath } = params
    const fileName = filePath ? path.basename(filePath) : ''
    return `Writing to ${fileName || 'file'}`
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

      const lintResults = await lintFile(absolutePath)

      return { 
        file: filePath, 
        lint: lintResults && lintResults.length > 0 ? lintResults : undefined, 
        message: 'File written successfully.', 
        success: true
      }
    } catch (error) {
      return { error: `Operation failed: ${error.message}` }
    }
  }
}
