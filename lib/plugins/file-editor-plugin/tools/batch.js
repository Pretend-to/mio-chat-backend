import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import { findTarget } from '../lib/matcher.js'
import { lintFile } from '../lib/linter.js'

export default class batch extends MioFunction {
  constructor() {
    super({
      name: 'batch',
      description:
        'Perform multiple non-overlapping replacements in a single file. Uses 4-level layered matching (exact → trimmed → ws-normalized → fuzzy) for each replacement target.',
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
                target: {
                  type: 'string',
                  description: 'The exact original text to find.',
                },
                replacement: {
                  type: 'string',
                  description: 'The new text to insert.',
                },
              },
              required: ['target', 'replacement'],
            },
            description: 'A list of replacement pairs.',
          },
        },
        required: ['filePath', 'replacements'],
      },
      adminOnly: true,
    })
    this.func = this._execute
  }

  async _execute(e) {
    const { filePath, replacements } = e.params
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath)

    if (!fs.existsSync(absolutePath)) {
      return { error: `File not found: ${filePath}` }
    }

    try {
      let content = fs.readFileSync(absolutePath, 'utf8')
      const hasWindowsEndings = content.includes('\r\n')
      if (hasWindowsEndings) {
        content = content.replace(/\r\n/g, '\n')
      }

      const lines = content.split('\n')
      const matches = []

      // Step 1: Find each target using layered matching
      for (const item of replacements) {
        // Ensure target also uses same endings
        const normalizedTarget = item.target.replace(/\r\n/g, '\n')
        const result = findTarget(lines, normalizedTarget, content)
        const match = result?.match
        if (!match) {
          const methodHint = '(tried all 4 levels: exact → trimmed → ws-normalized → fuzzy)'
          return {
            error: `Replacement #${matches.length + 1}: Target not found ${methodHint}: "${item.target.slice(0, 60)}..."`,
          }
        }

        // Uniqueness check within content
        const laterIdx = content.indexOf(match.matchedText, match.index + 1)
        if (laterIdx !== -1) {
          return {
            error: `Replacement #${matches.length + 1}: Multiple matches found for "${item.target.slice(0, 60)}...". Use startLine/endLine in replace instead.`,
          }
        }

        matches.push({
          index: match.index,
          target: match.matchedText,
          replacement: item.replacement.replace(/\r\n/g, '\n'),
          method: match.method,
        })
      }

      // Step 2: Sort by position
      matches.sort((a, b) => a.index - b.index)

      // Step 3: Check for overlaps
      for (let i = 0; i < matches.length - 1; i++) {
        if (
          matches[i].index + matches[i].target.length >
          matches[i + 1].index
        ) {
          return {
            error: `Replacements #${i + 1} and #${i + 2} overlap after matching. Please ensure each target is distinct and non-overlapping.`,
          }
        }
      }

      // Step 4: Apply from back to front
      for (let i = matches.length - 1; i >= 0; i--) {
        const { index, target, replacement } = matches[i]
        content =
          content.slice(0, index) +
          replacement +
          content.slice(index + target.length)
      }

      if (hasWindowsEndings) {
        content = content.replace(/\n/g, '\r\n')
      }
      fs.writeFileSync(absolutePath, content, 'utf8')
      const methods = matches.map((m) => m.method).join(', ')
      const lintResults = await lintFile(absolutePath)
      return {
        success: true,
        message: `Applied ${matches.length} replacements successfully [${methods}].`,
        file: filePath,
        lint: lintResults && lintResults.length > 0 ? lintResults : undefined
      }
    } catch (err) {
      return { error: `Operation failed: ${err.message}` }
    }
  }
}
