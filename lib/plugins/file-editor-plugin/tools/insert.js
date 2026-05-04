import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import logger from '../../../../utils/logger.js'

export default class insert extends MioFunction {
  constructor() {
    super({
      name: 'insert',
      description: 'Insert content before or after a specific anchor text in a file.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Absolute path or relative path to the file.',
          },
          anchor: {
            type: 'string',
            description: 'The exact text to search for as a reference point.',
          },
          content: {
            type: 'string',
            description: 'The text to insert.',
          },
          position: {
            type: 'string',
            enum: ['before', 'after'],
            description: 'Where to insert relative to the anchor.',
            default: 'after'
          }
        },
        required: ['filePath', 'anchor', 'content'],
      },
      adminOnly: true
    })
    this.func = this._execute
  }

  async _execute(e) {
    const { filePath, anchor, content, position = 'after' } = e.params
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

    if (!fs.existsSync(absolutePath)) {
      return { error: `File not found: ${filePath}` }
    }

    try {
      let fileContent = fs.readFileSync(absolutePath, 'utf8')
      const index = fileContent.indexOf(anchor)

      if (index === -1) {
        return { error: `Anchor text not found: "${anchor}"` }
      }

      if (fileContent.indexOf(anchor, index + 1) !== -1) {
        return { error: `Ambiguous anchor: multiple matches found. Please provide a more specific anchor.` }
      }

      let newContent
      if (position === 'before') {
        newContent = fileContent.slice(0, index) + content + fileContent.slice(index)
      } else {
        const insertPos = index + anchor.length
        newContent = fileContent.slice(0, insertPos) + content + fileContent.slice(insertPos)
      }

      fs.writeFileSync(absolutePath, newContent, 'utf8')
      logger.info(`[FileEditor] Successfully inserted content ${position} anchor in ${filePath}`)
      
      return { 
        success: true, 
        message: `Content inserted successfully ${position} the anchor.`,
        file: filePath
      }
    } catch (err) {
      return { error: `Operation failed: ${err.message}` }
    }
  }
}
