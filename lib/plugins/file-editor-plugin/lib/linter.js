import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

/**
 * 对 .js/.mjs/.cjs 文件运行 node --check 语法验证
 * @param {string} absolutePath 文件绝对路径
 * @returns {Promise<Array|null>} 语法错误列表，语法正确返回空数组，不支持返回 null
 */
async function nodeCheck(absolutePath) {
  const ext = path.extname(absolutePath).toLowerCase()
  const jsExts = ['.js', '.mjs', '.cjs']

  if (!jsExts.includes(ext)) {
    return null
  }

  try {
    const { stderr } = await execAsync(`node --check "${absolutePath}"`)
    // Node --check 成功时无输出，静默退出
    if (stderr && stderr.trim()) {
      return [{
        help: 'Node.js 语法检查失败，请修复语法错误',
        message: stderr.trim(),
        rule: 'SyntaxError',
        severity: 2, // error
      }]
    }
    return []
  } catch (error) {
    // node --check 语法错误时退出码非零，错误信息在 stderr
    const message = error.stderr || error.message || 'Unknown syntax error'
    return [{
      help: 'Node.js 语法检查失败，请修复语法错误',
      message: message.trim(),
      rule: 'SyntaxError',
      severity: 2, // error
    }]
  }
}

/**
 * 使用 oxlint 对文件进行快速 lint 检查，并合并 node --check 语法验证
 * @param {string} absolutePath 文件绝对路径
 * @returns {Promise<Array|null>} 返回 lint 错误列表，如果不支持或失败返回 null
 */
export async function lintFile(absolutePath) {
  const ext = path.extname(absolutePath).toLowerCase().slice(1)
  const supportedExts = ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'vue']

  if (!supportedExts.includes(ext)) {
    return null
  }

  const results = []

  // 1. Node.js 语法检查（仅 .js/.mjs/.cjs）
  const syntaxErrors = await nodeCheck(absolutePath)
  if (syntaxErrors) {
    results.push(...syntaxErrors)
  }

  // 2. oxlint 代码质量检查
  try {
    const command = `npx oxlint --format json "${absolutePath}"`

    let stdout
    try {
      const result = await execAsync(command)
      stdout = result.stdout
    } catch (error) {
      stdout = error.stdout
    }

    if (stdout) {
      const output = JSON.parse(stdout)
      if (output.diagnostics && Array.isArray(output.diagnostics)) {
        const oxlintResults = output.diagnostics.map(d => ({
          column: d.labels?.[0]?.span?.column,
          help: d.help,
          line: d.labels?.[0]?.span?.line,
          message: d.message,
          rule: d.code,
          severity: d.severity
        }))
        results.push(...oxlintResults)
      }
    }
  } catch (error) {
    logger.warn(`[Linter] oxlint 检查失败 ${absolutePath}: ${error.message}`)
  }

  return results.length > 0 ? results : []
}
