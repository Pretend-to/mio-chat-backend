import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import logger from '../../../../utils/logger.js'
import { findTarget } from '../lib/matcher.js'

export default class insert extends MioFunction {
  constructor() {
    super({
      name: 'insert',
      description:
        'Insert content before or after a specific anchor text in a file. Supports 4-level layered matching for the anchor (exact → trimmed → ws-normalized → fuzzy).',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Absolute path or relative path to the file.',
          },
          anchor: {
            type: 'string',
            description:
              'The text to search for as a reference point. Uses 4-level matching (exact → trimmed → ws-normalized → fuzzy).',
          },
          content: {
            type: 'string',
            description: 'The text to insert.',
          },
          position: {
            type: 'string',
            enum: ['before', 'after'],
            description: 'Where to insert relative to the anchor.',
            default: 'after',
          },
        },
        required: ['filePath', 'anchor', 'content'],
      },
      adminOnly: true,
    })
    this.func = this._execute
  }

  async _execute(e) {
    const { filePath, anchor, content, position = 'after' } = e.params
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath)

    if (!fs.existsSync(absolutePath)) {
      return { error: `File not found: ${filePath}` }
    }

    try {
      const fileContent = fs.readFileSync(absolutePath, 'utf8')
      const lines = fileContent.split('\n')

      // Use 4-level matcher for anchor
      const match = findTarget(lines, anchor)
      if (!match) {
        return {
          error: `Anchor text not found after trying all 4 levels (exact → trimmed → ws-normalized → fuzzy): "${anchor.slice(0, 60)}..."`,
        }
      }

      // Uniqueness check
      const contentAfter = fileContent.slice(match.index + match.matchedText.length)
      if (contentAfter.indexOf(match.matchedText) !== -1) {
        return {
          error: `Ambiguous anchor: multiple matches found. Please provide more specific anchor text, or use startLine/endLine in replace.`,
        }
      }

      let newContent
      if (position === 'before') {
        newContent =
          fileContent.slice(0, match.index) +
          content +
          fileContent.slice(match.index)
      } else {
        const insertPos = match.index + match.matchedText.length
        newContent =
          fileContent.slice(0, insertPos) +
          content +
          fileContent.slice(insertPos)
      }

      fs.writeFileSync(absolutePath, newContent, 'utf8')
      logger.info(
        `[FileEditor] Inserted content ${position} anchor in ${filePath} (${match.method})`
      )

      return {
        success: true,
        message: `Content inserted successfully ${position} the anchor (${match.method}).`,
        file: filePath,
      }
    } catch (err) {
      return { error: `Operation failed: ${err.message}` }
    }
  }
}
