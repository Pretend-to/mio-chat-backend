/* eslint-disable camelcase */
/* eslint-disable no-undef */
import logger from './logger.js'
import wsServer from './server/websocket.js'
import Onebot from './chat/onebot.js'
import openai from './chat/openai.js'

export default class Middleware {
  constructor() {
    this.onebot = null
    this.openai = null
    this.wsServer = new wsServer()

    // TODO: support openai api
    // this.onenai = null;

    this.initWsServer()
  }

  initOnebot() {
    // 收到OneBot服务端上线消息
    this.onebot.on('online', () => {
      logger.info('OneBot 协议连接成功！')
    })

    // 收到OneBot服务端事件
    this.onebot.on('event', async (e) => {
      // 把事件转发到WebSocket服务端
      this.wsServer.sendOnebot(e)
    })
  }

  initWsServer() {
    // 收到客户端消息
    this.wsServer.on('onebot_message', (e) => {
      this.toOnebotServer(e)
    })

    // 收到客户端OpenAI消息
    this.wsServer.on('openai_message', async (e) => {
      console.log(e.data)
      const openaiMessage = {
        body: e.data.data,
        request_id: e.data.request_id,
        pending(){
          logger.debug('openaiMessage pending')
          e.server.sendOpenaiMessage('pending',{},this.request_id)
        },
        update(index,chunk){
          // logger.debug('openaiMessage update')
          e.server.sendOpenaiMessage('update',{index,chunk},this.request_id)
        },
        complete(){
          logger.debug('openaiMessage complete')
          e.server.sendOpenaiMessage('completed',{},this.request_id)
        },
        error(error){
          logger.error(error)
          e.server.sendOpenaiMessage('failed',{error},this.request_id)
        }
      }
      await openai.chat(openaiMessage)
    })
  }

  startOnebot(config) {
    this.onebot = new Onebot(config)

    this.initOnebot()
  }

  async startOpenai() {
    logger.info('正在加载OpenAI模型...')
    try {
      const result =  await openai.initModels()

      logger.info('OpenAI模型加载成功,共加载了来自' + result.ownerCount + '个厂商的' + result.modelsCount + '个模型')
      logger.info('其中游客可用的模型有来自' + result.guestOwnerCount + '个厂商的' + result.guestModelsCount + '个模型')

      this.openai = openai
    }catch (e) {
      logger.error(e)
    }
  }

  // 向OneBot服务端发送消息
  toOnebotServer(e) {
    try {
      logger.debug('收到客户端' + e.id + '的消息,尝试发送到OneBot服务端')
      logger.debug(e)
      const data = e.data
      logger.debug(data)
      const sender = data.sender
      sender.id = data.id
      switch (data.type) {
        case 'message': {
          logger.debug('收到私聊消息')
          const warpedMessage = this.onebot.messageWarrper(
            data.data,
            sender,
            data.message_id
          )
          logger.debug(warpedMessage)
          this.onebot.sendObject(warpedMessage)

          break
        }
        default:
          logger.warn('收到未知消息类型')
      }
    } catch (e) {
      console.error('处理客户端消息失败', e)
    }
  }
}
