import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import { findTarget, lineSimilarity } from '../lib/matcher.js'
import { lintFile } from '../lib/linter.js'
import {
  alignmentError,
  buildFuzzyNotice,
  detectEscapedNewlineTarget,
  escapedNewlineError,
  findResidualRun,
  isLineAligned,
  residualError,
  stripWindows,
  windowLineRange,
} from '../lib/matchGuard.js'

export default class replace extends MioFunction {
  constructor() {
    super({
      access: { requires: { admin: true } },
      description:
        'Replace a specific block of code in a file. Supports 4-level layered matching (exact → trimmed → whitespace-normalized → fuzzy) with detailed error feedback. Also supports line-number based targeting via startLine/endLine.',
      name: 'replace',
      parameters: {
        properties: {
          endLine: {
            description:
              'Required when startLine is provided. 1-indexed end line (inclusive).',
            type: 'number',
          },
          filePath: {
            description: 'Absolute path or relative path to the file.',
            type: 'string',
          },
          replacement: {
            description: 'The new code block to replace the target with.',
            type: 'string',
          },
          startLine: {
            description:
              'Alternative: 1-indexed start line of the block to replace. When provided, content-based matching is skipped — the exact line range is used.',
            type: 'number',
          },
          target: {
            description:
              'The original code block to replace. Used for content-based matching (4-level). Optional if startLine is provided.',
            type: 'string',
          },
        },
        required: ['filePath', 'replacement'],
        type: 'object',
      },
    })
    this.func = this._execute
  }
  getDisplayName(params) {
    const { filePath, startLine, endLine } = params
    const fileName = filePath ? path.basename(filePath) : ''
    let lineRange = ''
    if (startLine !== undefined && endLine !== undefined) {
      lineRange = ` (${startLine}-${endLine})`
    }
    return `Replacing in ${fileName || 'file'}${lineRange}`
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
      let content = fs.readFileSync(absolutePath, 'utf8')
      const hasWindowsEndings = content.includes('\r\n')
      if (hasWindowsEndings) {
        content = content.replace(/\r\n/g, '\n')
      }

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
        if (before.length > 0) {parts.push(before.join('\n'))}
        parts.push(replacement.replace(/\r\n/g, '\n'))
        if (after.length > 0) {parts.push(after.join('\n'))}
        let newContent = parts.join('\n')

        if (hasWindowsEndings) {
          newContent = newContent.replace(/\n/g, '\r\n')
        }

        fs.writeFileSync(absolutePath, newContent, 'utf8')
        const lintResults = await lintFile(absolutePath)
        return {
          file: filePath,
          lint: lintResults && lintResults.length > 0 ? lintResults : undefined,
          message: `Lines ${startLine}-${endLine} replaced successfully (${endLine - startLine + 1} lines).`,
          success: true
        }
      }

      // =================  Mode 2: Content-based layered matching  =================
      if (!target) {
        return {
          error: 'Either "target" or "startLine" must be provided.',
        }
      }

      const normalizedTarget = target.replace(/\r\n/g, '\n')
      const targetLines = normalizedTarget.split('\n')

      // 写盘前自检 0：换行被转义成字面量 `\n` 的 target（真实事故：多行块被当成一行吃掉一半）
      const escaped = detectEscapedNewlineTarget(normalizedTarget, content, replacement)
      if (escaped) {
        return { error: escapedNewlineError(escaped, filePath), success: false }
      }

      const result = findTarget(lines, normalizedTarget, content)
      const match = result?.match

      if (match) {
        const fuzzyNotice = buildFuzzyNotice(match, result.closest)

        // 写盘前自检 1：多行块必须命在行边界上（子串/前缀命中会留下残渣）
        if (targetLines.length >= 2 && !isLineAligned(content, match.index, match.matchedText.length)) {
          return {
            error: alignmentError({
              content,
              filePath,
              index: match.index,
              length: match.matchedText.length,
              method: match.method,
            }),
            match: match.method.startsWith('fuzzy') ? 'fuzzy' : match.method,
            success: false,
          }
        }

        // 写盘前自检 2：模糊匹配多行块时，确认原文没有残留在替换窗口之外（部分应用）
        if (fuzzyNotice) {
          const rest = stripWindows(content, [{ index: match.index, length: match.matchedText.length }])
          const residue = findResidualRun(rest, normalizedTarget)
          if (residue) {
            const range = windowLineRange(content, match.index, match.matchedText.length)
            return {
              error: residualError(residue, {
                filePath,
                method: match.method,
                windowEndLine: range.end,
                windowStartLine: range.start,
              }),
              match: 'fuzzy',
              similarity: fuzzyNotice.similarity,
              success: false,
            }
          }
        }

        let newContent =
          content.slice(0, match.index) +
          replacement.replace(/\r\n/g, '\n') +
          content.slice(match.index + match.matchedText.length)

        if (hasWindowsEndings) {
          newContent = newContent.replace(/\n/g, '\r\n')
        }

        fs.writeFileSync(absolutePath, newContent, 'utf8')
        const lintResults = await lintFile(absolutePath)
        return {
          file: filePath,
          lint: lintResults && lintResults.length > 0 ? lintResults : undefined,
          ...(fuzzyNotice || { match: match.method }),
          message: fuzzyNotice
            ? `Block replaced successfully — but it was a FUZZY (non-exact) match${fuzzyNotice.similarity === undefined ? '' : `, similarity ${(fuzzyNotice.similarity * 100).toFixed(1)}%`}. Review the result.`
            : `Block replaced successfully (${match.method}).`,
          success: true
        }
      }

      // =================  All levels failed: detailed error  =================
      return this._buildDetailedError(lines, targetLines, normalizedTarget, filePath, result?.closest)
    } catch (error) {
      return { error: `Operation failed: ${error.message}` }
    }
  }

  _buildDetailedError(lines, targetLines, target, filePath, closest) {
    const totalLines = lines.length
    const targetCharCount = target.length
    const targetLineCount = targetLines.length

    const { bestScore, bestStart, worstLineIdx, worstFileLine, worstTargetLine } = closest || {}

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
