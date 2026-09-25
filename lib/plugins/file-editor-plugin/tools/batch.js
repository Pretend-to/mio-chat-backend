import { MioFunction } from '../../../function.js'
import fs from 'fs'
import { toAbsolutePath } from '../../../../utils/fsPathName.js'
import { findTarget } from '../lib/matcher.js'
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

export default class batch extends MioFunction {
  constructor() {
    super({
      access: { requires: { admin: true } },
      description:
        'Perform multiple non-overlapping replacements in a single file. Uses 4-level layered matching (exact → trimmed → ws-normalized → fuzzy) for each replacement target.',
      name: 'batch',
      parameters: {
        properties: {
          filePath: {
            description: 'Absolute path or relative path to the file.',
            type: 'string',
          },
          replacements: {
            description: 'A list of replacement pairs.',
            items: {
              properties: {
                replacement: {
                  description: 'The new text to insert.',
                  type: 'string',
                },
                target: {
                  description: 'The exact original text to find.',
                  type: 'string',
                },
              },
              required: ['target', 'replacement'],
              type: 'object',
            },
            type: 'array',
          },
        },
        required: ['filePath', 'replacements'],
        type: 'object',
      },
    })
    this.func = this._execute
  }

  async _execute(e) {
    const { filePath, replacements } = e.params
    const absolutePath = toAbsolutePath(filePath)

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

        // 写盘前自检 0：换行被转义成字面量 `\n` 的 target（多行块会被当成一行，只吃掉一部分）
        const escaped = detectEscapedNewlineTarget(normalizedTarget, content, item.replacement)
        if (escaped) {
          return {
            error: escapedNewlineError(escaped, filePath, `Replacement #${matches.length + 1}`),
            success: false,
          }
        }

        const result = findTarget(lines, normalizedTarget, content)
        const match = result?.match
        if (!match) {
          const methodHint = '(tried all 4 levels: exact → trimmed → ws-normalized → fuzzy)'
          return {
            error: `Replacement #${matches.length + 1}: Target not found ${methodHint}: "${item.target.slice(0, 60)}..."`,
          }
        }

        // 写盘前自检 1：多行块必须命在行边界上（子串/前缀命中会留下残渣）
        if (normalizedTarget.split('\n').length >= 2 && !isLineAligned(content, match.index, match.matchedText.length)) {
          return {
            error: alignmentError({
              content,
              filePath,
              index: match.index,
              label: `Replacement #${matches.length + 1}`,
              length: match.matchedText.length,
              method: match.method,
            }),
            success: false,
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
          fuzzyNotice: buildFuzzyNotice(match, result.closest),
          index: match.index,
          method: match.method,
          normalizedTarget,
          replacement: item.replacement.replace(/\r\n/g, '\n'),
          target: match.matchedText,
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

      // Step 4: 写盘前自检 2：模糊匹配多行块时，确认原文没有残留在所有替换窗口之外（部分应用）
      const rest = stripWindows(
        content,
        matches.map((m) => ({ index: m.index, length: m.target.length })),
      )
      for (let i = 0; i < matches.length; i++) {
        if (!matches[i].fuzzyNotice) {continue}
        const residue = findResidualRun(rest, matches[i].normalizedTarget)
        if (residue) {
          const range = windowLineRange(content, matches[i].index, matches[i].target.length)
          return {
            error: residualError(residue, {
              filePath,
              label: `Replacement #${i + 1}`,
              method: matches[i].method,
              windowEndLine: range.end,
              windowStartLine: range.start,
            }),
            match: 'fuzzy',
            success: false,
          }
        }
      }

      // Step 5: Apply from back to front
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
      const fuzzyIndexes = matches.map((m, i) => (m.fuzzyNotice ? i + 1 : 0)).filter(Boolean)
      const lintResults = await lintFile(absolutePath)
      return {
        file: filePath,
        lint: lintResults && lintResults.length > 0 ? lintResults : undefined,
        ...(fuzzyIndexes.length > 0
          ? {
              match: 'fuzzy',
              methods,
              similarity: Math.min(...matches.filter((m) => m.fuzzyNotice).map((m) => m.fuzzyNotice.similarity ?? 1)),
              warning: `⚠️ 第 ${fuzzyIndexes.join(', ')} 个替换用了模糊匹配（非精确匹配），命中的是「最接近」的块，可能不是你想改的那块。请核对结果；跨行结构改动建议改用 startLine/endLine。`,
            }
          : { match: methods }),
        message: fuzzyIndexes.length > 0
          ? `Applied ${matches.length} replacements — ${fuzzyIndexes.length} of them with FUZZY (non-exact) matching. Review the result. [${methods}]`
          : `Applied ${matches.length} replacements successfully [${methods}].`,
        success: true
      }
    } catch (error) {
      return { error: `Operation failed: ${error.message}` }
    }
  }
}
