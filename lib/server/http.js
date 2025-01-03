/* eslint-disable no-undef */
/* eslint-disable camelcase */
import express from 'express'
import http from 'http'
import https from 'https'
import multer from 'multer'
import { savePic } from '../../utils/imgTools.js'
import rateLimit from 'express-rate-limit'
import config from '../config.js'
import path from 'path'
import fs from 'fs'
import logger from '../../utils/logger.js'

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const outputDir = 'output/uploaded/files/'

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    cb(null, outputDir) // 文件上传的目标文件夹
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`) // 文件名
  }
})

// 创建 multer 实例
const upload = multer({ storage: storage })

const serverConfig = config.server
// const painter = new Drawer()
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: serverConfig.max_rate_pre_min, // limit each IP to 10 requests per windowMs
  message: '此IP请求过多，请稍后再试',
  keyGenerator: logger.getIP,
})

function authWsConnection(request) {
  const params = new URLSearchParams(request.url.split('?')[1])
  const token = params.get('mio-chat-token')
  const id = params.get('mio-chat-id')

  if(id == 'undefined') throw new Error('Missing ID')
  const authConfig = config.web
  const userToken = authConfig.user_code
  const adminToken = authConfig.admin_code
  const userInfo = {
    ip: logger.getIP(request),
    origin: request.headers.origin,
    id: id,
    isAdmin: false,
  }
  if ( adminToken == token) {
    userInfo.isAdmin = true
  } else if( userToken && token !== userToken ){
    throw new Error('Invalid token')
  }
  return userInfo
}

// function checkModel(engine, name) {
//   // 如果engine以.img2img结尾，则去掉.img2img
//   if (engine.endsWith('.img2img'))
//     engine = engine.substring(0, engine.length - 8)

//   const model =
//     name.startsWith('mj') || name.startsWith('xl') ? name.substring(2) : name
//   const info = painter.getEngineInfo(engine)
//   const models = info.models
//   return models.find((item) => item.includes(model))
// }

function makeStandardResponse(data) {
  if (data) {
    return {
      code: 0,
      message: 'success',
      data: data,
    }
  }else{
    return {
      code: 1,
      message: 'failed',
      data: null,
    }
  }
}

// function enableSdServer(app){
//   app.get('/api/:model/sdapi/v1/samplers', async (req, res) => {
//     logger.info('获取方法列表', req)
//     const info = painter.getEngineMethod('prodia.stablediffusion')
//     res.status(200).send(info)
//   })

//   // GET 请求处理
//   app.get('/api/:model/sdapi/v1/upscalers', (req, res) => {
//     logger.info('获取放大方法列表', req)
//     const info = { data: [] }
//     res.status(200).send(info)
//   })

//   // GET 请求处理
//   app.get('/api/:model/sdapi/v1/loras', (req, res) => {
//     logger.info('AP获取LoRa列表', req)
//     const info = [
//       {
//         name: 'Lora 1',
//         alias: 'Alias 1',
//       },
//       {
//         name: 'Lora 2',
//         alias: 'Alias 2',
//       },
//     ]

//     res.status(200).send(info)
//   })

//   // #ap接口状态
//   app.get('/api/:model/sdapi/v1/progress', (req, res) => {
//     res.json({
//       eta_relative: '0',
//       progress: 1,
//     })
//   })

//   //定义路由
//   app.post('/api/:model/sdapi/v1/txt2img', async (req, res) => {
//     let model = req.params.model
//     let engine
//     if (model.startsWith('mj')) {
//       engine = 'pixart.a'
//       if (model === 'mjDefault') model = '(No style)'
//     } else if (model.startsWith('xl')) {
//       engine = 'prodia.xl'
//     } else {
//       engine = 'prodia.v1'
//     }
//     const wholemodel = checkModel(engine, model)
//     const data = req.body
//     const prompt = data.prompt

//     // TEST
//     if (prompt == '114514') {
//       const png64 = await getPNGBase64(
//         'https://api.krumio.com/qava?qq=3038848622',
//         114514,
//       )
//       const responseData = {
//         images: [png64],
//         parameters: {
//           seed: 114514,
//           sampler_index: '114514',
//           width: 666,
//           height: 666,
//           cfg_scale: 666,
//           prompt: '塔菲不知道喵',
//           negative_prompt: '关注taffy谢谢喵',
//           steps: 666,
//         },
//       }
//       res.status(200).send(responseData)
//       return
//     }

//     const config = {
//       width: data.width,
//       height: data.height,
//       steps: data.steps,
//       negative_prompt: data.negative_prompt,
//       cfg_scale: data.cfg_scale,
//       model: wholemodel,
//       sampler_index: data.sampler_index,
//       seed: data.seed,
//     }

//     try {
//       if (!wholemodel) {
//         throw new Error('Invalid model')
//       } else {
//         logger.info(
//           `收到 Web 绘图请求\n使用模型：${wholemodel}\n分辨率：${config.width}x${config.height}\nprompt：\n${prompt}`,
//           req,
//         )
//         const result = await painter.draw(engine, prompt, config)
//         if (result.code === 0) {
//           const png64 = await getPNGBase64(result.result.data, result.id)
//           if (drawConfig.stroge) {
//             const startTime2 = Date.now()
//             const save = await savePic(result.base64, engine, model)
//             const endTime2 = Date.now()
//             const elapsedTime2 = endTime2 - startTime2
//             logger.info(`图片保存到本地耗时：${elapsedTime2} 毫秒`)

//             if (save.error) {
//               logger.error('图片保存到本地失败' + save.error)
//             } else {
//               logger.info('图片保存到本地成功' + save.path)
//             }
//           }

//           const responseData = {
//             images: [png64],
//             parameters: {
//               ...result.result.config,
//               sampler_index: result.result.config.sampler,
//             },
//           }
//           res.status(200).send(responseData)
//         } else {
//           res.status(500).send('Internal Server Error')
//         }
//       }
//     } catch (error) {
//       logger.error(error, req)
//       res.status(500).send('Internal Server Error')
//     }
//   })

//   app.post('/api/:model/sdapi/v1/img2img', async (req, res) => {
//     let model = req.params.model
//     let engine
//     if (model.startsWith('xl')) {
//       engine = 'prodia.xl.img2img'
//     } else if (model == 'upscale') {
//       engine = 'prodia.upscale.img2img'
//     } else {
//       engine = 'prodia.v1.img2img'
//     }
//     let config
//     const wholemodel = checkModel(engine, model)

//     const data = req.body
//     const prompt = data.prompt
//     const imgdata = data.init_images[0]

//     if (prompt == '2' || prompt == '4') {
//       config = {
//         base64: imgdata.split(',')[1],
//         prompt: prompt,
//       }
//     } else {
//       config = {
//         base64: imgdata.split(',')[1],
//         width: data.width,
//         height: data.height,
//         steps: data.steps,
//         negative_prompt: data.negative_prompt,
//         cfg_scale: data.cfg_scale,
//         model: wholemodel,
//         method: data.sampler_index,
//         seed: data.seed,
//         denoising_strength: data.denoising_strength,
//       }
//     }

//     try {
//       if (!wholemodel && model !== 'upscale') {
//         throw new Error('Invalid model')
//       } else {
//         logger.info(
//           `收到 Web 图生图请求\n使用模型：${wholemodel ? wholemodel : model}\n分辨率：${data.width}x${data.height}\nprompt：\n${prompt}`,
//           req,
//         )
//         const result = await painter.draw(engine, prompt, config)
//         if (result.code === 0) {
//           const png64 = await getPNGBase64(result.result.data, result.id)

//           if (drawConfig.stroge) {
//             const startTime2 = Date.now()
//             const save = await savePic(result.base64, engine, model)
//             const endTime2 = Date.now()
//             const elapsedTime2 = endTime2 - startTime2
//             logger.info(`图片保存到本地耗时：${elapsedTime2} 毫秒`)

//             if (save.error) {
//               logger.error('图片保存到本地失败' + save.error)
//             } else {
//               logger.info('图片保存到本地成功' + save.path)
//             }
//           }

//           const responseData = {
//             images: [png64],
//             parameters: {
//               ...result.result.config,
//               sampler_index: result.result.config.sampler,
//             },
//           }
//           res.status(200).send(responseData)
//         } else {
//           res.status(500).send('Internal Server Error')
//         }
//       }
//     } catch (error) {
//       logger.error(error, req)
//       res.status(500).send('Internal Server Error')
//     }
//   })

//   // 不知道干啥的，ap要的
//   app.get('/api/:model', (req, res) => {
//     console.log(res)

//     logger.info('AP检查接口有效性', req)
//     res.status(200).json({ data: { detail: 'ok' } })
//   })
// }

export function startServer() {
  const app = express()

  // 获取当前工作目录（启动目录）
  const currentDir = process.cwd()
  const distDir = path.join(currentDir, 'dist')

  // 设置静态文件目录
  app.use(express.static(distDir))

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

  // 设置图像反向代理以解决跨域问题
  app.get('/api/proxy', (req, res) => {
  // 从查询参数中获取url参数,即需要反向代理的图片
    const url = req.query.url
    if (!url) {
      res.status(400).json({
        code: 400,
        message: 'url参数不能为空',
      })
      return
    }

    // 选择http或https模块
    const client = url.startsWith('https') ? https : http

    // 设置反向代理
    client.get(url, (proxyRes) => {
    // 设置响应头
      res.writeHead(proxyRes.statusCode, proxyRes.headers)

      // 管道流
      proxyRes.pipe(res)
    }).on('error', (err) => {
    // 处理错误
      res.status(500).json({
        code: 500,
        message: '代理请求失败',
        error: err.message,
      })
    })
  })

  app.get('/api/base_info', (req, res) => {
    res.status(200).json({
      code: 0,
      message: 'success',
      data: {
        full_screen: config.web.full_screen,
        beian: config.web.beian,
        admin_qq: config.onebot.admin_qq || 10000,
        bot_qq: config.onebot.bot_qq,
        title: config.web.title ,
      },
    })
  })

  app.get('/api/onebot/plugins', (req, res) => {
    res.status(200).json({
      code: 0,
      message: 'success',
      data: {
        options:config.onebot.plugins.options,
      },
    })
  })

  app.get('/api/openai/:type', (req, res) => {
    const type = req.params.type
    if (type == 'presets'){
      const presets = config.openai.presets
      const nums = req.query.nums ? parseInt(req.query.nums) : 9
      const start = req.query.start ? parseInt(req.query.start) : 0
      const search = req.query.search || ''
      if(!search)
        res.status(200).json(makeStandardResponse(presets.slice(start, start + nums)))
      else{
        const result = presets.filter(item => item.name.includes(search))
        res.status(200).json(makeStandardResponse(result))
      }
    }else if(type == 'tools'){
      res.status(200).json(makeStandardResponse({tools:middleware.plugins}))
    }
  })

  app.post('/api/upload/image', async (req, res) => {

    const response = {
      code: null,
      message:'',
      data: {
        url: '',
      },

    }

    const image = req.body.image
    const startTime = Date.now()
    // const save = savePic(base64, type, name)
    const save = await savePic(image, 'uploaded', 'images')

    const endTime = Date.now()
    const elapsedTime = endTime - startTime
    logger.info(`图片保存到本地耗时：${elapsedTime} 毫秒`)

    if (save.error) {
      logger.error('图片保存到本地失败' + save.error)
      response.code = 1
      response.message = '图片保存到本地失败' + save.error

      res.status(500).json(response)

    } else {
      logger.info('图片保存到本地成功' + save.path)
      response.code = 0
      response.message = '图片保存到本地成功'
      response.data.url = '/api/uploaded/images?name=' + save.name

      res.status(200).json(response)
    }
  })

  // 创建上传接口
  app.post('/api/upload/file', upload.single('file'), (req, res) => {
    const response = {
      code: null,
      message:'',
      data: {
        url: '',
      },

    }

    if (!req.file) {
      logger.error('未上传文件')
      response.code = 1
      response.message = '未上传文件'
      res.status(400).json(response)
    }

    response.code = 0
    response.message = '上传成功'
    console.log(req.file)
    response.data.url = '/api/uploaded/files?name=' + req.file.filename

    res.status(200).json(response)
  })

  app.get('/api/uploaded/:type',(req,res)=>{
    const type = req.params.type
    const name = req.query.name
    const imgPath = path.join(process.cwd() ,`./output/uploaded/${type}/${name}`)
    console.log(imgPath)
    if (!fs.existsSync(imgPath)) {
      res.status(404).send('Not Found')
      return
    }

    res.sendFile(imgPath)

  })

  app.get('/api/qava', async (req, res) => {
    const nk = req.query.q
    const imageUrl = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${nk}`
  
    try {
      const response = await fetch(imageUrl)
  
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}${response.statusText}`)
      }
  
      const buffer = await response.arrayBuffer()
      const contentType = response.headers.get('Content-Type')
  
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', buffer.byteLength)
      res.send(new Buffer.from(buffer))
    } catch (error) {
      console.error(error)
      res.status(500).send('Error fetching image')
    }
  })
  
  // if (drawConfig.enable_sd_server) enableSdServer(app)

  // 通配符路由，处理SPA的路由
  app.get('*', (req,res) => {
    return res.sendFile(path.join(process.cwd(), '/dist/index.html'))
  })

  // 启动服务器
  const port = serverConfig.port ?? 3080
  const host = serverConfig.host ?? '0.0.0.0'
  const server = app.listen(port, host, () => {
    logger.info(`服务开启，访问地址: http://127.0.0.1:${port}`)
  })

  // 将 WebSocket 服务器与现有 HTTP 服务器关联
  server.on('upgrade', (request, socket, head) => {
    let userInfo = {}
    try {
      userInfo = authWsConnection(request)
      middleware.wsServer.wss.handleUpgrade(request, socket, head, (ws) => {
        middleware.wsServer.wss.emit('connection', ws, userInfo)
      })
    } catch (error) {
      logger.error('WebSocket连接失败：' + error.message)
    }
  })
}
