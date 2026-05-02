import Plugin from '../../plugin.js'
import path from 'path'
import { fileURLToPath } from 'url'

export default class ConfigPlugin extends Plugin {
  constructor() {
    super()
  }

  getFilePath() {
    return path.dirname(fileURLToPath(import.meta.url))
  }

  getInitialConfig() {
    return {}
  }
}
