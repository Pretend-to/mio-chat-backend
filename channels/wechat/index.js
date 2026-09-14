// WeChat iLink Channel — MioChat 原生微信 iLink 渠道适配器。
// 与 lib/ 核心解耦：channel 只负责微信侧收发，消息与结果桥接到 MioChat 核心。
import { WechatChannel } from './WechatChannel.js'

export const weixinIlinkAdapter = {
  id: 'weixin-ilink',
  aliases: [
    'wechat',
    'wechat-clawbot',
    'onebot',
    'onebots',
    'onebots:wechat-clawbot',
    'onebots-wechat-clawbot',
  ],
  runtime: 'native',
  protocol: 'weixin.ilink',
  platform: 'weixin-ilink',
  name: '微信 iLink',
  description: '通过 MioChat 原生协议客户端直连微信 iLink。',
  icon: '💚',
  auth: { type: 'qrcode', label: '微信扫码绑定' },
  capabilities: {
    detailTypes: ['private'],
    media: ['image', 'file', 'video'],
    markdown: true,
  },
  defaults: { agentId: 'wechat-master', name: '微信助手' },
  configSchema: [],
  createChannel(options) {
    return new WechatChannel(options)
  },
}

export { WechatChannel }
export { IlinkClient } from './IlinkClient.js'
export default weixinIlinkAdapter
