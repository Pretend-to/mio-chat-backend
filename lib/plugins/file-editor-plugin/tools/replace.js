import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import logger from '../../../../utils/logger.js'

export default class replace extends MioFunction {
  constructor() {
    super({
      name: 'replace',
      description: 'Replace a specific block of code in a file. This tool is safer than full file writes. You must provide the EXACT original text to be replaced.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Absolute path or relative path to the file.',
          },
          target: {
            type: 'string',
            description: 'The EXACT original code block you want to replace. Must match character-for-character including indentation.',
          },
          replacement: {
            type: 'string',
            description: 'The new code block to replace the target with.',
          }
        },
        required: ['filePath', 'target', 'replacement'],
      },
      adminOnly: true
    })
    this.func = this._execute
  }

  async _execute(e) {
    const { filePath, target, replacement } = e.params
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

    if (!fs.existsSync(absolutePath)) {
      return { error: `File not found: ${filePath}` }
    }

    try {
      const content = fs.readFileSync(absolutePath, 'utf8')
      
      // Check for exact match
      const index = content.indexOf(target)
      
      if (index === -1) {
        return { 
          error: 'Target block not found in the file. Please ensure you provided the EXACT text including indentation and whitespace.' 
        }
      }

      // Check for multiple matches to avoid ambiguity
      const lastIndex = content.lastIndexOf(target)
      if (index !== lastIndex) {
        return { 
          error: 'Multiple matches found for the target block. Please provide more context (more lines before or after) to uniquely identify the block.' 
        }
      }

      const newContent = content.slice(0, index) + replacement + content.slice(index + target.length)
      fs.writeFileSync(absolutePath, newContent, 'utf8')

      logger.info(`[FileEditor] Successfully replaced a block in ${filePath}`)
      return { 
        success: true, 
        message: 'Block replaced successfully.',
        file: filePath
      }
    } catch (err) {
      return { error: `Operation failed: ${err.message}` }
    }
  }
}
