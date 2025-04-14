import { MioFunction } from '../../lib/function.js'
import { parseFileWithUrl } from '../../utils/parseFile.js'

export default class parseFile extends MioFunction {
    constructor() {
        super({
            name: 'parseFiles',
            description: 'A tool to get text from files.',
            parameters: {
                type: 'object',
                properties: {
                    file_urls: {
                        type: 'array',
                        description: 'The URLs of the files to parse for content extraction.',
                        items: {
                            type: 'string',
                        },
                    },
                },
            },
            required: ['file_urls']
        })
        this.func = this.parseFile
    }

    async parseFile(e) {
        const file_urls = e.params.file_urls
        const result = []
        // 使用 Promise.allSettled 并行处理所有文件解析
        const promises = file_urls.map(async (file_url) => {
            try {
                const { content, error } = await parseFileWithUrl(file_url)
                if (error) {
                    throw new Error(error) 
                }
                result.push({ file_url, content })
            } catch (error) {
                result.push({ file_url, error: error.message })
            }
        })
        await Promise.allSettled(promises) // 等待所有解析完成
        return { status: 'success', result }
    }
}