import { MioFunction } from '../../../function.js'

export default class getCommandStatus extends MioFunction {
  constructor() {
    super({
      name: 'getCommandStatus',
      description: 'Check the status and output of a previously started background command.',
      parameters: {
        type: 'object',
        properties: {
          processId: {
            type: 'string',
            description: 'The ID of the process to check.',
          },
          maxChars: {
            type: 'number',
            description: 'Maximum number of characters to return for stdout and stderr (from the end).',
            default: 5000
          }
        },
        required: ['processId'],
      },
      adminOnly: true
    })
    this.func = this.status
  }

  async status(e) {
    const { processId, maxChars = 5000 } = e.params
    const plugin = this.parentPlugin
    const procInfo = plugin.processes.get(processId)

    if (!procInfo) {
      return { error: `Process with ID ${processId} not found.` }
    }

    return {
      processId: procInfo.id,
      command: procInfo.command,
      status: procInfo.status,
      startTime: procInfo.startTime,
      exitCode: procInfo.exitCode,
      error: procInfo.error,
      stdout: procInfo.stdout.length > maxChars ? procInfo.stdout.slice(-maxChars) : procInfo.stdout,
      stderr: procInfo.stderr.length > maxChars ? procInfo.stderr.slice(-maxChars) : procInfo.stderr,
      outputTruncated: procInfo.stdout.length > maxChars || procInfo.stderr.length > maxChars
    }
  }
}
