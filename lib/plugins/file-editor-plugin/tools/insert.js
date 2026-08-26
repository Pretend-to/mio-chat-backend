import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import { findTarget } from '../lib/matcher.js'
import { lintFile } from '../lib/linter.js'

export default class insert extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description:
        'Insert content before or after a specific anchor text in a file. Supports 4-level layered matching for the anchor (exact → trimmed → ws-normalized → fuzzy).',
      name: 'insert',
      parameters: {
        properties: {
          anchor: {
            description:
              'The text to search for as a reference point. Uses 4-level matching (exact → trimmed → ws-normalized → fuzzy).',
            type: 'string',
          },
          content: {
            description: 'The text to insert.',
            type: 'string',
          },
          filePath: {
            description: 'Absolute path or relative path to the file.',
            type: 'string',
          },
          position: {
            default: 'after',
            description: 'Where to insert relative to the anchor.',
            enum: ['before', 'after'],
            type: 'string',
          },
        },
        required: ['filePath', 'anchor', 'content'],
        type: 'object',
      },
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
      let fileContent = fs.readFileSync(absolutePath, 'utf8')
      const hasWindowsEndings = fileContent.includes('\r\n')
      if (hasWindowsEndings) {
        fileContent = fileContent.replace(/\r\n/g, '\n')
      }

      const lines = fileContent.split('\n')
      const normalizedAnchor = anchor.replace(/\r\n/g, '\n')

      // Use 4-level matcher for anchor
      const result = findTarget(lines, normalizedAnchor, fileContent)
      const match = result?.match
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

      const normalizedContent = content.replace(/\r\n/g, '\n')
      let newContent
      if (position === 'before') {
        newContent =
          fileContent.slice(0, match.index) +
          normalizedContent +
          fileContent.slice(match.index)
      } else {
        const insertPos = match.index + match.matchedText.length
        newContent =
          fileContent.slice(0, insertPos) +
          normalizedContent +
          fileContent.slice(insertPos)
      }

      if (hasWindowsEndings) {
        newContent = newContent.replace(/\n/g, '\r\n')
      }

      fs.writeFileSync(absolutePath, newContent, 'utf8')
      const lintResults = await lintFile(absolutePath)
      return {
        file: filePath,
        lint: lintResults && lintResults.length > 0 ? lintResults : undefined,
        message: `Content inserted successfully ${position} the anchor (${match.method}).`,
        success: true
      }
    } catch (error) {
      return { error: `Operation failed: ${error.message}` }
    }
  }
}
