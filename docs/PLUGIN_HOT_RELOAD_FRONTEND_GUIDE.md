# 插件系统热重载 - 前端对接文档

为了提升开发体验，后端插件系统现在支持**热重载广播**。当后端插件、工具文件发生变化并自动重载，或者通过管理员后台手动触发重载时，后端会通过 WebSocket 向所有已连接的客户端发送通知。

## 1. 通信协议

### 广播消息格式
当插件系统更新时，你会收到一条包含以下结构的 WebSocket 消息：

```json
{
  "protocol": "system",
  "type": "plugins_updated",
  "data": {
    "timestamp": "2026-05-02T06:53:28.123Z"
  }
}
```

*   **protocol**: `system` (系统级消息)
*   **type**: `plugins_updated` (插件已更新)
*   **data.timestamp**: 更新发生的时间戳

## 2. 前端对接建议

前端应监听此消息，并在收到通知后刷新相关的 UI 状态（如：工具列表、插件配置页等）。

### 示例代码 (基于 Socket.io)

```javascript
// 在你的 Socket 监听逻辑中添加处理
socket.on('message', (rawMessage) => {
  try {
    const message = JSON.parse(rawMessage);
    
    if (message.protocol === 'system') {
      switch (message.type) {
        case 'plugins_updated':
          console.log('[Plugin System] 检测到后端插件更新，正在刷新数据...');
          handlePluginsUpdate();
          break;
          
        // 其他系统消息处理...
      }
    }
  } catch (err) {
    console.error('解析消息失败:', err);
  }
});

// 处理函数示例
async function handlePluginsUpdate() {
  // 1. 如果你在“插件管理”页面，重新请求插件列表 API
  // await pluginStore.fetchPlugins();
  
  // 2. 如果你在对话页面，可能需要更新当前可用的 Tools 列表
  // await chatStore.refreshAvailableTools();
  
  // 3. 显示一个全局通知（可选）
  // notification.success({ message: '插件系统已热重载' });
}
```

## 3. 相关 API 引用

如果你需要手动刷新数据，可以使用现有的插件管理 API：

*   **获取插件列表**: `GET /api/plugins`
*   **获取插件工具**: `GET /api/plugins/:pluginName/tools`
*   **获取插件配置**: `GET /api/plugins/:pluginName/config`

## 4. 调试建议

你可以通过以下方式验证对接是否成功：
1.  启动后端和前端。
2.  修改后端 `lib/plugins/` 或 `plugins/` 目录下任意插件的工具文件（如修改工具的 `description`）。
3.  观察控制台是否打印了 `plugins_updated` 消息。
4.  检查前端 UI 是否根据最新文件内容进行了更新。
