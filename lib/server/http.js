/* eslint-disable no-undef */
/* eslint-disable camelcase */
import express from 'express'
import Drawer from '../draw.js'
import { savePic, getPNGBase64 } from '../draw/imgtools.js'
import logger from '../logger.js'
import rateLimit from 'express-rate-limit'
import config from '../config.js'
import path from 'path'

const serverConfig = config.server
const drawConfig = config.draw
const painter = new Drawer()
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: serverConfig.max_rate_pre_min, // limit each IP to 10 requests per windowMs
  message: '此IP请求过多，请稍后再试',
  keyGenerator: logger.getIP,
})

function checkModel(engine, name) {
  // 如果engine以.img2img结尾，则去掉.img2img
  if (engine.endsWith('.img2img'))
    engine = engine.substring(0, engine.length - 8)

  const model =
    name.startsWith('mj') || name.startsWith('xl') ? name.substring(2) : name
  const info = painter.getEngineInfo(engine)
  const models = info.models
  return models.find((item) => item.includes(model))
}

function enableSdServer(app){
  app.get('/api/:model/sdapi/v1/samplers', async (req, res) => {
    logger.info('获取方法列表', req)
    const info = painter.getEngineMethod('prodia.stablediffusion')
    res.status(200).send(info)
  })

  // GET 请求处理
  app.get('/api/:model/sdapi/v1/upscalers', (req, res) => {
    logger.info('获取放大方法列表', req)
    const info = { data: [] }
    res.status(200).send(info)
  })

  // GET 请求处理
  app.get('/api/:model/sdapi/v1/loras', (req, res) => {
    logger.info('AP获取LoRa列表', req)
    const info = [
      {
        name: 'Lora 1',
        alias: 'Alias 1',
      },
      {
        name: 'Lora 2',
        alias: 'Alias 2',
      },
    ]

    res.status(200).send(info)
  })

  // #ap接口状态
  app.get('/api/:model/sdapi/v1/progress', (req, res) => {
    res.json({
      eta_relative: '0',
      progress: 1,
    })
  })

  //定义路由
  app.post('/api/:model/sdapi/v1/txt2img', async (req, res) => {
    let model = req.params.model
    let engine
    if (model.startsWith('mj')) {
      engine = 'pixart.a'
      if (model === 'mjDefault') model = '(No style)'
    } else if (model.startsWith('xl')) {
      engine = 'prodia.xl'
    } else {
      engine = 'prodia.v1'
    }
    const wholemodel = checkModel(engine, model)
    const data = req.body
    const prompt = data.prompt

    // TEST
    if (prompt == '114514') {
      const png64 = await getPNGBase64(
        'https://api.krumio.com/qava?qq=3038848622',
        114514,
      )
      const responseData = {
        images: [png64],
        parameters: {
          seed: 114514,
          sampler_index: '114514',
          width: 666,
          height: 666,
          cfg_scale: 666,
          prompt: '塔菲不知道喵',
          negative_prompt: '关注taffy谢谢喵',
          steps: 666,
        },
      }
      res.status(200).send(responseData)
      return
    }

    const config = {
      width: data.width,
      height: data.height,
      steps: data.steps,
      negative_prompt: data.negative_prompt,
      cfg_scale: data.cfg_scale,
      model: wholemodel,
      sampler_index: data.sampler_index,
      seed: data.seed,
    }

    try {
      if (!wholemodel) {
        throw new Error('Invalid model')
      } else {
        logger.info(
          `收到 Web 绘图请求\n使用模型：${wholemodel}\n分辨率：${config.width}x${config.height}\nprompt：\n${prompt}`,
          req,
        )
        const result = await painter.draw(engine, prompt, config)
        if (result.code === 0) {
          const png64 = await getPNGBase64(result.result.data, result.id)
          if (drawConfig.stroge) {
            const startTime2 = Date.now()
            const save = await savePic(result.base64, engine, model)
            const endTime2 = Date.now()
            const elapsedTime2 = endTime2 - startTime2
            logger.info(`图片保存到本地耗时：${elapsedTime2} 毫秒`)

            if (save.error) {
              logger.error('图片保存到本地失败' + save.error)
            } else {
              logger.info('图片保存到本地成功' + save.path)
            }
          }

          const responseData = {
            images: [png64],
            parameters: {
              ...result.result.config,
              sampler_index: result.result.config.sampler,
            },
          }
          res.status(200).send(responseData)
        } else {
          res.status(500).send('Internal Server Error')
        }
      }
    } catch (error) {
      logger.error(error, req)
      res.status(500).send('Internal Server Error')
    }
  })

  app.post('/api/:model/sdapi/v1/img2img', async (req, res) => {
    let model = req.params.model
    let engine
    if (model.startsWith('xl')) {
      engine = 'prodia.xl.img2img'
    } else if (model == 'upscale') {
      engine = 'prodia.upscale.img2img'
    } else {
      engine = 'prodia.v1.img2img'
    }
    let config
    const wholemodel = checkModel(engine, model)

    const data = req.body
    const prompt = data.prompt
    const imgdata = data.init_images[0]

    if (prompt == '2' || prompt == '4') {
      config = {
        base64: imgdata.split(',')[1],
        prompt: prompt,
      }
    } else {
      config = {
        base64: imgdata.split(',')[1],
        width: data.width,
        height: data.height,
        steps: data.steps,
        negative_prompt: data.negative_prompt,
        cfg_scale: data.cfg_scale,
        model: wholemodel,
        method: data.sampler_index,
        seed: data.seed,
        denoising_strength: data.denoising_strength,
      }
    }

    try {
      if (!wholemodel && model !== 'upscale') {
        throw new Error('Invalid model')
      } else {
        logger.info(
          `收到 Web 图生图请求\n使用模型：${wholemodel ? wholemodel : model}\n分辨率：${data.width}x${data.height}\nprompt：\n${prompt}`,
          req,
        )
        const result = await painter.draw(engine, prompt, config)
        if (result.code === 0) {
          const png64 = await getPNGBase64(result.result.data, result.id)

          if (drawConfig.stroge) {
            const startTime2 = Date.now()
            const save = await savePic(result.base64, engine, model)
            const endTime2 = Date.now()
            const elapsedTime2 = endTime2 - startTime2
            logger.info(`图片保存到本地耗时：${elapsedTime2} 毫秒`)

            if (save.error) {
              logger.error('图片保存到本地失败' + save.error)
            } else {
              logger.info('图片保存到本地成功' + save.path)
            }
          }

          const responseData = {
            images: [png64],
            parameters: {
              ...result.result.config,
              sampler_index: result.result.config.sampler,
            },
          }
          res.status(200).send(responseData)
        } else {
          res.status(500).send('Internal Server Error')
        }
      }
    } catch (error) {
      logger.error(error, req)
      res.status(500).send('Internal Server Error')
    }
  })

  // 不知道干啥的，ap要的
  app.get('/api/:model', (req, res) => {
    console.log(res)

    logger.info('AP检查接口有效性', req)
    res.status(200).json({ data: { detail: 'ok' } })
  })
}

