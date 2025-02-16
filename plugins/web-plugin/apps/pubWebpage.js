import { MioFunction, Param } from '../../../lib/functions.js'
import path from 'path'
import fs from 'fs'

export class pubWebpage extends MioFunction {
  constructor() {
    super({
      name: 'pubWebpage',
      description:
        'A tool to help you create a webpage with the given HTML content.After public,you should show the webPage both in iframe and hyperlink.the iframe can be shown directly in this chat system.',
      params: [
        new Param({
          name: 'html',
          type: 'string',
          description: 'The html content to be rendered in the webpage.',
          required: true,
        }),
      ],
    })
    this.func = this.pubWebpage
  }
  async pubWebpage(e) {
    const origin = e.user.origin

    const savePath = path.join(
      // eslint-disable-next-line no-undef
      process.cwd(),
      `./output/uploaded/file/${e.user.id}.html`
    )
    const html = e.params.html
      .replace(/\\+n/g, '\n')          // 处理任意数量反斜杠的换行符
      .replace(/\\+"/g, '"')           // 处理任意数量反斜杠的引号

    // 检查路径是否存在
    const dirPath = path.dirname(savePath)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }

    // 创建或覆盖文件
    fs.writeFileSync(savePath, html)

    return {
      // iframe
      iframe: `<iframe src="${origin}/api/uploaded/file/${e.user.id}.html" width="100%" height="auto"></iframe>`,
      hyperlink: `<a href="${origin}/api/uploaded/file/${e.user.id}.html" target="_blank">点击这里在新窗口直接访问链接</a>`,
    }
  }
}
