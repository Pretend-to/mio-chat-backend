import { MioFunction } from '../../../function.js'

export default class Memory extends MioFunction {
  constructor() {
    super({
      name: 'memory',
      description:
        '记录一个需要记忆的事项（记忆），以便在后续对话中参考。请以问答形式（Question & Answer）记录。由于联系人实例存在于前端，前端会自动处理记忆的存储。',
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: '需要记忆的问题或情境',
          },
          answer: {
            type: 'string',
            description: '对应的回答或需要记住的信息',
          },
        },
        required: ['question', 'answer'],
      },
    })
    this.func = this.recordMemory
  }

  async recordMemory() {
    // 前端会自动处理记忆的存储，这里只需返回成功
    return {
      success: true,
      message: '记忆成功',
    }
  }
}
