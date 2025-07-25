/* eslint-disable camelcase */
import EventEmitter from 'events'
import { base64ToImageUrl } from '../../../../utils/imgTools.js'
export default class BaseOnebotAdapter extends EventEmitter {
  static HEARTBEAT_INTERVAL = 15000
  static RECONNECT_DELAY = 5000
  static CONNECT_DELAY = 1000
  constructor(config) {
    super()
    const requiredFields = ['url', 'masterId', 'botId', 'userAgent']
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    this.config = config
    this.connected = false
    this.heartbeatInterval = null
    this.lastTimestamp = 0
    this.counter = 0
    this.botId = config.botId
    this.masterId = config.masterId
  }
  /**
   * 连接到 OneBot 服务器。
   */
  connect() {
    // 由子类实现具体的连接逻辑
    throw new Error('Method not implemented.')
  }
  /**
   * OneBot 连接成功后调用此方法。
   */
  onConnected() {
    // 由子类实现具体的逻辑
    throw new Error('Method not implemented.')
  }

  onError() {
    // 由子类实现具体的逻辑
    throw new Error('Method not implemented.')
  }
  /**
   * 收到 OneBot 服务器的消息时调用此方法。
   * @param {Object} message - 从 OneBot 服务器收到的消息对象。
   */
  onMessage(message) {
    // 由子类实现具体的逻辑
    throw new Error('Method not implemented.')
  }
  /**
   * 发送消息到 OneBot 服务器。
   * @param {Object} message - 要发送的消息对象。
   */
  sendMessage(message) {
    // 由子类实现具体的逻辑
    throw new Error('Method not implemented.')
  }
  /**
   * 与 OneBot 服务器的连接断开时调用此方法。
   */
  onDisconnected() {
    logger.warn(`链接断开，${BaseOnebotAdapter.RECONNECT_DELAY / 1000}秒后重试`)
    this.connected = false
    clearInterval(this.heartbeatInterval) // 清除心跳定时器
    setTimeout(() => {
      this.connect()
    }, BaseOnebotAdapter.RECONNECT_DELAY)
  }
  /**
   * 使能生命周期事件。
   */
  enableLifecycleEvent() {
    const baseEvent = {
      time: Date.now(),
      self_id: this.config.botId,
      post_type: 'meta_event',
      meta_event_type: 'lifecycle',
      sub_type: 'connect',
      status: {
        self: { platform: 'this.botId', user_id: this.config.botId },
        online: true,
        good: true,
        'this.botId.status': '正常',
      },
      interval: BaseOnebotAdapter.HEARTBEAT_INTERVAL,
    }
    this.sendMessage(baseEvent)
    baseEvent.meta_event_type = 'heartbeat'
    this.heartbeatInterval = setInterval(() => {
      this.sendMessage(baseEvent)
    }, BaseOnebotAdapter.HEARTBEAT_INTERVAL)
  }
  /**
   * 关闭与生命周期事件
   */
  disableLifecycleEvent() {
    clearInterval(this.heartbeatInterval)
  }

