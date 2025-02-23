import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import * as fileType from 'file-type'


const getBufferName = async (buffer) => {
  const getBufferExt = async (buffer) => {
    const type = await fileType.fileTypeFromBuffer(buffer)
    return type?.ext
  }
  const getBufferMd5 = (buffer) => {
    const hash = crypto.createHash('md5')
    hash.update(buffer)
    return hash.digest('hex').slice(0, 8)
  }
  const md5 = getBufferMd5(buffer)
  const ext = await getBufferExt(buffer)
  return ext ? `${md5}.${ext}` : md5 // Handle cases where filetype can't be determined
}

class MioFunction {
  constructor(config) {
    (this.name = config.name),
    (this.func = config.func),
    (this.description = config.description),
    (this.params = config.params)
  }

  async run(e) {
    return await this.func(e)
  }

  json() {
    const json = {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
      },
    }
    if (this.params.length > 0) {
      json.function.parameters = {
        type: 'object',
        properties: {},
        required: [],
      }
      this.params.forEach((param) => {
        json.function.parameters.properties[param.name] = {
          type: param.type,
          description: param.description,
          ...(param.enum && { enum: param.enum }),
        }
        if (param.items) {
          json.function.parameters.properties[param.name].items = param.items
        }
        if (param.required) {
          json.function.parameters.required.push(param.name)
        }
      })
    }
    // return JSON.stringify(json)
    return json
  }

  async saveImage(baseUrl, data) {
    // 定义输出目录路径
    const outputDir = path.join(process.cwd(), 'output', 'generated', 'image')
    // 如果目录不存在，则创建目录
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    try {
      // data is likely an ArrayBuffer.  Convert to Buffer.
      const arrayBuffer = await data // Await the promise if data is a Promise<ArrayBuffer>
      const buffer = Buffer.from(arrayBuffer)

      const fileName = await getBufferName(buffer)
      const outputPath = path.join(outputDir, fileName)
      await fs.promises.writeFile(outputPath, buffer)
      const url = `${baseUrl}/f/gen/image/${fileName}`
      return url
    } catch (error) {
      console.error('Error processing image data:', error)
      throw new Error('Failed to save image: ' + error.message)
    }
  }

  saveTextFile(baseUrl, data, name) {
    // 保存纯文本文件
    const savePath = path.join(
      process.cwd(),
      'output',
      'generated', 
      'file',
      name
    )

    // 确保目录存在
    fs.mkdirSync(path.dirname(savePath), { recursive: true })

    // 写入文件
    fs.writeFileSync(savePath, data)

    // 返回文件的 URL
    return `${baseUrl}/f/gen/file/${name}`
  }
}

class Param {
  constructor(config) {
    this.name = config.name
    this.type = config.type
    this.required = config.required
    this.enum = config?.enumeration || null
    this.description = config?.description || null
    this.items = config?.items || null
  }
}

export { MioFunction, Param }
