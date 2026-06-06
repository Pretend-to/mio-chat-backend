import { MioFunction } from '../../../function.js'
import { VoicesManager } from 'edge-tts-universal'

export default class ListVoices extends MioFunction {
  constructor() {
    super({
      name: 'list_voices',
      description: '查询微软 Edge TTS 所有可用的语音音色列表。支持按语言、地区、性别筛选。返回音色名称、语言、性别等信息，可用于 tts_speech 工具的 voice 参数。',
      parameters: {
        type: 'object',
        properties: {
          locale: {
            type: 'string',
            description: '按语言区域筛选，例如 "zh-CN"（中文普通话）、"en-US"（美式英语）、"ja-JP"（日语）、"zh-HK"（粤语）。不传则返回所有音色。'
          },
          gender: {
            type: 'string',
            description: '按性别筛选：Female（女声）或 Male（男声）。不传则返回所有性别。',
            enum: ['Female', 'Male']
          },
          language: {
            type: 'string',
            description: '按语言代码筛选，例如 "zh"（中文）、"en"（英语）、"ja"（日语）。比 locale 更宽松。'
          }
        }
      }
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const { locale, gender, language } = e.params

    try {
      const voicesManager = await VoicesManager.create()

      const filter = {}
      if (locale) filter.Locale = locale
      if (gender) filter.Gender = gender
      if (language) filter.Language = language

      let voices
      if (Object.keys(filter).length > 0) {
        voices = voicesManager.find(filter)
      } else {
        // Get all voices
        const all = voicesManager.listVoices()
        voices = all
      }

      if (!voices || voices.length === 0) {
        return {
          success: true,
          message: '未找到匹配的音色',
          total: 0,
          voices: []
        }
      }

      // Format the results
      const formatted = voices.map(v => ({
        name: v.ShortName,
        locale: v.Locale,
        gender: v.Gender,
        displayName: v.DisplayName || v.FriendlyName || v.ShortName,
        localName: v.LocalName || ''
      }))

      // Sort by locale then name
      formatted.sort((a, b) => a.locale.localeCompare(b.locale) || a.name.localeCompare(b.name))

      const filterDesc = locale ? `地区: ${locale}` : language ? `语言: ${language}` : ''
      const genderDesc = gender ? `, 性别: ${gender}` : ''

      return {
        success: true,
        message: `找到 ${formatted.length} 个音色${filterDesc}${genderDesc}`,
        total: formatted.length,
        filter: { locale, gender, language },
        voices: formatted
      }
    } catch (error) {
      return { success: false, error: `查询音色列表失败: ${error.message}` }
    }
  }
}
