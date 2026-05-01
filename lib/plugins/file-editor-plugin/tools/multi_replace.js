import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import logger from '../../../../utils/logger.js'

export default class multiReplace extends MioFunction {
  constructor() {
    super({
      name: 'multiReplace',
      description: 'Perform multiple non-overlapping replacements in a single file. Each replacement must be uniquely identifiable.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Absolute path or relative path to the file.',
          },
          replacements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'The exact original text to find.' },
                replacement: { type: 'string', description: 'The new text to insert.' }
              },
              required: ['target', 'replacement']
            },
            description: 'A list of replacement pairs.',
          }
        },
        required: ['filePath', 'replacements'],
      },
      adminOnly: true
    })
    this.func = this._execute
  }

  async _execute(e) {
    const { filePath, replacements } = e.params
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

    if (!fs.existsSync(absolutePath)) {
      return { error: `File not found: ${filePath}` }
    }

    try {
      let content = fs.readFileSync(absolutePath, 'utf8')
      const matches = []

      // Step 1: Validate all targets exist and are unique
      for (const item of replacements) {
        const index = content.indexOf(item.target)
        if (index === -1) {
          return { error: `Target not found: "${item.target.slice(0, 50)}..."` }
        }
        if (content.indexOf(item.target, index + 1) !== -1) {
          return { error: `Target is ambiguous (multiple matches found): "${item.target.slice(0, 50)}..."` }
        }
        matches.push({ index, target: item.target, replacement: item.replacement })
      }

      // Step 2: Check for overlaps
      matches.sort((a, b) => a.index - b.index)
      for (let i = 0; i < matches.length - 1; i++) {
        if (matches[i].index + matches[i].target.length > matches[i + 1].index) {
          return { error: 'Replacements overlap. Please ensure each target is distinct and non-overlapping.' }
        }
      }

      // Step 3: Apply replacements from back to front to preserve indices
      for (let i = matches.length - 1; i >= 0; i--) {
        const { index, target, replacement } = matches[i]
        content = content.slice(0, index) + replacement + content.slice(index + target.length)
      }

      fs.writeFileSync(absolutePath, content, 'utf8')
      logger.info(`[FileEditor] Successfully applied ${matches.length} replacements in ${filePath}`)
      
      return { 
        success: true, 
        message: `Applied ${matches.length} replacements successfully.`,
        file: filePath
      }
    } catch (err) {
      return { error: `Operation failed: ${err.message}` }
    }
  }
}
