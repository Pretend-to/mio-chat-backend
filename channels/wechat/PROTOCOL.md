# WeChat iLink (ClawBot) 协议参考

> 来源：基于腾讯官方 `@tencent-weixin/openclaw-weixin@2.4.6` 源码提取，2026-08。
> 用途：miochat 自研直连微信（不依赖 OpenClaw）的协议实现依据。

## 0. 概览

- **产品**：微信 ClawBot 插件（腾讯官方 2026 开放）
- **协议**：iLink（智联）
- **服务端**：`https://ilinkai.weixin.qq.com`（`DEFAULT_BASE_URL`）
- **方式**：JSON over HTTPS；bytes 字段在 JSON 中为 base64 字符串；消息为**长轮询**。
- **限制**：①只对接 iOS 微信（安卓未开放）；②一个微信账号只能绑定一个 Bot 实例（换绑需解绑）；③iLink 本身不支持主动推送，但**有 24h 保活机制**（需 24h 内有一条用户主动消息保持通道活跃）；④不支持群运营/联系人在聊等。

## 1. 鉴权头（所有请求）

```
Content-Type: application/json
AuthorizationType: ilink_bot_token
X-WECHAT-UIN: <random uint32 → decimal string → base64>   # 防重放随机数，每个请求新生成
Authorization: Bearer <bot_token>                          # 扫码后获得
iLink-App-Id: <ilink_appid>                                # 腾讯插件包用的是 "bot"
iLink-App-ClientVersion: <0x00MMNNPP>                      # major<<16|minor<<8|patch
```

**timeout 约定**：长轮询 getUpdates 默认 35s（服务端可 hold 到该时长）；普通 API 15s；轻量(getConfig/sendTyping) 10s。

## 2. 登录（二维码）

```
GET ilink/bot/get_bot_qrcode?bot_type=3        → { qrcode, qrcode_url / qrcode_img_content }
GET ilink/bot/get_qrcode_status?qrcode=<qrcode>[&verify_code=]   # 长轮询扫码状态
```
状态机：`wait → scaned → confirmed`（另有 `expired / scaned_but_redirect / need_verifycode / verify_code_blocked / binded_redirect`）。

扫码 confirmed 后得到三值：
- `bot_token` —— 后续鉴权 Bearer
- `ilink_bot_id` —— Bot 账户 ID
- `ilink_user_id` —— 格式 `xxx@im.wechat`

## 3. Endpoints & Body（全部 POST，均带 `base_info`）

公共段：
```json
{ "base_info": { "channel_version": "x.y.z", "bot_agent": "OpenClaw" } }
```

| 能力 | endpoint | body（+base_info） | 说明 |
|------|----------|--------------------|------|
| 收消息 | `ilink/bot/getupdates` | `{ get_updates_buf }` | 长轮询。返回 `{ret, msgs, get_updates_buf}`；客户端超时正常返回 `{ret:0, msgs:[], get_updates_buf}`，直接重试 |
| 发消息 | `ilink/bot/sendmessage` | `{ msg: WeixinMessage }` | 返回 `{ret, errmsg}`，`ret!==0` 抛错 |
| 上传URL | `ilink/bot/getuploadurl` | `{ filekey, media_type, to_user_id, rawsize, rawfilemd5, filesize, thumb_*, no_need_thumb, aeskey }` | 返回 `{ upload_param, thumb_upload_param, upload_full_url }` |
| 配置 | `ilink/bot/getconfig` | `{ ilink_user_id, context_token }` | 返回 `{ typing_ticket }`（sendTyping 用） |
| 正在输入 | `ilink/bot/sendtyping` | `{ ilink_user_id, typing_ticket, status }`（1=typing 2=cancel） | |
| 停通知 | `ilink/bot/msg/notifystop` | `{ base_info }` | 通道关闭时通知服务器 |
| 启通知 | `ilink/bot/msg/notifystart` | `{ base_info }` | |

## 4. 消息结构

```ts
// WeixinMessage（收 / 发共用）
interface WeixinMessage {
  seq?, message_id?, from_user_id?, to_user_id?, client_id?,
  create_time_ms?, update_time_ms?, session_id?, group_id?,
  message_type?,   // MessageType: 1=USER 2=BOT
  message_state?,  // MessageState: 0=NEW 1=GENERATING 2=FINISH
  item_list?,      // MessageItem[]
  context_token?,  // 会话令牌（复用/持久化，发送需带上；格式要补全 client_id/message_type/message_state）
  run_id?,
}

// MessageItemType
NONE:0 TEXT:1 IMAGE:2 VOICE:3 FILE:4 VIDEO:5 TOOL_CALL_START:11 TOOL_CALL_RESULT:12

// 文本条目 { text }; 图片 CDNMedia { encrypt_query_param, aes_key, encrypt_type, full_url }
// 上传 UploadMediaType: IMAGE:1 VIDEO:2 FILE:3 VOICE:4
```

**关键点**：
- `get_updates_buf`：从 `getupdates` 响应里拿，本地缓存，下次请求带回（"" 表示首次/重置）。错误码 `-14` = 会话超时需重新扫码。
- `context_token`：收消息时从消息体带出；**发回复必须在 sendmessage 的 msg 里带回**（否则消息不投递）；可持久化复用。

## 5. 媒体（收发图/语音/文件）

- **收**：getupdates 的消息 item 含 CDNMedia，`aes_key` 作 AES-128-ECB 解密媒体。
- **发**：`getuploadurl` 拿预签名 URL（含 `aeskey`）→ 用返回的 key 加密文件 → 上传 `upload_full_url` → 把 CDN 引用放进 sendmessage 的 item 发出。
- 语音需 silk 转码、图片需生成缩略图（thumb_*）。

## 6. 保护/保活

- 会话 Token 过期（-14）→ 重新扫码。
- 24h 内无用户主动消息会失效：需在窗口内用 bot 主动消息/心跳保活（或提示用户发条消息）。

## 7. 本项目落地目录

```
channels/wechat/
├── PROTOCOL.md        ← 本文件（协议依据）
├── IlinkClient.js     ← 协议层：登录 / getUpdates 长轮询 / sendMessage / getUploadUrl / sendTyping
├── WechatChannel.js   ← channel 层：长轮询主循环 + 消息桥接 + 24h 保活
├── index.js           ← 导出
└── README.md
```