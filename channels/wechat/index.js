// WeChat iLink Channel — 微信 ClawBot 渠道适配器
// 与 lib/ 核心解耦：channel 只负责「微信侧收发」，消息与结果桥接到 miochat 核心。
export { default as WechatChannel } from './WechatChannel.js'
export { default as IlinkClient } from './IlinkClient.js'
