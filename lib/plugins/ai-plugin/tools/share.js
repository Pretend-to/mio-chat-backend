/* eslint-disable camelcase */
import { MioFunction } from '../../../function.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import storageService from '../../../storage/StorageService.js'

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
      // 1. 解析路径
      const resolvedPath = path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(process.cwd(), rawPath)

      // 2. 检查文件
      let stat
      try {
        stat = await fs.stat(resolvedPath)
      } catch {
        return {
          error: `文件不存在或无法访问: ${resolvedPath}`,
          hint: '请检查路径是否正确。支持绝对路径或相对于项目根目录的路径。',
          success: false,
        }
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
      let publicUrl = result.url
      if (!publicUrl.startsWith('http')) {
        const origin = e.user?.origin || ''
        publicUrl = `${origin}${publicUrl}`
      }

      // 识别具体媒体类型
      const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.avif']
      const audioExts = ['.mp3', '.wav', '.silk', '.m4a', '.ogg', '.aac', '.flac', '.wma']
      const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv']

      let detectedType = 'file'
      if (fileType === 'image' || imageExts.includes(ext)) {
        detectedType = 'image'
      } else if (fileType === 'audio' || audioExts.includes(ext)) {
        detectedType = 'audio'
      } else if (fileType === 'video' || videoExts.includes(ext)) {
        detectedType = 'video'
      }

      let renderItem = null
      if (detectedType === 'image') {
        renderItem = {
          fileName: finalFileName,
          localPath: resolvedPath,
          placement: 'outer',
          size: stat.size,
          type: 'image',
          url: publicUrl,
        }
      } else if (detectedType === 'audio') {
        renderItem = {
          fileName: finalFileName,
          localPath: resolvedPath,
          placement: 'outer',
          size: stat.size,
          type: 'audio',
          url: publicUrl,
        }
      } else if (detectedType === 'video') {
        renderItem = {
          fileName: finalFileName,
          localPath: resolvedPath,
          placement: 'outer',
          size: stat.size,
          type: 'video',
          url: publicUrl,
        }
      } else {
        renderItem = {
          fileName: finalFileName,
          localPath: resolvedPath,
          placement: 'outer',
          size: stat.size,
          text: `📂 [文件分享: ${finalFileName}]\n🔗 下载链接: ${publicUrl}`,
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
