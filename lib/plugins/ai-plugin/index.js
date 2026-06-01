import Plugin from '../../plugin.js'

export default class AIPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }

  getInitialConfig() {
    return {
      vision: {
        mode: 'auto', // 'auto' | 'manual' | 'specified'
        provider: '', // Default provider instance ID (e.g. 'mimo', 'openai', 'gemini')
        model: '',    // Default model name (e.g. 'mimo-v2.5', 'gpt-5.4-mini')
        manual: {
          baseUrl: 'https://api.openai.com/v1',
          apiKey: '',
          model: 'gpt-4o'
        }
      }
    }
  }
}
