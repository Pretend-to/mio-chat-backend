import { spawn } from 'node:child_process'
import { encode, isSilk } from 'silk-wasm'

/**
 * 将任意音频二进制数据（MP3/WAV/AAC/OGG/FLAC 等）转码为微信 Silk v3 格式（以 0x02 开头）
 * @param {Buffer} audioBuffer
 * @param {object} opts
 * @param {number} [opts.sampleRate=24000]
 * @returns {Promise<{ silkBuffer: Buffer, durationMs: number }>}
 */
export async function convertAudioToSilk(audioBuffer, { sampleRate = 24000 } = {}) {
  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error('音频数据为空，无法转码')
  }

  // 1. 如果本身已经是 Silk 格式（以 0x02 开头或通过 isSilk 校验）
  if (isSilk(audioBuffer) || audioBuffer[0] === 0x02) {
    return {
      durationMs: 0,
      silkBuffer: audioBuffer,
    }
  }

  // 2. 先尝试直接使用 silk-wasm 编码（适用于标准 WAV 或 raw PCM）
  try {
    const directSilk = await encode(audioBuffer, sampleRate)
    if (directSilk?.data?.length > 0) {
      return {
        durationMs: directSilk.duration || Math.round((audioBuffer.length / (sampleRate * 2)) * 1000),
        silkBuffer: Buffer.from(directSilk.data),
      }
    }
  } catch {}

  // 3. 通过 ffmpeg 将压缩音频（MP3/AAC/OGG/FLAC/M4A）转为 16-bit 24000Hz 单声道 PCM
  const pcmBuffer = await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-f', 's16le',
      '-ar', String(sampleRate),
      '-ac', '1',
      'pipe:1',
    ])

    const chunks = []
    let errOutput = ''

    ff.stdout.on('data', (c) => chunks.push(c))
    ff.stderr.on('data', (c) => {
      errOutput += c.toString()
    })

    ff.on('error', (err) => {
      reject(new Error(`ffmpeg 启动失败: ${err.message}`))
    })

    ff.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks))
      } else {
        reject(new Error(`ffmpeg 转码失败 (code=${code}): ${errOutput.slice(-200)}`))
      }
    })

    ff.stdin.end(audioBuffer)
  })

  // 4. 将 PCM 使用 silk-wasm 编码为带 0x02 头的腾讯微信 Silk
  const silkRes = await encode(pcmBuffer, sampleRate)
  const silkData = Buffer.from(silkRes.data)

  return {
    durationMs: silkRes.duration || Math.round((pcmBuffer.length / (sampleRate * 2)) * 1000),
    silkBuffer: silkData,
  }
}

export default { convertAudioToSilk }
