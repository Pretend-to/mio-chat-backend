import Plugin from '../../plugin.js'

export default class EdgeTTSPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }

  getInitialConfig() {
    return {
      defaultPitch: '+0Hz',
      defaultRate: '+0%',
      defaultVoice: 'zh-CN-XiaoxiaoNeural',
      defaultVolume: '+0%'
    }
  }
}
