/* eslint-disable camelcase */

import https from 'https'
import http from 'http'


async function imgUrlToBase64(url, id = 'default') {
  let final_url = url
  return new Promise((resolve) => {
    const startTime = Date.now()
    const httpOrHttps = final_url.startsWith('https://') ? https : http

    let req = httpOrHttps.get(final_url, (res) => {
      const contentType = res.headers['content-type']

      // 检查支持的图像格式
      if (!['image/jpeg', 'image/png'].includes(contentType)) {
        resolve(`Unsupported image format: ${contentType}`)
        return
      }

      const chunks = []
      res.on('data', (chunk) => {
        chunks.push(chunk)
      })

      res.on('end', () => {
        const data = Buffer.concat(chunks)
        const base64Img = `data:${contentType};base64,${data.toString('base64')}`
        const endTime = Date.now()
        const elapsedTime = endTime - startTime
        logger.debug(`[${id}] Base64转换耗时：${elapsedTime}ms`)
        resolve(base64Img)
      })
    })

    req.on('error', (e) => {
      resolve(`Error: ${e.message}`)
    })
  })
}

export { imgUrlToBase64 }
