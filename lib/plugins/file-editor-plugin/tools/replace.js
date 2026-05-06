import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import logger from '../../../../utils/logger.js'
import { findTarget, findClosestBlock } from '../lib/matcher.js'

export default class replace extends MioFunction {
  constructor() {
    super({
      name: 'replace',
      description:
        'Replace a specific block of code in a file. Supports 4-level layered matching (exact → trimmed → whitespace-normalized → fuzzy) with detailed error feedback. Also supports line-number based targeting via startLine/endLine.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Absolute path or relative path to the file.',
          },
          target: {
            type: 'string',
            description:
              'The original code block to replace. Used for content-based matching (4-level). Optional if startLine is provided.',
          },
          replacement: {
            type: 'string',
            description: 'The new code block to replace the target with.',
          },
          startLine: {
            type: 'number',
            description:
              'Alternative: 1-indexed start line of the block to replace. When provided, content-based matching is skipped — the exact line range is used.',
          },
          endLine: {
            type: 'number',
            description:
              'Required when startLine is provided. 1-indexed end line (inclusive).',
          },
        },
        required: ['filePath', 'replacement'],
      },
      adminOnly: true,
    })
    this.func = this._execute
  }

  async _execute(e) {
    const { filePath, target, replacement, startLine, endLine } = e.params
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath)

    if (!fs.existsSync(absolutePath)) {
      return { error: `File not found: ${filePath}` }
    }

    try {
      const content = fs.readFileSync(absolutePath, 'utf8')
      const lines = content.split('\n')
      const totalLines = lines.length

      // =====================  Mode 1: Line-number based  =====================
      if (startLine !== undefined) {
        if (endLine === undefined) {
          return { error: 'endLine is required when startLine is provided.' }
        }
        if (startLine < 1 || endLine > totalLines || startLine > endLine) {
          return {
            error: `Invalid line range: ${startLine}-${endLine}. File has ${totalLines} lines (1-indexed).`,
          }
        }

        const before = lines.slice(0, startLine - 1)
        const after = lines.slice(endLine)

        const parts = []
        if (before.length > 0) parts.push(before.join('\n'))
        parts.push(replacement)
        if (after.length > 0) parts.push(after.join('\n'))
        const newContent = parts.join('\n')

        fs.writeFileSync(absolutePath, newContent, 'utf8')
        logger.info(
          `[FileEditor] Replaced lines ${startLine}-${endLine} in ${filePath}`
        )
        return {
          success: true,
          message: `Lines ${startLine}-${endLine} replaced successfully (${endLine - startLine + 1} lines).`,
          file: filePath,
        }
      }

      // =================  Mode 2: Content-based layered matching  =================
      if (!target) {
        return {
          error: 'Either "target" or "startLine" must be provided.',
        }
      }

      const targetLines = target.split('\n')
      const match = findTarget(lines, target)

      if (match) {
        const newContent =
          content.slice(0, match.index) +
          replacement +
          content.slice(match.index + match.matchedText.length)

        fs.writeFileSync(absolutePath, newContent, 'utf8')
        logger.info(
          `[FileEditor] Replaced block in ${filePath} (${match.method})`
        )
        return {
          success: true,
          message: `Block replaced successfully (${match.method}).`,
          file: filePath,
        }
      }

      // =================  All levels failed: detailed error  =================
      return this._buildDetailedError(lines, targetLines, target, filePath)
    } catch (err) {
      return { error: `Operation failed: ${err.message}` }
    }
  }

  _buildDetailedError(lines, targetLines, target, filePath) {
    const totalLines = lines.length
    const targetCharCount = target.length
    const targetLineCount = targetLines.length

    const closest = findClosestBlock(lines, targetLines)
    const { bestScore, bestStart, worstLineIdx, worstFileLine, worstTargetLine } = closest

    const parts = []
    parts.push(
      `Target block not found after trying all 4 match levels (exact → trimmed → whitespace-normalized → fuzzy).`
    )
    parts.push('')
    parts.push(`📄 File: ${filePath}  (${totalLines} lines)`)
    parts.push(`🎯 Target: ${targetLineCount} lines, ${targetCharCount} characters`)
    parts.push('')

    if (bestStart >= 0 && bestScore > 0) {
      const bestEnd = bestStart + targetLines.length - 1

      parts.push(
        `🔍 Best match found at lines ${bestStart + 1}-${bestEnd + 1} (similarity: ${(bestScore * 100).toFixed(0)}%):`
      )
      parts.push('')

      for (let i = 0; i < targetLines.length; i++) {
        const lineNum = bestStart + i + 1
        const fileLine = lines[bestStart + i]
        const tgtLine = targetLines[i]

        if (fileLine === tgtLine) {
          parts.push(`  ✓ L${lineNum}: ${fileLine}`)
        } else {
          const sim = lineSimilarity(fileLine, tgtLine)
          parts.push(`  ── L${lineNum} (${(sim * 100).toFixed(0)}% sim) ──`)
          parts.push(`  📄  ${fileLine}`)
          parts.push(`  🎯  ${tgtLine}`)
        }
      }

      if (worstLineIdx >= 0) {
        parts.push('')
        parts.push(`💡 Biggest mismatch on line ${bestStart + worstLineIdx + 1}:`)
        parts.push(`  File has:   "${worstFileLine}"`)
        parts.push(`  You gave:   "${worstTargetLine}"`)
      }

      parts.push('')
      parts.push(`💡 Tips to fix:`)
      parts.push(
        `  • Use startLine=${bestStart + 1}&endLine=${bestEnd + 1} to target by line number (no content matching needed)`
      )
      parts.push(
        `  • Or read the file, copy the EXACT lines ${bestStart + 1}-${bestEnd + 1} above into your target parameter`
      )
      parts.push(`  • Common issues: indentation (tab vs spaces), trailing whitespace, comments, empty lines`)
    } else {
      parts.push(`❌ Target (${targetLineCount} lines) is too different from any block in the file to suggest a close match.`)
      parts.push('')
      parts.push(`💡 Try using startLine/endLine instead:`)
      parts.push(`  • Read the file first, then call replace with startLine=N&endLine=M`)
    }

    return { error: parts.join('\n') }
  }
}
