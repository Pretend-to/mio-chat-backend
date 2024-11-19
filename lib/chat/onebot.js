/* eslint-disable no-undef */
/* eslint-disable camelcase */
import { WebSocket } from 'ws'
import EventEmitter from 'events'
import fs from 'fs'

/**
 * Onebot 协议实现
 * @param {Object} config 配置项
 */
export default class Onebot extends EventEmitter {
  constructor(config) {
    super()
    this.ws = null
    this.url = config.url
    this.qq = config.qq
    this.master = config.master
    this.userAgent = config.userAgent
    this.avaliable = false
    this.connect(this.url)
    this.enableStdin()
    this.lastTimestamp = 0
    this.counter = 0
  }

  /**
   * 连接 Onebot 服务
   * @param {string} url
   */
  connect(url) {
    logger.info('正在连接 Onebot 服务' + url)
    this.ws = new WebSocket(url, {
      headers: {
        'User-Agent': this.userAgent,
        'X-Client-Role': 'Universal',
        'X-Impl': 'Mio-Chat',
        'X-Onebot-Version': '11',
        'X-QQ-Version': 'android 9.0.17',
        'X-Self-ID': this.qq,
      },
    })

    const lifecycle = {
      time: null,
      self_id: this.qq,
      post_type: 'meta_event',
      meta_event_type: 'lifecycle',
      sub_type: 'connect',
      status: {
        self: { platform: 'qq', user_id: this.qq },
        online: true,
        good: true,
        'qq.status': '正常',
      },
      interval: 15000,
    }

    this.ws.on('open', async () => {
      this.avaliable = true
      this.emit('online')
      setTimeout(() => {
        const currentTimestamp = Date.now() // 获取当前时间的时间戳（单位：ms）
        lifecycle.time = currentTimestamp
        this.ws.send(JSON.stringify(lifecycle))
      }, 1000)
      setInterval(() => {
        // 检测链接是否正常
        if (this.ws.readyState === WebSocket.OPEN) {
          const currentTimestamp = Date.now() // 获取当前时间的时间戳（单位：ms）
          lifecycle.time = currentTimestamp
          lifecycle.meta_event_type = 'heartbeat'
          this.ws.send(JSON.stringify(lifecycle))
        }
      }, 15000)
    })

    this.ws.on('message', (message) => {
      try {
        const data = JSON.parse(message)
        this.eventHandler(data)
      } catch (e) {
        console.error('解析数据失败', e)
      }
    })

    this.ws.on('close', () => {
      logger.warn('链接断开，5秒后重试')
      this.avaliable = false
      setTimeout(() => {
        this.connect(this.url)
      }, 5000)
    })

    this.ws.on('error', (err) => {
      console.error('WebSocket error:', err) // 打印错误日志
    })
  }

  /**
   * 发送数据到 Onebot 服务
   * @param {Object} data
   */
  sendObject(data) {
    this.ws.send(JSON.stringify(data))
  }

  /**
   * 生成 Onebot 消息 ID
   * return 
   */
  generateMessageID() {
    let timestamp = Date.now()

    if (timestamp === this.lastTimestamp) {
      this.counter++
    } else {
      this.counter = 0
      this.lastTimestamp = timestamp
    }

    let randomPart = Math.floor(Math.random() * 1000) // 生成一个三位数的随机数

    let messageID =
      timestamp.toString().slice(-9) +
      this.counter.toString().padStart(1, '0') +
      randomPart.toString().padStart(3, '0')

    return parseInt(messageID)
  }

  /**
   * 以特定ID发送消息,如果传递id，则以指定id的身份发送消息
   * @param {Array} message
   * @param {number} id
   * @returns
   */
  messageWarrper = (message = null, sender, message_id = null) => {
    return {
      time: Date.now(),
      self_id: this.qq,
      post_type: 'message',
      message_type: 'private',
      sub_type: 'friend',
      message_id: message_id ?? this.generateMessageID(),
      target_id: this.qq,
      peer_id: this.qq,
      user_id: sender.isAdmin ? this.master : sender.id,
      message: message,
      raw_message: JSON.stringify(message),
      font: 0,
      sender: {
        user_id: sender.id ?? this.master,
        nickname: 'taffy',
        card: '',
        role: 'member',
        title: '',
        level: '',
      },
    }
  }

