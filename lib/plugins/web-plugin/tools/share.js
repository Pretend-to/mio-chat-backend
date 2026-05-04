/* eslint-disable camelcase */
import { MioFunction } from '../../../function.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import storageService from '../../../storage/StorageService.js'

export default class share extends MioFunction {
  constructor() {
    super({
      name: 'share',
      description:
        '读取服务器本地文件，上传到存储系统（本地/S3），生成公网可访问的链接。支持各类文件（图片、文档、视频、压缩包等）。注意：若需要分享多个文件或整个目录，请先调用 terminal-plugin 的 sh 使用 zip 命令将其打包成单个文件后再进行分享，严禁为一个一个文件生成多个链接。',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description:
              '服务器上待分享文件的绝对路径或相对于项目根目录的路径。例如："/www/data/report.pdf" 或 "./output/uploaded/image/xxx.png"',
          },
          fileName: {
            type: 'string',
            description:
              '上传后的文件名（可选）。若不指定则使用原文件名。可自定义，如 "分享给张三-报告.pdf"',
          },
          fileType: {
            type: 'string',
            description:
              '文件类型分类（可选）。默认为 "file"。可选值：image、file、document、video、audio',
            enum: ['image', 'file', 'document', 'video', 'audio'],
          },
        },
        required: ['filePath'],
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
          success: false,
          error: `文件不存在或无法访问: ${resolvedPath}`,
          hint: '请检查路径是否正确。支持绝对路径或相对于项目根目录的路径。',
        }
      }

      if (!stat.isFile()) {
        return { success: false, error: `路径不是文件: ${resolvedPath}` }
      }

      // 3. 读取文件
      const data = await fs.readFile(resolvedPath)

      // 4. 确定文件名和 Content-Type
      const finalFileName = fileName || path.basename(resolvedPath)
      const ext = path.extname(finalFileName).toLowerCase()
      const mimeMap = {
        '.html': 'text/html',
        '.htm': 'text/html',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.mp4': 'video/mp4',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.zip': 'application/zip',
        '.tar': 'application/x-tar',
        '.gz': 'application/gzip',
        '.7z': 'application/x-7z-compressed',
        '.rar': 'application/vnd.rar',
        '.csv': 'text/csv',
        '.yaml': 'application/x-yaml',
        '.yml': 'application/x-yaml',
        '.log': 'text/plain',
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

      return {
        success: true,
        originalFile: resolvedPath,
        fileSize: stat.size,
        fileSizeFormatted: this.formatSize(stat.size),
        fileName: finalFileName,
        contentType,
        publicUrl,
        markdown: this.getMarkdown(finalFileName, publicUrl),
      }
    } catch (error) {
      return {
        success: false,
        error: `文件分享失败: ${error.message}`,
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
