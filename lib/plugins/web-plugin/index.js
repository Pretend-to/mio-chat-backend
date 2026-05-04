import Plugin from '../../plugin.js'

export default class WebPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }

  getInitialConfig() {
    return {
      search: {
        engine: 'bing',
        puppeteer: true,
      },
      parse: {
        puppeteer: {
          engine: 'bing',
        },
      },
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
