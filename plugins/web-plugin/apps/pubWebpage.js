import { MioFunction, Param } from '../../../lib/functions.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export class pubWebpage extends MioFunction {
  constructor() {
    super({
      name: 'pubWebpage',
      description:
        'A tool to help you create a webpage with the given HTML content. After public, you should show the webPage both in iframe and hyperlink. The iframe can be shown directly in this chat system.',
      params: [
        new Param({
          name: 'html',
          type: 'string',
          description: 'The html content to be rendered in the webpage.',
          required: true,
        }),
      ],
    });
    this.func = this.pubWebpage;
  }

  async pubWebpage(e) {
    const origin = e.user.origin;
    const uid = e.user.id;
    const timestamp = Date.now().toString();
    
    // Generate MD5 hash using uid and timestamp
    const hash = crypto.createHash('md5').update(`${uid}${timestamp}`).digest('hex');
    const savePath = path.join(
      process.cwd(),
      `./output/generated/html/${hash}.html`
    );
    const html = e.params.html;

    // Check if the directory exists
    const dirPath = path.dirname(savePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Create or overwrite file
    fs.writeFileSync(savePath, html);

    return {
      // iframe
      iframe: `<iframe src="${origin}/api/generated/html/${hash}.html" width="100%" height="auto"></iframe>`,
      hyperlink: `<a href="${origin}/api/generated/html/${hash}.html" target="_blank">点击这里在新窗口直接访问链接</a>`,
    };
  }
}
