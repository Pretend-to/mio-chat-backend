import { MioFunction } from '../../../function.js'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import storageService from '../../../storage/StorageService.js'

export default class publish extends MioFunction {
  constructor() {
    super({
      description:
        'A tool to help you create or publish a webpage. It supports direct HTML content or a local path (file or folder). The published webpage link will be automatically rendered as a card in the chat timeline, so you DO NOT need to output the URL in your text response.',
      name: 'publish',
      parameters: {
        properties: {
          html: {
            description: 'Direct HTML content to be rendered.',
            type: 'string',
          },
          localPath: {
            description: 'Local filesystem path to a file or folder to publish.',
            type: 'string',
          },
        },
        type: 'object',
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

        if (!entryUrl) {throw new Error('No HTML entry file found in the directory.')}
        return {
          extraRender: [
            {
              type: 'link',
              url: entryUrl,
              text: '打开已发布的网页 🌐',
              placement: 'outer'
            }
          ],
          result: { url: entryUrl }
        }
      } else {
        // 单个文件发布
        const fileName = path.basename(localPath)
        const deployPath = `${deployPrefix}/${fileName}`
        const data = fs.readFileSync(localPath)
        const result = await this._uploadFile(data, deployPath)
        const url = result.url.startsWith('http') ? result.url : `${baseUrl}${result.url}`
        return {
          extraRender: [
            {
              type: 'link',
              url,
              text: '打开已发布的网页 🌐',
              placement: 'outer'
            }
          ],
          result: { url }
        }
      }
    } else if (html) {
      const pageName = `${deployPrefix}/index.html`
      const url = await this.saveTextFile(baseUrl, html, pageName)
      return {
        extraRender: [
          {
            type: 'link',
            url,
            text: '打开已发布的网页 🌐',
            placement: 'outer'
          }
        ],
        result: { url }
      }
    } else {
      throw new Error('Either "html" or "localPath" must be provided.')
    }
  }

  _getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath)
    arrayOfFiles = arrayOfFiles || []

    files.forEach((file) => {
      if (fs.statSync(`${dirPath  }/${  file}`).isDirectory()) {
        arrayOfFiles = this._getAllFiles(`${dirPath  }/${  file}`, arrayOfFiles)
      } else {
        arrayOfFiles.push(path.join(dirPath, '/', file))
      }
    })

    return arrayOfFiles
  }

  async _uploadFile(data, name) {
    const ext = path.extname(name).toLowerCase()
    const mimeMap = {
      '.css': 'text/css',
      '.gif': 'image/gif',
      '.htm': 'text/html',
      '.html': 'text/html',
      '.jpeg': 'image/jpeg',
      '.jpg': 'image/jpeg',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.md': 'text/markdown',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain',
      '.webp': 'image/webp',
    }
    const contentType = mimeMap[ext] || 'application/octet-stream'

    return await storageService.upload(data, name, 'file', {
      contentType,
    })
  }
}
