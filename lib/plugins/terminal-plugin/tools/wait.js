import { MioFunction } from '../../../function.js'

export default class wait extends MioFunction {
  constructor() {
    super({
      name: 'wait',
      description: 'Wait for a specified duration. Useful for waiting for background tasks to complete.',
      parameters: {
        type: 'object',
        properties: {
          ms: {
            type: 'number',
            description: 'Milliseconds to wait.',
            default: 2000
          }
        },
        required: ['ms'],
      },
      adminOnly: true
    })
    this.func = this.doWait
  }

  async doWait(e) {
    const { ms = 2000 } = e.params
    await new Promise(resolve => setTimeout(resolve, ms))
    return {
      success: true,
      message: `Waited for ${ms}ms.`
    }
  }
}