  /**
   * 监听标准输入,并将输入的消息发送到WebSocket连接
   */
  enableStdin() {
    // 监听标准输入
    logger.info('正在监听标准输入')
    process.stdin.on('data', (data) => {
      const text = data.toString().trim()
      const message = [
        {
          type: 'text',
          data: {
            text: text,
          },
        },
      ]
      const warpedMessage = this.messageWarrper(message, { isAdmin: true })

      // 将输入的消息发送到WebSocket连接
      this.sendObject(warpedMessage)

      logger.debug('已发送消息:' + data.toString().trim())
    })
  }

  /**
   * 解析处理事件
   * @param {Object} e
   */
  eventHandler(e){
    const data = e
    let errorEvent = null
    let resData = {}

    const messageListLog = (messageList) => {
      for (let message of messageList) {
        if (!message?.type) {
          logger.warn('消息类型错误')
          logger.debug(messageList)
          continue
        }
        if (message.type === 'reply') {
          logger.debug(`此消息引用了${message.data.id}`)
        } else if (message.type === 'text') {
          logger.info(
            `向${data.params.user_id}发送私聊消息：` + message.data.text
          )
        } else if (message.type === 'image') {
          const base64Data = message.data.file.replace(/^base64:\/\//, '')
          // 保存图片base64数据到本地
          fs.writeFile('imageBase64.txt', base64Data, 'utf8', function (err) {
            if (err) {
              console.error(err)
            } else {
              logger.info(
                `向${data.params.user_id}发送私聊图片，已保存Base64数据到本地`
              )
            }
          })

          const buffer = Buffer.from(base64Data, 'base64')

          fs.writeFile('image.jpg', buffer, 'base64', function (err) {
            if (err) {
              console.error(err)
            } else {
              logger.info(
                `向${data.params.user_id}发送私聊图片，已保存到本地`
              )
            }
          })
        } else if (message.type === 'record') {
          const url = message.data.file
          // 保存wav音频文件到本地
          fetch(url)
            .then((response) => response.arrayBuffer())
            .then((arrayBuffer) => {
              const buffer = Buffer.from(arrayBuffer)
              fs.writeFile('record.wav', buffer, 'binary', function (err) {
                if (err) {
                  console.error(err)
                } else {
                  logger.debug(
                    `收到${data.params.user_id}私聊语音，已保存到本地`
                  )
                }
              })
            })
            .catch((error) => console.error(error))
        } else {
          logger.debug(
            `收到${data.params.user_id}私聊消息，但不支持的消息类型: ${message.type}`
          )
          logger.debug(data.params.message)
        }
      }
    }

    try {
      if (data.action.startsWith('get_')) {
        resData = this.getFakeData(data.action)
      } else {
        logger.debug(data)
        logger.debug(data.params.message)

        const messageID = this.generateMessageID()

        switch (data.action) {
          case 'send_private_msg': {
            const messageList = data.params.message
            data.params.message_id = messageID
            messageListLog(messageList)
            resData = {
              message_id: messageID,
            }
            break
          }
          case 'send_private_forward_msg': {
            logger.debug(data.params)
            data.params.message_id = messageID
            const nodes = data.params.messages
            const messages = []
            for (let node of nodes) {
              messages.push(node.data.content)
            }
            if(messages.length > 0) messageListLog(messages)
            resData = {
              message_id: messageID,
            }
            break
          }
          case 'delete_msg':
            logger.debug(`收到撤回消息${data.params.message_id}`)
            break
          default:
            logger.debug(data)
            throw new Error(`未知的事件类型: ${data.action}`)
        }
        this.emit('event', data)

      }
    } catch (e) {
      console.error('处理事件失败', e)
      errorEvent = e
    }

    const response = {
      status: errorEvent ? 'failed' : 'ok',
      retcode: errorEvent ? 1 : 0,
      msg: errorEvent ? errorEvent.message : '',
      wording: errorEvent ? errorEvent.message : '',
      data: errorEvent ? {} : resData,
      echo: data.echo,
    }
    this.sendObject(response)
  }

  getFakeData(type) {
    switch (type) {
      case 'get_login_info':
        return {
          user_id: this.qq,
          nickname: 'mio',
        }
      case 'get_friend_list':
        return [
          {
            user_id: this.master,
            nickname: 'master',
            remark: '',
          },
          {
            user_id: this.qq,
            nickname: 'self',
            remark: '',
          },
        ]
      case 'get_group_list':
        return []
      case 'get_group_member_list':
        return []
      case 'get_cookies':
        return {
          cookies: '666',
        }
      default:
        throw new Error(`未知的获取数据类型: ${type}`)
    }
  }
}
