import { MioFunction } from '../../../function.js'
import { parseFileWithUrl } from '../../../../utils/parseFile.js'

export default class parse extends MioFunction {
  constructor() {
    super({
      name: 'parse',
      description: 'Extract text content from files (URLs or local paths).',
      parameters: {
        type: 'object',
        properties: {
          fileUrls: {
            type: 'array',
            description:
              'The URLs or local paths (file://) of the files to parse.',
            items: {
              type: 'string',
            },
          },
        },
        required: ['fileUrls'],
      },
      adminOnly: true
    })
    this.func = this.parseFile
  }

  async parseFile(e) {
    const fileUrls = e.params.fileUrls
    const result = []
    // 使用 Promise.allSettled 并行处理所有文件解析
    const promises = fileUrls.map(async (fileUrl) => {
      try {
        const { content, error } = await parseFileWithUrl(fileUrl)
        if (error) {
          throw new Error(error)
        }
        result.push({ fileUrl, content })
      } catch (error) {
        result.push({ fileUrl, error: error.message })
      }
    })
    await Promise.allSettled(promises) // 等待所有解析完成
    return { status: 'success', result }
  }
}
