import Plugin from '../../plugin.js'

export default class AIPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }

  getInitialConfig() {
    return {
      vision: {
        manual: {
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o'
        },
        mode: 'auto', // 'auto' | 'manual' | 'specified'
        model: '',    // Default model name (e.g. 'mimo-v2.5', 'gpt-5.4-mini')
        provider: '', // Default provider instance ID (e.g. 'mimo', 'openai', 'gemini')
      }
    }
  }
}
