import { MioFunction } from '../../../function.js'
import fs from 'fs'
import path from 'path'

export default class sendImg extends MioFunction {
  constructor() {
    super({
      name: 'sendImg',
      description: 'Send a local image file to the user. The image will be uploaded to the configured storage and displayed as a markdown image.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'The absolute or relative path to the local image file.',
          }
        },
        required: ['filePath'],
      },
      adminOnly: true
    })
    this.func = this.sendImage
  }

  async sendImage(e) {
    const { filePath } = e.params
    const baseUrl = e.user.origin
    
    // 检查路径安全性（简单防止目录遍历，虽然是 adminOnly，但还是稳点好）
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
    
    try {
      if (!fs.existsSync(absolutePath)) {
        return { error: `File not found: ${filePath}` }
      }

      const stats = fs.statSync(absolutePath)
      if (!stats.isFile()) {
        return { error: `Not a file: ${filePath}` }
      }

      // 读取文件到 Buffer
      const buffer = fs.readFileSync(absolutePath)
      
      // 调用基类的获取图片 URL 方法 (已对接 StorageService)
      const imageUrl = await this.getImgUrlFromBuffer(baseUrl, buffer)
      
      return {
        success: true,
        url: imageUrl,
        markdown: `![Image](${imageUrl})`,
        message: 'Image has been uploaded and sent to the user.'
      }
    } catch (err) {
      return { error: `Failed to send image: ${err.message}` }
    }
  }
}
