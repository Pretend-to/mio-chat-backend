import Plugin from '../../plugin.js'

export default class FileEditorPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }
}
