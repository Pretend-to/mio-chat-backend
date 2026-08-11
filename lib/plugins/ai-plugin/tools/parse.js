import { MioFunction } from '../../../function.js'
import { parseFileWithUrl } from '../../../../utils/parseFile.js'

export default class parse extends MioFunction {
  constructor() {
    super({
      description: 'Extract text content from files (URLs or local paths).',
      name: 'parse',
      parameters: {
        properties: {
          fileUrls: {
            description:
              'The URLs or local paths (file://) of the files to parse.',
            items: {
              type: 'string',
            },
            type: 'array',
          },
        },
        required: ['fileUrls'],
        type: 'object',
      },
    })
    this.func = this.parseFile
  }

  async parseFile(e) {
    const {fileUrls} = e.params
    const result = []
    // 使用 Promise.allSettled 并行处理所有文件解析
    const promises = fileUrls.map(async (fileUrl) => {
      try {
        const { content, error } = await parseFileWithUrl(fileUrl)
        if (error) {
          throw new Error(error)
        }
        result.push({ content, fileUrl })
      } catch (error) {
        result.push({ error: error.message, fileUrl })
      }
    })
    await Promise.allSettled(promises) // 等待所有解析完成
    return { result, status: 'success' }
  }
}
