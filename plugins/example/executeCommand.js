import { MioFunction, Param } from '../../lib/functions.js'
import os from 'node:os'
import exec from 'node:child_process'

export class executeCommand extends MioFunction {
  constructor() {
    super({
      name: 'executeCommand',
      description: `A tool that executes console commands and reads the output,current server is running on ${os.platform()},pay attention to the platform of the server.`,
      params: [
        new Param({
          name: 'command',
          type: 'string',
          description: 'The console command you want to execute',
          required: true,
        }),
      ],
    })
    this.func = this.executeCommand
  }

  async executeCommand(e) {
    const command = e.params.command

    try {
      // 如果用户不是管理员，拒绝执行
      if (!e.user.isAdmin) {
        throw new Error('Only administrators can execute commands.')
      }
      
      return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            logger.error('Command execution failed: ' + error.message)
            reject('Command execution failed: ' + error.message)
          }
          if (stderr) {
            logger.warn('Command executed with warnings: ' + stderr)
          }
          logger.mark('Command executed successfully: ' + stdout)
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() })
        })
      })
    } catch (err) {
      logger.error('Error executing command: ' + err.message)
      return { error: err.message }
    }
  }
}