import { MioFunction } from '../../../function.js'

export default class sendCommandInput extends MioFunction {
  constructor() {
    super({
      name: 'sendCommandInput',
      description: 'Send input to a running command\'s standard input (stdin). Use this for interactive prompts.',
      parameters: {
        type: 'object',
        properties: {
          processId: {
            type: 'string',
            description: 'The ID of the process to send input to.',
          },
          input: {
            type: 'string',
            description: 'The text to send to stdin. Usually ends with a newline.',
          },
        },
        required: ['processId', 'input'],
      },
      adminOnly: true
    })
    this.func = this.sendInput
  }

  async sendInput(e) {
    const { processId, input } = e.params
    const plugin = this.parentPlugin
    const procInfo = plugin.processes.get(processId)

    if (!procInfo) {
      return { error: `Process with ID ${processId} not found.` }
    }

    if (procInfo.status !== 'running') {
      return { error: `Process is not running (status: ${procInfo.status}).` }
    }

    try {
      procInfo.process.stdin.write(input)
      return { success: true, message: 'Input sent to process.' }
    } catch (err) {
      return { error: `Failed to write to stdin: ${err.message}` }
    }
  }
}
