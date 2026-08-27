import Plugin from '../../plugin.js'

export default class ChannelManagerPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
    this.hidden = true
  }

  async initialize() {
    await super.initialize()
    await this._propagateHooks()
  }

  getInitialConfig() {
    return {}
  }
}
