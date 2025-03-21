import { MioFunction } from '../../lib/functions.js'
import os from 'node:os'
import { spawn } from 'node:child_process'

export default class executeCommand extends MioFunction {
  constructor() {
    super({
      name: 'executeCommand',
      description: `A tool that executes console commands and reads the output, current server is running on ${os.platform()}. Pay attention to the platform of the server.`,
      params: [{
        name: 'command',
        type: 'string',
        description: 'The console command you want to execute',
        required: true,
      },
      ],
    })
    this.func = this.executeCommand
  }

  async executeCommand(e) {
    const commandArgs = e.params.command.split(' ') // 将命令分割为命令名称和参数
    const command = commandArgs.shift() // 移除第一个元素作为命令，剩余的作为参数
    const args = commandArgs

    try {
      // 如果用户不是管理员，拒绝执行
      if (!e.user.isAdmin) {
        throw new Error('Only administrators can execute commands.')
      }

      return new Promise((resolve, reject) => {
        const child = spawn(command, args, { shell: true })

        let stdout = ''
        let stderr = ''

        // 处理标准输出
        child.stdout.on('data', (data) => {
          stdout += data.toString()
        })

        // 处理标准错误输出
        child.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        // 处理子进程结束
        child.on('close', (code) => {
          if (code !== 0) {
            logger.error('Command execution failed with code: ' + code)
            reject('Command execution failed with code: ' + code + ' and stderr: ' + stderr)
          } else {
            logger.mark('Command executed successfully: ' + stdout)
            resolve({ stdout: stdout.trim(), stderr: stderr.trim() })
          }
        })

        // 处理子进程错误
        child.on('error', (error) => {
          logger.error('Error starting the command: ' + error.message)
          reject('Error starting the command: ' + error.message)
        })
      })
    } catch (err) {
      logger.error('Error executing command: ' + err.message)
      return { error: err.message }
    }
  }
}