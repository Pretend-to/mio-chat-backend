# LLM 适配器开发指南

Mio-Chat 的适配器架构允许系统无缝接入任何遵循或不遵循 OpenAI 格式的大模型。

## 1. 核心流程
所有的适配器都必须继承 `BaseLLMAdapter`。基类已经为你处理好了：
*   **热重载逻辑**：配置更新后自动重载。
*   **Hook 触发**：自动触发 `LLM_BEFORE_CHAT` 和 `LLM_AFTER_CHAT`。
*   **用量审计**：只要你调用 `this.logUsage()`，系统就会自动打印 ASCII 表格并存入数据库。
*   **记忆结晶**：只要你在对话结束前调用 `this._checkAndCrystallize()`，系统就会自动处理上下文压缩。

## 2. 必需实现的方法

### `static getAdapterMetadata()`
定义 UI 渲染所需的元数据：
```javascript
static getAdapterMetadata() {
  return {
    type: 'my-llm',        // 唯一标识
    name: 'My Custom LLM', // 显示名称
    supportedFeatures: ['chat', 'streaming', 'vision'], // 支持的功能
    initialConfigSchema: { /* 字段定义... */ }
  }
}
```

### `async _getModels()`
返回该适配器支持的模型列表。

### `async handleChatRequest(e)`
核心对话逻辑。
*   输入：`e` 是一个事件对象，包含 `user`, `body`, `params` 以及 `update` 方法。
*   输出：你需要通过 `e.update({ type: 'content', content: '...' })` 发送内容，并在结束时调用 `this.logUsage()`。

## 3. 标准实现模板

一个典型的 `handleChatRequest` 实现应如下所示：

```javascript
async handleChatRequest(e) {
  const timeMetrics = { startTime: Date.now(), e };
  
  try {
    const stream = await this.client.chat.completions.create({
      model: e.body.settings.base.model,
      messages: e.body.messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        e.update({ type: 'content', content });
      }
      
      // 记录首字延迟
      if (!timeMetrics.firstTokenTime) timeMetrics.firstTokenTime = Date.now();
      
      // 保存最后的 usage
      if (chunk.usage) e.lastUsage = chunk.usage;
    }

    // 1. 触发审计 Hook 与日志
    this.logUsage(this.provider, e.lastUsage, timeMetrics);
    
    // 2. 检查是否需要触发记忆结晶
    await this._checkAndCrystallize(e);

  } catch (err) {
    e.error(err);
  }
}
```

---
详细示例请参考 `docs/adapters/ADAPTER_TEMPLATE.js`。
