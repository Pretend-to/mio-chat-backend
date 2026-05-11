import Plugin from '../../plugin.js'

export default class AIPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }

  getInitialConfig() {
    return {
      vision: {
        mode: 'auto', // 'auto' | 'manual'
        manual: {
          baseUrl: 'https://api.openai.com/v1',
          apiKey: '',
          model: 'gpt-4o'
        }
      }
    }
  }
}
