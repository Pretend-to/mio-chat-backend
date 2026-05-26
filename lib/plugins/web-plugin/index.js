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
          chromePath: '',
        },
      },
      chromePath: '',
    }
  }
}
