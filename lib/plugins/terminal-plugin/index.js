import Plugin from '../../plugin.js'

export default class TerminalPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
    this.processes = new Map() // Store active child processes
  }

  getInitialConfig() {
    return {
      timeout: 30000, // Default timeout for non-background commands
      maxOutputLength: 10000, // Maximum characters to keep in output buffer
      maxProcesses: 10, // Maximum number of active background processes
      allowedCommands: [], // If empty, allow all (optional security)
    }
  }

  async destroy() {
    // Clean up all running processes on plugin destruction
    for (const [id, procInfo] of this.processes) {
      logger.info(`[TerminalPlugin] Killing process ${id} due to plugin destruction`)
      procInfo.process.kill('SIGTERM')
    }
    this.processes.clear()
    await super.destroy()
  }
}
