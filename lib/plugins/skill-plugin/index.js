import Plugin from '../../plugin.js'

export default class SkillPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }
}
