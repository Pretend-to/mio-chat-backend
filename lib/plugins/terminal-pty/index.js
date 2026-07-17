import { EventEmitter } from 'events'
import Plugin from '../../plugin.js'
import TerminalSessionManager from './lib/TerminalSessionManager.js'

export default class TerminalPtyPlugin extends Plugin {  // HOT_RELOAD_TEST: timestamp ${Date.now()}
  constructor() {
    super({ importMetaUrl: import.meta.url })

    this.sessions = new TerminalSessionManager(this)
    this.processBus = new EventEmitter()
    this.processBus.setMaxListeners(100)

    this.sessions.on('data', (sessionId, data) => {
      this.processBus.emit('session:data', sessionId, data)
    })
    this.sessions.on('done', (sessionId, result) => {
      this.processBus.emit('session:done', sessionId, result)
    })
  }

  async initialize() {
    await super.initialize()
  }

  getInitialConfig() {
    return {
      maxSessions: 20,
      sessionTimeout: 600000,       // 10分钟（原30分钟）空闲即回收
      maxOutputLength: 512 * 1024,  // 512KB（原2MB），减少内存占用
      defaultCols: 120,
      defaultRows: 40,
    }
  }

  async destroy() {
    this.processBus.removeAllListeners()
    await this.sessions.destroy()
    await super.destroy()
  }
}
