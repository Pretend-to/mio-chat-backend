import Plugin from '../../plugin.js'

export default class ConfigPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }

  getInitialConfig() {
    return {}
  }
}
