import crypto from 'crypto'
import { MioFunction } from '../../../function.js'
import { EdgeTTS } from 'edge-tts-universal'

export default class TtsSpeech extends MioFunction {
  constructor() {
    super({
      description: '将文本转换为语音（Text-to-Speech），使用微软 Edge 在线 TTS 服务，免费无限制。支持中文（普通话、粤语）、英语、日语、韩语、法语、德语、西班牙语等 100+ 语言和音色。生成的音频播放器会被系统自动渲染展示，请勿在回复中重复输出音频链接。',
      name: 'tts_speech',
      parameters: {
        properties: {
          pitch: {
            description: '音调调整。例如 "+50Hz" 升高50Hz，"-30Hz" 降低30Hz。默认为 "+0Hz"（正常音调）。',
            type: 'string'
          },
          rate: {
            description: '语速调整。例如 "+50%" 加快50%，"-30%" 减慢30%。默认为 "+0%"（正常语速）。',
            type: 'string'
          },
          text: {
            description: '要合成语音的文本内容。支持中文、英文、日文、韩文等多语言混合文本，最长支持约 3000 字符。',
            type: 'string'
          },
          voice: {
            description: '语音音色名称。不传则使用插件默认音色。常用推荐：\n- 中文普通话女声: zh-CN-XiaoxiaoNeural（推荐）\n- 中文普通话男声: zh-CN-YunxiNeural\n- 中文粤语女声: zh-HK-HiuGaaiNeural\n- 美式英语女声: en-US-JennyNeural\n- 英式英语女声: en-GB-SoniaNeural\n- 日语女声: ja-JP-NanamiNeural\n- 韩语女声: ko-KR-SunHiNeural\n可使用 list_voices 工具查询所有可用音色。',
            type: 'string'
          },
          volume: {
            description: '音量调整。例如 "+50%" 提高50%，"-30%" 降低30%。默认为 "+0%"（正常音量）。',
            type: 'string'
          }
        },
        required: ['text'],
        type: 'object'
      }
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const { text, voice, rate, pitch, volume } = e.params
    const {config} = this.parentPlugin

    if (!text || text.trim().length === 0) {
      return { error: '请提供要合成的文本内容', success: false }
    }

    if (text.length > 5000) {
      return { error: `文本过长（${text.length} 字符），请控制在 5000 字以内`, success: false }
    }

    const selectedVoice = voice || config.defaultVoice || 'zh-CN-XiaoxiaoNeural'
    const selectedRate = rate || config.defaultRate || '+0%'
    const selectedPitch = pitch || config.defaultPitch || '+0Hz'
    const selectedVolume = volume || config.defaultVolume || '+0%'

    try {
      const tts = new EdgeTTS(text, selectedVoice, {
        pitch: selectedPitch,
        rate: selectedRate,
        volume: selectedVolume
      })

      const result = await tts.synthesize()
      const audioBuffer = Buffer.from(await result.audio.arrayBuffer())

      // Use ASCII-only filename: md5 prefix + voice name (safe chars only)
      const hash = crypto.createHash('md5').update(text + selectedVoice + Date.now()).digest('hex').slice(0, 8)
      const safeVoice = selectedVoice.replace(/[^a-zA-Z0-9_-]/g, '')
      const filename = `edge-tts_${hash}_${safeVoice}.mp3`

      const baseUrl = e.user.origin
      const audioUrl = await this.saveBinaryFile(baseUrl, audioBuffer, filename, 'file')

      const fileSize = (audioBuffer.length / 1024).toFixed(1)

      return {
        audioUrl: audioUrl,
        duration: result.subtitle?.length > 0
          ? `${(result.subtitle[result.subtitle.length - 1].offset / 10000000).toFixed(1)}s`
          : 'unknown',
        extraRender: [
          {
            type: 'audio',
            url: audioUrl,
            placement: 'outer'
          }
        ],
        fileSize: `${fileSize}KB`,
        filename: filename,
        message: `语音已生成 ✅`,
        success: true,
        voice: selectedVoice
      }
    } catch (error) {
      return { error: `语音合成失败: ${error.message}`, success: false }
    }
  }
}