export function startServer() {
  const app = express()

  // 设置静态文件目录
  app.use(express.static('dist'))

  app.set('trust proxy', true)
  app.use(express.json({ limit: '8096kb' }))
  app.use((req, res, next) => {
    const ip = logger.getIP(req)
    if (ip !== '127.0.0.1') {
      limiter(req, res, () => {
        const remainingRequests = res.getHeader('X-RateLimit-Remaining')
        logger.info(
          `本分钟请求次数: ${serverConfig.max_rate_pre_min - remainingRequests}, 剩余次数: ${remainingRequests}`,
          req,
        )
        next()
      })
    } else {
      next()
    }
  })

  // 设置允许跨域访问的域名和方法
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    next()
  })


  app.get('/api/gateway', (req, res) => {
    res.status(200).json({
      code: 0,
      message: 'success',
      data: {
        name: 'mio-chat-backend',
        version: '1.0.0',
        description: 'mio-chat-backend is a backend service for mio-chat.',
      },
    })
  })

  app.get('/api/qava', (req, res) => {
    const nk = req.query.q
    const imageUrl = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${nk}`

    // 发送重定向响应
    res.redirect(imageUrl)
  })

  if (serverConfig.enable_sd_server) enableSdServer(app)


  // 通配符路由，处理SPA的路由
  app.get('*', (req,res) => {
    // 如果请求的不是css、js、图片、字体等静态资源，则返回index.html
    if (!req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|ttf|woff|woff2|eot)$/)) 
      return res.sendFile(path.join(process.cwd(), '/dist/index.html'))
  })

  // 启动服务器
  const port = serverConfig.port ?? 3080
  const host = serverConfig.host ?? '0.0.0.0'
  const server = app.listen(port, host, () => {
    logger.info(`服务开启，端口：${port}`)
  })

  // 将 WebSocket 服务器与现有 HTTP 服务器关联
  server.on('upgrade', (request, socket, head) => {
    middleware.wsServer.wss.handleUpgrade(request, socket, head, (ws) => {
      middleware.wsServer.wss.emit('connection', ws, request)
    })
  })
}
