# OpenAI Proxy (/oai-proxy) 设计方案

本方案旨在为后端提供一个 `/oai-proxy` 路径，对外提供标准、与官方完全同步的 OpenAI API 接口（包括 `/v1/chat/completions` 和 `/v1/models`），支持利用系统已配置的现有 LLM 适配器作为底层的 API 转发代理，使其能够直接作为 `baseURL` 被官方 OpenAI SDK 等第三方客户端调用。

## 需求背景
系统现已集成多个大模型平台适配器（OpenAI, Gemini, Vertex, DeepSeek, xAI 等），这些适配器在后台配置并动态初始化。为了将系统作为一个大模型接口聚合网关使用，需要提供一个标准 OpenAI 兼容的 HTTP 代理层，直接透传请求并映射到底层对应适配器。

---

## 路由注册与别名
在 `lib/server/http/index.js` 中注册 `/oai-proxy` 路由组，包含以下路径：

### 1. 模型列表 `/v1/models`
- **路径**：`GET /oai-proxy/v1/models`
- **功能**：聚合返回当前系统所有已启用的适配器下的所有可用模型列表（以 `<实例显示名称>/<模型名称>` 格式，支持精准路由），返回标准 OpenAI 格式。

### 2. 对话补全 `/v1/chat/completions`
- **路径**：`POST /oai-proxy/v1/chat/completions`
- **功能**：接收标准的 OpenAI 对话补全请求，转换并调用底层适配器，最后以标准的 OpenAI 响应格式（JSON 或 SSE 流）返回给客户端。

---

## 核心设计与数据流

### 1. 身份验证 (Authentication)
与现有的配置管理 API 保持一致：
*   从 `Authorization` 请求头中提取 Bearer Token：`Authorization: Bearer <TOKEN>`。
*   或从请求头 `x-admin-code`、请求 Query 参数 `admin_code` / Body 参数 `admin_code` 中提取。
*   对比系统当前的管理员凭证 `ADMIN_CODE` (环境变量 `ADMIN_CODE` 或 `config.web.admin_code`)。
*   若系统未设置 `ADMIN_CODE`，则开发模式下直接放行；若不匹配，则返回 `403 Forbidden`。

### 2. 适配器定位与路由逻辑 (选项 1)
根据请求体中的 `model` 参数查找对应的适配器实例：
1.  **显式实例定位**：若模型名含有斜杠（如 `OpenAI-主要/gpt-4o`），将其拆分为 `instanceName` (OpenAI-主要) 和 `modelName` (gpt-4o)。在 `global.middleware.llm.llms` 中直接查找 displayName 或 ID 为 `OpenAI-主要` 的实例。
2.  **自动扫描定位**：若模型名无斜杠（如 `gpt-4o`），扫描所有当前已启用的适配器实例的 `models` (管理员视图下所有的模型)，定位第一个包含该模型 ID 的适配器实例。
3.  **Fallback 兜底**：若上述两步均未找到对应的适配器，则默认路由到系统当前配置的默认大模型通道 (`system_llm_channel`)。
4.  **找不到适配器**：如果系统没有任何已启用的适配器实例，返回 `400 Bad Request`，提示 "没有可用的大模型适配器配置"。

### 3. 请求体在后端的映射 (对客户端透明)
从 Express 中收到的标准 `req.body` 需要被后端在内存中转换为适配器接口所需的格式：
```javascript
const adapterBody = {
  messages: req.body.messages,
  settings: {
    base: {
      model: targetModelId, // 提取出的真实模型 ID (例如 gpt-4o)
      stream: req.body.stream === true
    },
    chatParams: {
      temperature: req.body.temperature,
      max_tokens: req.body.max_tokens,
      top_p: req.body.top_p,
      presence_penalty: req.body.presence_penalty,
      frequency_penalty: req.body.frequency_penalty,
      response_format: req.body.response_format,
      stop: req.body.stop,
      seed: req.body.seed,
      user: req.body.user
    },
    toolCallSettings: {
      mode: req.body.tools ? 'AUTO' : 'NONE',
      tools: req.body.tools || []
    }
  }
};
```

### 4. 自定义事件对象与响应格式化
我们将通过自定义一个兼容适配器接口的 Event 对象来驱动 `handleChatRequest`：

```javascript
const eventId = `oai-${crypto.randomUUID()}`;
let accumulatedContent = '';
let accumulatedReasoning = '';

const e = {
  requestId: eventId,
  body: adapterBody,
  aborted: false,
  user: { isAdmin: true }, // 绕过游客限制
  client: {
    pushEvent: () => {},
    popEvent: () => {},
    pushConnection: () => {},
    popConnection: () => {},
  },
  onAbort: (cb) => {
    req.on('close', () => {
      e.aborted = true;
      cb();
    });
  },
  update: (data) => {
    if (req.body.stream === true) {
      // 流式输出格式化
      if (data.type === 'content') {
        const chunk = createOpenAIChunk(eventId, targetModelId, data.content, null);
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      } else if (data.type === 'reasoningContent') {
        const chunk = createOpenAIChunk(eventId, targetModelId, null, data.content);
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } else {
      // 非流式累加
      if (data.type === 'content') {
        accumulatedContent += data.content;
      } else if (data.type === 'reasoningContent') {
        accumulatedReasoning += data.content;
      }
    }
  },
  complete: () => {
    if (req.body.stream === true) {
      const finalChunk = createOpenAIChunk(eventId, targetModelId, null, null, 'stop');
      res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const response = createOpenAIResponse(eventId, targetModelId, accumulatedContent, accumulatedReasoning);
      res.status(200).json(response);
    }
  },
  error: (err) => {
    logger.error(`[/oai-proxy] 发生错误:`, err);
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          message: err.message || '内部处理错误',
          type: 'internal_error',
          code: 'internal_error'
        }
      });
    }
  }
};
```

---

## 辅助函数

### `createOpenAIChunk(id, model, content, reasoningContent, finishReason = null)`
返回标准的 OpenAI 增量流式 Chunk 结构。
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion.chunk",
  "created": 1716616800,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "delta": {
        "content": "...",
        "reasoning_content": "..."
      },
      "finish_reason": null
    }
  ]
}
```

### `createOpenAIResponse(id, model, content, reasoningContent)`
返回标准的 OpenAI 非流式响应 JSON。
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1716616800,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "...",
        "reasoning_content": "..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

---

## 验证计划
1.  **单元测试**：编写 `/oai-proxy` 接口测试用例，覆盖：
    - `/v1/models`：正确返回当前所有模型。
    - `/v1/chat/completions` (非流式)：输入标准 OpenAI 参数，能从 Mock 适配器接收数据并组装成标准的 OpenAI 响应。
    - `/v1/chat/completions` (流式)：正确吐出 `text/event-stream` SSE 并包含 `data: [DONE]`。
    - 路由选择验证：测试不带斜杠的模型（自动查找）和带斜杠的模型（显式指定）。
2.  **集成测试**：使用 OpenAI 官方 SDK 实际调用接口，确认数据流完全畅通。
