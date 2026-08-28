import fs from 'node:fs'

/**
 * MediaResolver — 通用多模态二进制媒体解析器
 * 统一处理 Buffer、本地文件路径、项目输出目录 (/f/gen, /f/up)、Base64 DataURL 以及远程 HTTP(S) 资源。
 */
export class MediaResolver {
  /**
   * 解析各种来源的媒体并返回二进制 Buffer
   * @param {object} params
   * @param {Buffer} [params.buffer]
   * @param {string} [params.url]
   * @param {string} [params.localPath]
   * @returns {Promise<Buffer|null>}
   */
  static async resolveBuffer({ buffer, url, localPath }) {
    if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) {
      return buffer
    }

    if (localPath && fs.existsSync(localPath)) {
      return await fs.promises.readFile(localPath)
    }

    if (url) {
      if (url.startsWith('data:')) {
        const base64Part = url.split(',')[1] || ''
        return Buffer.from(base64Part, 'base64')
      }

      if (url.startsWith('http://') || url.startsWith('https://')) {
        const resp = await fetch(url)
        if (!resp.ok) {
          throw new Error(`远程媒体资源拉取失败: ${resp.status} ${url}`)
        }
        return Buffer.from(await resp.arrayBuffer())
      }

      if (url.startsWith('/f/gen/') || url.startsWith('/f/up/')) {
        const subPath = url.startsWith('/f/gen/') ? url.slice('/f/gen/'.length) : url.slice('/f/up/'.length)
        const baseFolder = url.startsWith('/f/gen/')
          ? `${process.cwd()}/output/generated`
          : `${process.cwd()}/output/uploaded`
        const diskPath = `${baseFolder}/${subPath}`
        if (fs.existsSync(diskPath)) {
          return await fs.promises.readFile(diskPath)
        }
      }

      if (fs.existsSync(url)) {
        return await fs.promises.readFile(url)
      }
    }

    return null
  }
}
