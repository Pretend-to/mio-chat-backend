import { MioFunction } from '../../../function.js'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import storageService from '../../../storage/StorageService.js'

export default class publish extends MioFunction {
  constructor() {
    super({
      name: 'publish',
      description:
        'A tool to help you create or publish a webpage. It supports direct HTML content or a local path (file or folder). If a folder is provided, all its contents will be published preserving the structure. After public, show the webPage in an iframe or hyperlink.',
      parameters: {
        type: 'object',
        properties: {
          html: {
            type: 'string',
            description: 'Direct HTML content to be rendered.',
          },
          localPath: {
            type: 'string',
            description: 'Local filesystem path to a file or folder to publish.',
          },
        },
      },
    })
    this.func = this.pubWebpage
  }

  async pubWebpage(e) {
    const baseUrl = e.user.origin
    const uid = e.user.id
    const timestamp = Date.now().toString()

    const hash = crypto
      .createHash('md5')
      .update(`${uid}${timestamp}`)
      .digest('hex')
      .substring(0, 6)

    const { html, localPath } = e.params

    // 网页发布的根目录前缀，确保隔离
    const deployPrefix = `web/${hash}`

    if (localPath) {
      if (!fs.existsSync(localPath)) {
        throw new Error(`Path does not exist: ${localPath}`)
      }

      const stats = fs.statSync(localPath)
      if (stats.isDirectory()) {
        const files = this._getAllFiles(localPath)
        let entryUrl = ''

        for (const file of files) {
          const relativePath = path.relative(localPath, file)
          const deployPath = `${deployPrefix}/${relativePath}`
          const data = fs.readFileSync(file)
          const result = await this._uploadFile(data, deployPath)

          // 优先寻找 index.html 作为入口
          if (relativePath === 'index.html' || (!entryUrl && relativePath.endsWith('.html'))) {
            entryUrl = result.url.startsWith('http') ? result.url : `${baseUrl}${result.url}`
          }
        }

        if (!entryUrl) throw new Error('No HTML entry file found in the directory.')
        return { url: entryUrl }
      } else {
        // 单个文件发布
        const fileName = path.basename(localPath)
        const deployPath = `${deployPrefix}/${fileName}`
        const data = fs.readFileSync(localPath)
        const result = await this._uploadFile(data, deployPath)
        const url = result.url.startsWith('http') ? result.url : `${baseUrl}${result.url}`
        return { url }
      }
    } else if (html) {
      const pageName = `${deployPrefix}/index.html`
      const url = await this.saveTextFile(baseUrl, html, pageName)
      return { url }
    } else {
      throw new Error('Either "html" or "localPath" must be provided.')
    }
  }

  _getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath)
    arrayOfFiles = arrayOfFiles || []

    files.forEach((file) => {
      if (fs.statSync(dirPath + '/' + file).isDirectory()) {
        arrayOfFiles = this._getAllFiles(dirPath + '/' + file, arrayOfFiles)
      } else {
        arrayOfFiles.push(path.join(dirPath, '/', file))
      }
    })

    return arrayOfFiles
  }

  async _uploadFile(data, name) {
    const ext = path.extname(name).toLowerCase()
    const mimeMap = {
      '.html': 'text/html',
      '.htm': 'text/html',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
    }
    const contentType = mimeMap[ext] || 'application/octet-stream'

    return await storageService.upload(data, name, 'file', {
      contentType,
    })
  }
}
