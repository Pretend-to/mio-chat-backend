# API接口文档

## /api/onebot/message

### 发送消息

```json
{
  "request_id": 1234567890,
  "protocol": "onebot",
  "data": {
    "id": "1234567890",
    "type": "message",
    "data": {
      "message": [
        {
          "type": "text",
          "data": {
            "text": "Hello, world!"
          }
        },
        {
          "type": "image",
          "data": {
            "image": "https://example.com/image.jpg"
          }
        }
      ],
      "message_id": 1234567890
    }
  }
}
```

#### 返回

```json
{
  "request_id": 1234567890,
  "code": 0,
  "message": "success",
  "data": {
    "message_id": 1234567890
  }
}
```

## /api/onebot/del_message

### 删除消息

```json
{
  "request_id": 1234567890,
  "protocol": "onebot",
  "data": {
    "id": "1234567890",
    "type": "message",
    "content": {
      "message_id": "1234567890"
    }
  }
}
```

#### 返回

```json
{
  "request_id": 1234567890,
  "code": 0,
  "message": "success"
}
```

## /api/share

### 分享Bot

```json
{
  "contactor": {}
}
```

#### 返回

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "shareUrl": "",
    "previewImg": ""
  }
}
```

## /api/onebot/forward_msg

### 转发消息

```json
{
  "request_id": 1234567890,
  "protocol": "onebot",
  "data": {
    "id": "1234567890",
    "type": "forward_msg",
    "content": [
      {
        "message_id": 1234567890,
        "message": []
      }
    ]
  }
}
```

#### 返回

```json
{
  "request_id": 1234567890,
  "code": 0,
  "message": "success"
}
```

## /api/system/login

### 登录系统

```json
{
  "protocol": "system",
  "type": "login",
  "request_id": 1234567890,
  "data": {
    "mio-chat-id": "1234567890",
    "mio-chat-token": "1234567890"
  }
}
```

#### 返回成功

```json
{
  "request_id": 1234567890,
  "code": 0,
  "message": "success",
  "data": {
    "is_admin": true,
    "admin_qq": "123456789",
    "bot_qq": "987654321"
  }
}
```

#### 返回失败

```json
{
  "request_id": 1234567890,
  "code": 1,
  "message": "failed",
  "data": {
    "reason": "invalid code"
  }
}
```

## /api/system/heartbeat

### 心跳检测

```json
{
  "protocol": "system",
  "type": "heartbeat",
  "request_id": 1234567890,
  "data": {
    "timestamp": ""
  }
}
```

#### 返回

```json
{
  "request_id": 1234567890,
  "code": 0,
  "message": "success",
  "data": {
    "delay": ""
  }
}
```

## /api/openai/models

### 获取OpenAI模型列表

```json
{
  "protocol": "openai",
  "type": "models",
  "request_id": 1234567890,
  "data": {}
}
```

#### 返回

```json
{
  "request_id": 1234567890,
  "code": 0,
  "message": "success",
  "data": {
    "models": []
  }
}
```

## /api/openai/completions #streaming

### OpenAI文本生成

```json
{
  "protocol": "openai",
  "type": "completions",
  "request_id": 1234567890,
  "data": {
    "model": "davinci",
    "messages": [
      {
        "role": "system",
        "content": "你是一个机器人，回答用户的问题"
      },
      {
        "role": "user",
        "content": "你好，你是我的助手"
      },
      {
        "role": "assistant",
        "content": "你好，我是你的助手，有什么可以帮助你吗？"
      }
    ],
    "presence_penalty": 0,
    "frequency_penalty": 0,
    "temperature": 0.5,
    "top_p": 1
  }
}
```

#### 返回

```json
{
    "request_id": 1234567890,
    "code": 0,
    "message": "pending"
}

{
    "request_id": 1234567890,
    "code": 0,
    "message": "update",
    "data": {
        "index": 0,
        "chunk": "",
        "tool_call": null
    }
}

{
    "request_id": 1234567890,
    "code": 0,
    "message": "update",
    "data": {
        "index": 0,
        "chunk": "",
        "tool_call": {
            "name": "search",
            "action":"started" || "pending" || "running" || "finished",
            "params":""
        }
    }
}

{
    "request_id": 1234567890,
    "code": 0,
    "message": "completed"
}

{
    "request_id": 1234567890,
    "code": 0,
    "message": "failed",
    "data": {
        "reason": "invalid model"
    }
}
```
