/* eslint-disable camelcase */
/* eslint-disable no-undef */
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'

const savePic = async (pic, engine, model) => {
  try {
    const shortModel = model.includes('[') ? model.split(' [')[0] : model
    let buffer
    let type
    if (pic.startsWith('data:image/jpeg;base64,')) {
      type = 'jpeg'
    } else if (pic.startsWith('data:image/png;base64,')) {
      type = 'png'
    } else {
      type = 'jpg'
    }

    if (pic.startsWith('http')) {
      const response = await fetch(pic)
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      // 传入的pic是个base64
      buffer = Buffer.from(pic.split(',')[1], 'base64')
    }

    const outputDir = path.join('./output', engine, shortModel)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const timestamp = new Date().getTime()
    const outPath = path.join(outputDir, timestamp + '.' + type)
    fs.writeFileSync(outPath, buffer)

    return { error: false, path: outPath, name:timestamp + '.' + type }
  } catch (error) {
    logger.debug(error)
    return { error: error, path: null }
  }
}

const getPNGBase64 = async (url, id) => {
  try {
    if (url.startsWith('http')) {
      return await imgUrlToBase64(url, id)
    } else {
      const response = await fetch(url)
      const startTime2 = Date.now()
      const arrayBuffer = await response.arrayBuffer()
      const endTime2 = Date.now()
      const elapsedTime2 = endTime2 - startTime2
      logger.info(`[${id}] PNG-Base64转换耗时：${elapsedTime2}ms`)
      const buffer = Buffer.from(arrayBuffer)
      const base64String = 'data:image/png;base64,' + buffer.toString('base64')

      return base64String
    }
  } catch (error) {
    logger.error(error)
    return null
  }
}

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


export { getPNGBase64, savePic, imgUrlToBase64 }
