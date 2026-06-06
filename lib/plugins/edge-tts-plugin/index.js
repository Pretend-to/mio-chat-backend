import Plugin from '../../plugin.js'

export default class EdgeTTSPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }

  getInitialConfig() {
    return {
      defaultVoice: 'zh-CN-XiaoxiaoNeural',
      defaultRate: '+0%',
      defaultPitch: '+0Hz',
      defaultVolume: '+0%'
    }
  }
}
