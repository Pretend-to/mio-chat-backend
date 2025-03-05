/* eslint-disable no-undef */
/* eslint-disable camelcase */
import { WebSocket } from 'ws'
import { base64ToImageUrl } from '../../utils/imgTools.js'
import EventEmitter from 'events'
import fs from 'fs'

// 常量定义
const HEARTBEAT_INTERVAL = 15000
const RECONNECT_DELAY = 5000
const CONNECT_DELAY = 1000

/**
 * Onebot 协议实现
 */
export default class Onebot extends EventEmitter {
  constructor(config) {
    super()

    // 校验配置对象
    if (!config || typeof config !== 'object' || !config.url || !config.qq || !config.master || !config.userAgent) {
      throw new Error('Invalid configuration object. Ensure url, qq, master, and userAgent are provided.')
    }

    this.config = config // 保存整个 config 对象
    this.ws = null
    this.avaliable = false
    this.lastTimestamp = 0
    this.counter = 0

    this.connect() // 连接逻辑移动到 connect 方法中

    this.enableStdin()
  }

  /**
   * 连接 Onebot 服务
   */
  connect() {
    const { url, qq, userAgent } = this.config

    logger.info(`正在连接 Onebot 服务: ${url}`)

    this.ws = new WebSocket(url, {
      headers: {
        'User-Agent': userAgent,
        'X-Client-Role': 'Universal',
        'X-Impl': 'Mio-Chat',
        'X-Onebot-Version': '11',
        'X-QQ-Version': 'android 9.0.17',
        'X-Self-ID': qq,
      },
    })

    this.ws.on('open', this.onOpen.bind(this))
    this.ws.on('message', this.onMessage.bind(this))
    this.ws.on('close', this.onClose.bind(this))
    this.ws.on('error', this.onError.bind(this))
  }

  /**
   * WebSocket 连接打开时的处理函数
   */
  async onOpen() {
    this.avaliable = true
    this.emit('online')

    // 发送 connect 生命周期事件
    setTimeout(() => {
      this.sendLifecycleEvent('lifecycle')
    }, CONNECT_DELAY)

    // 启动心跳检测
    this.heartbeatInterval = setInterval(() => {
      this.sendLifecycleEvent('heartbeat')
    }, HEARTBEAT_INTERVAL)
  }

  /**
   * WebSocket 接收到消息时的处理函数
   * @param {string} message
   */
  onMessage(message) {
    try {
      const data = JSON.parse(message)
      this.eventHandler(data)
    } catch (error) {
      console.error('解析数据失败:', error)
    }
  }

  /**
   * WebSocket 连接关闭时的处理函数
   */
  onClose() {
    logger.warn(`链接断开，${RECONNECT_DELAY / 1000}秒后重试`)
    this.avaliable = false
    clearInterval(this.heartbeatInterval) // 清除心跳定时器
    setTimeout(() => {
      this.connect()
    }, RECONNECT_DELAY)
  }

  /**
   * WebSocket 发生错误时的处理函数
   * @param {Error} error
   */
  onError(error) {
    console.error('WebSocket error:', error)
  }

  /**
   * 发送生命周期事件（connect, heartbeat）
   * @param {string} subType 事件子类型
   */
  sendLifecycleEvent(subType) {
    const { qq } = this.config // 减少代码中的 this.config 访问次数
    const lifecycle = {
      time: Date.now(),
      self_id: qq,
      post_type: 'meta_event',
      meta_event_type: subType,
      sub_type: 'connect',
      status: {
        self: { platform: 'qq', user_id: qq },
        online: true,
        good: true,
        'qq.status': '正常',
      },
      interval: HEARTBEAT_INTERVAL,
    }
    this.sendObject(lifecycle)
  }

