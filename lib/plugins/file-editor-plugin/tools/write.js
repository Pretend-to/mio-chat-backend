import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'
import { lintFile } from '../lib/linter.js'
import { readOnDiskName, toAbsolutePath } from '../../../../utils/fsPathName.js'

export default class write extends MioFunction {
  constructor() {
    super({
      access: { requires: { admin: true } },
      description: 'Create a new file or overwrite an existing one with new content. Automatically creates parent directories if they do not exist.',
      name: 'write',
      parameters: {
        properties: {
          content: {
            description: 'The full content to write to the file.',
            type: 'string',
          },
          filePath: {
            description: 'Absolute path or relative path to the file.',
            type: 'string',
          },
          overwrite: {
            default: true,
            description: 'Whether to overwrite the file if it already exists. Defaults to true.',
            type: 'boolean'
          }
        },
        required: ['filePath', 'content'],
        type: 'object',
      }
    })
    this.func = this._execute
  }
  getDisplayName(params) {
    const { filePath } = params
    const fileName = filePath ? path.basename(filePath) : ''
    return `Writing to ${fileName || 'file'}`
  }
  async _execute(e) {
    const { filePath, content, overwrite = true } = e.params
    // 路径先统一到 Unicode NFC（不做字符替换，不替调用方改名）
    const absolutePath = toAbsolutePath(filePath)

    if (fs.existsSync(absolutePath) && !overwrite) {
      return { error: `File already exists and overwrite is set to false: ${filePath}` }
    }

    try {
      const dir = path.dirname(absolutePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(absolutePath, content, 'utf8')

      // 落盘校验：writeFileSync 不抛异常 ≠ 文件真的在那。
      // 真实事故（2026-09-24）：回执 `File written successfully`，随后同一路径的 ls / zip / share
      // 全都找不到文件 —— 同一批并行工具调用里的 `rm -rf` 刚把目录删了，而工具当时无从察觉。
      const expectedBytes = Buffer.byteLength(content, 'utf8')
      const verified = this._verify(absolutePath, content, expectedBytes)
      if (!verified.ok) {
        return {
          error: [
            `Write reported no error, but the file is NOT verified on disk: ${absolutePath}`,
            `  ${verified.reason}`,
            '  可能原因：另一个进程/工具立刻删掉或移走了它（例如同一批并行调用里的 rm -rf），',
            '  或文件系统拒绝了这个名字。**不要依赖这次写入的结果**，请重新确认路径后再写。',
          ].join('\n'),
          resolvedPath: absolutePath,
          success: false,
        }
      }

      const requestedName = path.basename(absolutePath)
      const onDiskName = readOnDiskName(absolutePath) || requestedName
      const lintResults = await lintFile(absolutePath)

      return {
        file: filePath,
        onDiskName,
        resolvedPath: absolutePath,
        size: verified.size,
        mtime: verified.mtime,
        lint: lintResults && lintResults.length > 0 ? lintResults : undefined,
        message: `File written successfully (verified on disk: ${verified.size} bytes).`,
        success: true,
        ...(onDiskName === requestedName
          ? {}
          : {
              warning: `⚠️ 实际落盘名是 "${onDiskName}"，与请求的名字 "${requestedName}" 不同（文件系统做了规范化）。后续请使用实际落盘名。`,
            }),
      }
    } catch (error) {
      return { error: `Operation failed: ${error.message}` }
    }
  }

  /**
   * 写完之后读回校验：stat + 读回比对。
   * @returns {{ok: true, size: number, mtime: string} | {ok: false, reason: string}}
   */
  _verify(absolutePath, content, expectedBytes) {
    let stat
    try {
      stat = fs.statSync(absolutePath)
    } catch (error) {
      return { ok: false, reason: `读回失败：${error.code || error.message}` }
    }
    if (!stat.isFile()) {
      return { ok: false, reason: `不是一个普通文件（${absolutePath}）` }
    }
    if (stat.size !== expectedBytes) {
      return {
        ok: false,
        reason: `大小不一致：磁盘上 ${stat.size} 字节，期望 ${expectedBytes} 字节`,
      }
    }
    let readBack
    try {
      readBack = fs.readFileSync(absolutePath, 'utf8')
    } catch (error) {
      return { ok: false, reason: `读回失败：${error.code || error.message}` }
    }
    if (readBack !== content) {
      return { ok: false, reason: '读回内容与写入内容不一致（可能有并发写入）' }
    }
    return { mtime: stat.mtime.toISOString(), ok: true, size: stat.size }
  }
}
