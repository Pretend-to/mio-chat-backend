/* eslint-disable camelcase */
import { MioFunction } from '../../../function.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import storageService from '../../../storage/StorageService.js'
import { formatAssetUrl } from '../../../../utils/origin.js'
import { resolveExistingPath, toAbsolutePath } from '../../../../utils/fsPathName.js'

export default class share extends MioFunction {
  constructor() {
    super({
      description:
        '读取服务器本地文件，上传到存储系统（本地/S3），生成公网可访问的链接。支持各类文件（图片、文档、视频、压缩包等）。分享的文件或图片会被系统自动渲染并展示在聊天时间线中，请勿在回复中重复输出 markdown 链接或文件分享地址。注意：若需要分享多个文件或整个目录，请先调用 terminal-plugin 的 sh 使用 zip 命令将其打包成单个文件后再进行分享，严禁为一个一个文件生成多个链接。',
      name: 'share',
      parameters: {
        properties: {
          fileName: {
            description:
              '上传后的文件名（可选）。若不指定则使用原文件名。可自定义，如 "分享给张三-报告.pdf"',
            type: 'string',
          },
          filePath: {
            description:
              '服务器上待分享文件的绝对路径或相对于项目根目录的路径。例如："/www/data/report.pdf" 或 "./output/uploaded/image/xxx.png"',
            type: 'string',
          },
          fileType: {
            description:
              '文件类型分类（可选）。默认为 "file"。可选值：image、file、document、video、audio',
            enum: ['image', 'file', 'document', 'video', 'audio'],
            type: 'string',
          },
        },
        required: ['filePath'],
        type: 'object',
      },
    })
    this.func = this.handleFileShare.bind(this)
  }

