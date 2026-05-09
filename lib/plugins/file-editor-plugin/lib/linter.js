import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

/**
 * 使用 oxlint 对文件进行快速 lint 检查
 * @param {string} absolutePath 文件绝对路径
 * @returns {Promise<Array|null>} 返回 lint 错误列表，如果不支持或失败返回 null
 */
export async function lintFile(absolutePath) {
  const ext = path.extname(absolutePath).toLowerCase().slice(1)
  const supportedExts = ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'vue']
  
  if (!supportedExts.includes(ext)) {
    return null
  }

  try {
    // oxlint 非常快，直接调用 npx
    // 使用 --deny-warnings 确保警告也会导致非零退出码（如果需要），但我们这里只需要结果
    const command = `npx oxlint --format json "${absolutePath}"`
    
    let stdout
    try {
      const result = await execAsync(command)
      stdout = result.stdout
    } catch (err) {
      // oxlint 在发现错误时会返回退出码 1
      stdout = err.stdout
    }

    if (!stdout) return null

    const output = JSON.parse(stdout)
    if (output.diagnostics && Array.isArray(output.diagnostics)) {
      return output.diagnostics.map(d => ({
        severity: d.severity,
        message: d.message,
        rule: d.code,
        line: d.labels?.[0]?.span?.line,
        column: d.labels?.[0]?.span?.column,
        help: d.help
      }))
    }
    return []
  } catch (err) {
    logger.warn(`[Linter] 检查文件失败 ${absolutePath}: ${err.message}`)
    return null
  }
}
