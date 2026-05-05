import { MioFunction } from '../../../function.js'

export default class kill extends MioFunction {
  constructor() {
    super({
      name: 'kill',
      description: 'Terminate a background process previously started via this terminal plugin\'s "sh" tool. Note: This tool can ONLY terminate processes managed by this plugin (identified by a "proc_..." ID), it cannot terminate general system processes by their OS PID.',
      parameters: {
        type: 'object',
        properties: {
          processId: {
            type: 'string',
            description: 'The ID of the process to terminate.',
          },
          signal: {
            type: 'string',
            description: 'The signal to send (e.g., SIGTERM, SIGKILL).',
            default: 'SIGTERM'
          }
        },
        required: ['processId'],
      },
      adminOnly: true
    })
    this.func = this.terminate
  }

  async terminate(e) {
    const { processId, signal = 'SIGTERM' } = e.params
    const plugin = this.parentPlugin
    
    if (!plugin || !plugin.processes) {
      return { error: 'Terminal plugin state is invalid (processes map not found).' }
    }

    const procInfo = plugin.processes.get(processId)

    if (!procInfo) {
      // 如果进程不存在，返回友好提示而不是报错
      return { 
        success: false, 
        message: `Process with ID ${processId} was not found. It might have already finished and been removed, or it never existed.` 
      }
    }

    try {
      // 如果进程已经结束，不需要 kill
      if (procInfo.status === 'finished' || procInfo.status === 'error') {
        return { 
          success: true, 
          message: `Process ${processId} has already ${procInfo.status} (Exit Code: ${procInfo.exitCode}). No need to terminate.` 
        }
      }

      if (procInfo.process && typeof procInfo.process.kill === 'function') {
        procInfo.process.kill(signal)
        procInfo.status = 'terminating'
        return { success: true, message: `Signal ${signal} sent to process ${processId}.` }
      } else {
        return { error: 'Process object is invalid or does not support kill operation.' }
      }
    } catch (err) {
      return { error: `Failed to kill process: ${err.message}` }
    }
  }
}
