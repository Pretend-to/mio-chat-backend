import Plugin from '../../plugin.js'

export default class FileEditorPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }

  async initialize() {
    await super.initialize()
    this._propagateHooks() // 将路径保护 Hook 广播到全系统
  }
}