  async handleFileShare(e) {
    const { filePath: rawPath, fileName, fileType = 'file' } = e.params

    try {
      // 1. 解析路径（NFC 规范化）
      let resolvedPath = toAbsolutePath(rawPath)

      // 2. 检查文件：原样 → NFC 等价 / 全半角冒号等价（只有唯一命中才采用，歧义就报错）
      let stat
      let nameFallback = null
      try {
        stat = await fs.stat(resolvedPath)
      } catch {
        const found = resolveExistingPath(resolvedPath)
        if (!found) {
          return {
            error: `文件不存在或无法访问: ${resolvedPath}`,
            hint: '请检查路径是否正确。支持绝对路径或相对于项目根目录的路径。dirEntries 是父目录里的文件名，可用来区分「名字不匹配」和「文件真的不在」。',
            dirEntries: await this._listDirNames(resolvedPath),
            success: false,
          }
        }
        nameFallback = found
        resolvedPath = found.path
        stat = await fs.stat(resolvedPath)
      }

      if (!stat.isFile()) {
        return { error: `路径不是文件: ${resolvedPath}`, success: false }
      }

      // 3. 读取文件
      const data = await fs.readFile(resolvedPath)

      // 4. 确定文件名和 Content-Type
      const finalFileName = fileName || path.basename(resolvedPath)
      const ext = path.extname(finalFileName).toLowerCase()
      const mimeMap = {
        '.7z': 'application/x-7z-compressed',
        '.css': 'text/css',
        '.csv': 'text/csv',
        '.gif': 'image/gif',
        '.gz': 'application/gzip',
        '.htm': 'text/html',
        '.html': 'text/html',
        '.ico': 'image/x-icon',
        '.jpeg': 'image/jpeg',
        '.jpg': 'image/jpeg',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.log': 'text/plain',
        '.md': 'text/markdown',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.rar': 'application/vnd.rar',
        '.svg': 'image/svg+xml',
        '.tar': 'application/x-tar',
        '.txt': 'text/plain',
        '.wav': 'audio/wav',
        '.webp': 'image/webp',
        '.xml': 'application/xml',
        '.yaml': 'application/x-yaml',
        '.yml': 'application/x-yaml',
        '.zip': 'application/zip',
      }
      const contentType = mimeMap[ext] || 'application/octet-stream'

      // 5. 上传到存储系统（适配器模式：S3 返回完整 url，Local 返回相对路径）
      const result = await storageService.upload(
        data,
        finalFileName,
        fileType,
        {
          contentType,
        },
      )

      // 6. 获取完整公网链接（S3Adapter 自带完整 url，LocalAdapter 需补 origin）
      const publicUrl = formatAssetUrl(e.user?.origin, result.url)

      // 识别具体媒体与文档类型
      const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.avif']
      const audioExts = ['.mp3', '.wav', '.silk', '.m4a', '.ogg', '.aac', '.flac', '.wma']
      const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv']
      const markdownExts = ['.md', '.markdown']
      const htmlExts = ['.html', '.htm']
      const pdfExts = ['.pdf']
      const officeExts = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']

      let detectedType = 'file'
      if (fileType === 'image' || imageExts.includes(ext)) {
        detectedType = 'image'
      } else if (fileType === 'audio' || audioExts.includes(ext)) {
        detectedType = 'audio'
      } else if (fileType === 'video' || videoExts.includes(ext)) {
        detectedType = 'video'
      } else if (markdownExts.includes(ext)) {
        detectedType = 'markdown'
      } else if (htmlExts.includes(ext)) {
        detectedType = 'html'
      } else if (pdfExts.includes(ext)) {
        detectedType = 'pdf'
      } else if (officeExts.includes(ext)) {
        detectedType = 'office'
      }

      let renderItem = null
      if (detectedType === 'image') {
        renderItem = {
          fileName: finalFileName,
          localPath: resolvedPath,
          placement: 'outer',
          size: stat.size,
          title: finalFileName,
          type: 'image',
          url: publicUrl,
        }
      } else if (detectedType === 'audio') {
        renderItem = {
          fileName: finalFileName,
          localPath: resolvedPath,
          placement: 'outer',
          size: stat.size,
          title: finalFileName,
          type: 'audio',
          url: publicUrl,
        }
      } else if (detectedType === 'video') {
        renderItem = {
          fileName: finalFileName,
          localPath: resolvedPath,
          placement: 'outer',
          size: stat.size,
          title: finalFileName,
          type: 'video',
          url: publicUrl,
        }
      } else if (detectedType === 'markdown') {
        // 小于 2MB 的 markdown 文件直接携带 content 文本，供前端原生解析展示
        const content = stat.size <= 2 * 1024 * 1024 ? data.toString('utf-8') : ''
        renderItem = {
          content,
          fileName: finalFileName,
          localPath: resolvedPath,
          placement: 'outer',
          size: stat.size,
          title: finalFileName,
          type: 'markdown',
          url: publicUrl,
        }
      } else if (detectedType === 'html') {
        renderItem = {
          fileName: finalFileName,
          localPath: resolvedPath,
          placement: 'outer',
          size: stat.size,
          title: finalFileName,
          type: 'html',
          url: publicUrl,
        }
      } else if (detectedType === 'pdf') {
        renderItem = {
          fileName: finalFileName,
          localPath: resolvedPath,
          placement: 'outer',
          size: stat.size,
          title: finalFileName,
          type: 'pdf',
          url: publicUrl,
        }
      } else if (detectedType === 'office') {
        renderItem = {
          fileName: finalFileName,
          localPath: resolvedPath,
          placement: 'outer',
          size: stat.size,
          title: finalFileName,
          type: 'office',
          url: publicUrl,
        }
      } else {
        renderItem = {
          fileName: finalFileName,
          localPath: resolvedPath,
          placement: 'outer',
          size: stat.size,
          title: finalFileName,
          type: 'file',
          url: publicUrl,
        }
      }

      const renders = [renderItem]

      return {
        extraRender: renders,
        result: {
          contentType,
          fileName: finalFileName,
          fileSize: stat.size,
          fileSizeFormatted: this.formatSize(stat.size),
          markdown: this.getMarkdown(finalFileName, publicUrl),
          originalFile: resolvedPath,
          publicUrl,
          ...(nameFallback
            ? {
                resolvedFileName: nameFallback.actualName,
                warning: `⚠️ 请求的名字在磁盘上不存在，按${nameFallback.reason === 'nfc' ? ' Unicode NFC 等价' : '半角/全角冒号等价'}匹配到 "${nameFallback.actualName}"，已按这个文件上传。`,
              }
            : {}),
          success: true,
        }
      }
    } catch (error) {
      return {
        error: `文件分享失败: ${error.message}`,
        success: false,
      }
    }
  }

  /** 报错时列出父目录里的文件名（最多 10 个）：区分「名字不匹配」和「文件真的不在」 */
  async _listDirNames(absolutePath) {
    try {
      const entries = await fs.readdir(path.dirname(absolutePath))
      return entries.slice(0, 10)
    } catch {
      return null
    }
  }

  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  getMarkdown(fileName, url) {
    const ext = path.extname(fileName).toLowerCase()
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico']
    if (imageExts.includes(ext)) {
      return `![${fileName}](${url})`
    }
    return `[${fileName}](${url})`
  }
}