  /**
   * 获取模拟 Onebot 服务数据。
   * @param {string} type - 要获取的数据类型。
   * @returns {Object} - 模拟的 Onebot 服务数据。
   */
  // 在 BaseOnebotAdapter.js 中找到这个函数
  getMockOnebotData(type) {
    const { botId, masterId } = this.config // 减少代码中的 this.config 访问次数
    switch (type) {
      case 'get_login_info':
        return {
          user_id: botId,
          nickname: 'mio',
        }
      case 'get_friend_list':
        return [
          {
            user_id: masterId,
            nickname: 'master',
            remark: '',
          },
          {
            user_id: botId,
            nickname: 'self',
            remark: '',
          },
        ]
      case 'get_group_list':
        return []

        // --- 新增以下 case 来修复报错 ---

      case 'get_guild_list': // 修复 "未知的获取数据类型: get_guild_list"
        return []

      case 'get_guild_service_profile': // 修复 "未知的获取数据类型: get_guild_service_profile"
        return {} // 返回一个空对象即可

      case 'get_online_clients': // 修复 "未知的获取数据类型: get_online_clients"
        return {
          clients: [], // 返回一个包含空数组的 clients 对象
        }

      case 'get_version_info': // 修复 "未知的获取数据类型: get_version_info"
        return {
          app_name: 'mio-onebot-adapter',
          app_version: '1.0.0',
          protocol_version: 'v11',
        }

      case 'get_csrf_token': // 修复 "未知的获取数据类型: get_csrf_token"
        return {
          token: 12345, // 返回一个假的 token
        }
        // --- 新增结束 ---

      case 'get_group_member_list':
        return []
      case 'get_cookies':
        return {
          cookies: '666',
        }
      case 'get_group_msg_history':
        return []
      default:
        // 注意这里，如果还有未知的 get，它会抛出错误
        logger.warn(`收到未知的 get_ action: ${type}，已返回空对象。`)
        return {} // 将抛出错误改为返回空对象，增加兼容性
      // throw new Error(`未知的获取数据类型: ${type}`) // 原来的代码
    }
  }
  /**
   * 处理 OneBot 服务器返回的事件。
   * @param {Object} event - 从 OneBot 服务器返回的消息对象。
   */
  async handleEvent(event) {
    let response = {
      status: 'ok',
      retcode: 0,
      msg: '',
      wording: '',
      data: {},
      echo: event.echo,
    }
    try {
      if (event.action.startsWith('get_')) {
        response.data = this.getMockOnebotData(event.action)
      } else {
        logger.json(event)
        let toEmit = true
        const messageID = this.generateMessageID()
        let resData = {}
        switch (event.action) {
          case 'send_msg':
            const { params } = event
            const messageList = params.message
            await this.formatMessages(messageList)
            params.message_id = messageID
            this.logMessages(params.user_id || params.group_id, messageList)
            resData = { message_id: messageID }
            logger.debug(messageID)
            break
          // case 'send_group_msg':
          // case 'send_private_msg': {
          //   const messageList = event.params.message
          //   await this.formatMessages(messageList)
          //   event.params.message_id = messageID
          //   this.logMessages(event.params.user_id, messageList)
          //   resData = { message_id: messageID }
          //   logger.debug(messageID)
          //   break
          // }
          case 'send_group_forward_msg':
          case 'send_private_forward_msg': {
            event.params.message_id = messageID
            const messages = this.extractMessagesFromForward(
              event.params.messages,
            )
            await this.formatMessages(messages)
            const id = event.params.user_id || event.params.group_id
            if (messages.length > 0) this.logMessages(id, messages)
            resData = { message_id: messageID }
            break
          }
          case 'delete_msg':
            logger.debug(`收到撤回消息${event.params.message_id}`)
            break
          case '_set_model_show':
            toEmit = false
            break
          default:
            logger.debug(event)
            throw new Error(`未知的事件类型: ${event.action}`)
        }
        toEmit && this.emit('event', event)
        response = {
          ...response,
          data: resData,
        }
      }
    } catch (error) {
      console.error('处理事件失败:', error)
      response = {
        status: 'failed',
        retcode: 1,
        msg: error.message,
        wording: error.message,
        data: {},
        echo: event.echo,
      }
    } finally {
      this.sendMessage(response)
    }
  }

  logMessages(userId, messages) {
    const messageStrings = messages.map((message) => {
      if (message.type === 'text') {
        return message.data.text
      } else if (message.type === 'image') {
        return `[图片]${message.data.file}`
      } else {
        return JSON.stringify(message)
      }
    })
    const messageString = messageStrings.join(' ')
    logger.info(`用户 ${userId} 发送消息: ${messageString}`)
  }

  /**
   * 整理消息格式。
   * @param {Array} messageList - 要整理的消息列表。
   * @returns {Promise<void>} - 整理消息格式的 Promise。
   */
  async formatMessages(messageList) {
    for (const message of messageList) {
      if (message.type === 'image') {
        // 检查图片是否为Base64格式
        if (message.data.file.startsWith('base64://')) {
          const base64Image = message.data.file.replace('base64://', '')
          const imageUrl = await base64ToImageUrl('', base64Image)
          message.data.file = imageUrl
        }
      }
    }
    messageList.flat()
  }
  /**
   * 提取消息列表中的消息。
   * @param {Array} messages - 包含消息的数组。
   * @returns {Array} - 提取的消息列表。
   * @private
   */
  extractMessagesFromForward(messages) {
    const extractedMessages = []
    for (const message of messages) {
      if (message.type === 'node') {
        extractedMessages.push(message.data.content)
      }
    }
    return extractedMessages
  }
  /**
   * 生成消息 ID。
   * @returns {string} - 生成的消息 ID。
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
   * 获取封装的消息对象。
   * @param {Array} message - 要封装的消息。
   * @param {Object} sender - 消息的发送者。
   * @param {number} messageId - 消息的 ID。
   * @returns {Object} - 封装的消息对象。
   * @private
   */
  getWrappedMessage(message, sender, messageId) {
    const baseMessage = {
      time: Date.now(),
      self_id: this.botId,
      post_type: 'message',
      message_id: messageId ?? this.generateMessageID(),
      message: message,
      raw_message:
        typeof message === 'string' ? message : JSON.stringify(message),
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
        target_id: this.botId,
        peer_id: this.botId,
        user_id: this.masterId,
      }
    } else {
      messageType = 'group'
      const atElm = {
        type: 'at',
        data: {
          qq: this.botId,
        },
      }
      const groupId = parseInt(`${sender.id}`, 10) // 避免魔法字符串
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
   * 构建发送者信息。
   * @param {Object} sender - 消息的发送者。
   * @returns {Object} - 发送者信息对象。
   * @private
   */
  buildSenderInfo(sender) {
    return {
      user_id: sender.isAdmin ? this.config.masterId : sender.id,
      nickname: sender.nickname || '蜜柚用户',
      card: sender.card || '',
      role: sender.role || 'member',
      title: sender.title || '',
      level: sender.level || '',
    }
  }
}
