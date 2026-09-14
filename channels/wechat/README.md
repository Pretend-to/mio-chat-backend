# WeChat iLink Channel

基于腾讯官方 ClawBot/iLink 协议（`ilinkai.weixin.qq.com`），由 MioChat 自研客户端直连微信。

运行时实现集中在本目录：

- `IlinkClient.js`：登录、长轮询、发送、Typing、媒体上传与下载。
- `WechatChannel.js`：消息路由、会话、工具输出和多媒体桥接。
- `msgHelper.js`：iLink 消息结构的序列化与解析。

启动时会由 `channels/migrations/migrateOneBotsIlinkToNative.js` 将历史
`wechat-clawbot / onebot.v12` 实例迁移为 `native / weixin.ilink`。迁移会优先
保留 ChannelStore 凭据，并在凭据缺失时读取旧的
`data/wechat-clawbot/<channelId>.json`；旧 OneBots 会话文件不会被删除。
