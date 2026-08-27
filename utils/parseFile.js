import officeParser from 'officeparser'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { URL, fileURLToPath } from 'url'

const textFileTypes = new Set([
  '.txt',
  '.md',
  '.html',
  '.csv',
  '.json',
  '.xml',
  '.yaml',
  '.ini',
  '.log',
  '.sql',
  '.rss',
  '.js',
  '.py',
  '.java',
  '.c',
  '.cpp',
  '.cs',
  '.rb',
  '.go',
  '.php',
  '.rs',
  '.sh',
  '.swift',
  '.kt',
  '.scala',
])

const officeFileTypes = [
  '.docx',
  '.xlsx',
  '.pptx',
  '.odt',
  '.ods',
  '.odp',
  '.pdf',
]

async function ensureDirExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error
    }
  }
}

export async function parseFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase()
    if (textFileTypes.has(ext)) {
      const content = await fs.readFile(filePath, 'utf8')
      return { content, error: null }
    } else if (officeFileTypes.includes(ext)) {
      const content = await officeParser.parseOfficeAsync(filePath)
      return { content, error: null }
    } else {
      throw new Error('不支持的文件类型')
    }
  } catch (error) {
    return { content: null, error: error.message }
  }
}

export async function parseFileWithUrl(fileUrl) {
  let tempFilePath = null
  try {
    // 1. 处理 file:// 协议
    if (fileUrl.startsWith('file://')) {
      const filePath = fileURLToPath(fileUrl)
      return await parseFile(filePath)
    }

    // 2. 处理虚拟存储路径 /f/up/... 或 /f/gen/... 或本地绝对/相对路径
    if (fileUrl.startsWith('/f/up/')) {
      const parts = fileUrl.split('/')
      const type = parts[3]
      const name = parts[4]?.split('?')[0]
      const filePath = path.join(process.cwd(), 'output', 'uploaded', type, name)
      return await parseFile(filePath)
    }
    if (fileUrl.startsWith('/f/gen/')) {
      const parts = fileUrl.split('/')
      const name = parts[4]?.split('?')[0]
      const filePath = path.join(process.cwd(), 'output', 'generated', 'file', name)
      return await parseFile(filePath)
    }
    if (path.isAbsolute(fileUrl) || fileUrl.startsWith('./') || fileUrl.startsWith('../')) {
      const filePath = path.isAbsolute(fileUrl) ? fileUrl : path.join(process.cwd(), fileUrl)
      return await parseFile(filePath)
    }

    // 3. 提取文件名并下载 HTTP/HTTPS 网络文件
    const url = new URL(fileUrl)
    const {pathname} = url
    const filename = path.basename(pathname)

    // 确保临时目录存在
    const tempDir = os.tmpdir()
    await ensureDirExists(tempDir)

    tempFilePath = path.join(tempDir, filename)

    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, url: ${fileUrl}`)
    }

    const buffer = await response.arrayBuffer()
    await fs.writeFile(tempFilePath, Buffer.from(buffer))

    const result = await parseFile(tempFilePath)
    return result
  } catch (error) {
    console.error('解析文件失败:', error) // 打印完整错误信息
    return { content: null, error: error.message }
  } finally {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath)
      } catch (unlinkError) {
        console.error('删除临时文件失败:', unlinkError)
      }
    }
  }
}