  /**
   * 发送数据到 Onebot 服务
   * @param {object} data
   */
  sendObject(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket 连接未建立，无法发送数据')
    }
  }

  /**
   * 生成 Onebot 消息 ID
   * @returns {number}
   */
  generateMessageID() {
    const now = Date.now()

    if (now === this.lastTimestamp) {                                                                                                         
      this.counter++
    } else {
      this.counter = 0
      this.lastTimestamp = now
    }

    const randomPart = Math.floor(Math.random() * 1000)
    const messageID = `${now.toString().slice(-9)}${this.counter.toString().padStart(1, '0')}${randomPart.toString().padStart(3, '0')}`
    return parseInt(messageID, 10)
  }

  /**
   * 封装消息
   * @param {Array} message
   * @param {Object} sender
   * @param {number} message_id
   * @returns {Object}
   */
  messageWarrper(message = null, sender, message_id = null) {
    const { qq, master } = this.config // 减少代码中的 this.config 访问次数
    const baseMessage = {
      time: Date.now(),
      self_id: qq,
      post_type: 'message',
      message_id: message_id ?? this.generateMessageID(),
      message: message,
      raw_message: typeof message === 'string' ? message : JSON.stringify(message),
      font: 0,
      sender: this.buildSenderInfo(sender),
    }

    let messageType
    let specificParams = {}

    if (sender.isAdmin) {
      messageType = 'private'
      specificParams = {
        message_type: 'private',
        sub_type: 'friend',
        target_id: qq,
        peer_id: qq,
        user_id: master,
      }
    } else {
      messageType = 'group'
      const atElm = {
        type: 'at',
        data: {
          qq: qq,
        },
      }
      const groupId = parseInt(`365${sender.id}`, 10) // 避免魔法字符串
      baseMessage.message.unshift(atElm)
      specificParams = {
        message_type: 'group',
        sub_type: 'normal',
        group_id: groupId,
        user_id: sender.id,
      }
    }

    return {
      ...baseMessage,
      ...specificParams,
      message_type: messageType, // 保证message_type 覆盖
    }
  }

  /**
   * 构建 sender 信息
   * @param {Object} sender
   * @returns {Object}
   */
  buildSenderInfo(sender) {
    return {
      user_id: sender.isAdmin ? this.config.master : sender.id,
      nickname: sender.nickname || '未知用户',
      card: sender.card || '',
      role: sender.role || 'member',
      title: sender.title || '',
      level: sender.level || '',
    }
  }

  /**
   * 监听标准输入，并将输入的消息发送到 WebSocket 连接
   */
  enableStdin() {
    logger.info('正在监听标准输入')

    process.stdin.on('data', (data) => {
      const text = data.toString().trim()
      this.sendTextMessageToAdmin(text)
    })
  }

  /**
   * 将文本消息发送给管理员
   * @param {string} text
   */
  sendTextMessageToAdmin(text) {
    const message = [
      {
        type: 'text',
        data: {
          text: text,
        },
      },
    ]
    const warpedMessage = this.messageWarrper(message, { isAdmin: true })
    this.sendObject(warpedMessage)
    logger.debug(`已发送消息: ${text}`)
  }

  async formatMessages(messages) {
    for (const message of messages) {
      if (message.type === 'image') {
        // 检查图片是否为Base64格式
        if (message.data.file.startsWith('base64://')) {
          const base64Image = message.data.file.replace('base64://', '')
          const imageUrl = await base64ToImageUrl('',base64Image)
          message.data.file = imageUrl
        }
      }  
    }
  }

  /**
   *  解析处理事件
   * @param {object} eventData
   */
  async eventHandler(eventData) {
    let response = {
      status: 'ok',
      retcode: 0,
      msg: '',
      wording: '',
      data: {},
      echo: eventData.echo
    }
    try {
      if (eventData.action.startsWith('get_')) {
        response.data = this.getFakeData(eventData.action)
      } else {
        const messageID = this.generateMessageID()
        let resData = {}
        switch (eventData.action) {
          case 'send_group_msg':
          case 'send_private_msg': {
            const messageList = eventData.params.message
            await this.formatMessages(messageList)
            eventData.params.message_id = messageID
            this.logMessages(eventData.params.user_id, messageList)
            resData = { message_id: messageID }
            break
          }
          case 'send_private_forward_msg': {
            eventData.params.message_id = messageID
            const messages = this.extractMessagesFromForward(eventData.params.messages)
            this.logMessages(eventData.params.user_id, messages)
            if (messages.length > 0) this.logMessages(eventData.params.user_id, messages)
            resData = { message_id: messageID }
            break
          }
          case 'delete_msg':
            logger.debug(`收到撤回消息${eventData.params.message_id}`)
            break
          default:
            logger.debug(eventData)
            throw new Error(`未知的事件类型: ${eventData.action}`)
        }
        response = {
          ...response,
          data: resData
        }
        this.emit('event', eventData)
      }
    } catch (error) {
      console.error('处理事件失败:', error)
      response = {
        status: 'failed',
        retcode: 1,
        msg: error.message,
        wording: error.message,
        data: {},
        echo: eventData.echo,
      }
    } finally {
      this.sendObject(response)
    }
  }

  /**
   * 提取转发消息中的消息内容
   * @param {Array} nodes
   * @returns {Array}
   */
  extractMessagesFromForward(nodes) {
    const messages = []
    for (let node of nodes) {
      messages.push(node.data.content)
    }
    return messages
  }
  /**
     * 记录消息日志的函数
     * @param {string|number} userId - 发送消息的用户ID
     * @param {Array} messageList - 消息列表
    */
  logMessages(userId, messageList) {
    for (const message of messageList) {
      if (!message?.type) {
        logger.warn('消息类型错误')
        logger.debug(messageList)
        continue
      }

      switch (message.type) {
        case 'reply':
          logger.debug(`此消息引用了 ${message.data.id}`)
          break
        case 'text':
          logger.info(`向 ${userId} 发送私聊消息：${message.data.text}`)
          break
        case 'image':
          logger.debug(`收到 ${userId} 私聊图片`)
          break
        case 'record':
          this.handleRecordMessage(userId, message.data.file)
          break
        default:
          logger.debug(`收到 ${userId} 私聊消息，但不支持的消息类型：${message.type}`)
          logger.debug(messageList)
      }
    }
  }

  /**
     * 处理语音消息的函数
     * @param {string|number} userId - 发送消息的用户ID
     * @param {string} url - 语音文件的URL
     */
  async handleRecordMessage(userId, url) {
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      fs.writeFile('record.wav', buffer, 'binary', (err) => {
        if (err) {
          console.error('保存语音文件时出错:', err)
        } else {
          logger.debug(`收到 ${userId} 私聊语音，已保存到本地`)
        }
      })
    } catch (error) {
      console.error('下载或保存语音文件时出错:', error)
    }
  }


  /**
   * 获取假数据
   * @param {string} type
   * @returns {object}
   */
  getFakeData(type) {
    const { qq, master } = this.config // 减少代码中的 this.config 访问次数
    switch (type) {
      case 'get_login_info':
        return {
          user_id: qq,
          nickname: 'mio',
        }
      case 'get_friend_list':
        return [
          {
            user_id: master,
            nickname: 'master',
            remark: '',
          },
          {
            user_id: qq,
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
      case 'get_group_msg_history':
        return []
      default:
        throw new Error(`未知的获取数据类型: ${type}`)
    }
  }
}