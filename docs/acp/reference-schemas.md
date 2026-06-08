# 标准数据结构与能力定义

## 1. ContentBlock (内容块)
复用 MCP 规范，支持：
- `text`: 纯文本。
- `image`: Base64 数据 + mimeType。
- `resource`: 嵌入式文件内容。
- `diff`: `{ path, oldText, newText }`。

## 2. Agent Plan (执行计划)
```json
{
  "entries": [
    { "content": "任务描述", "priority": "high", "status": "pending" }
  ]
}
```

## 3. 核心能力项
### FS (文件系统)
- `fs/read_text_file`: 读取文本。
- `fs/write_text_file`: 写入文本。

### Terminal (终端)
- `terminal/create`: 开启新终端，返回 `terminalId`。
- `terminal/output`: 获取输出。
- `terminal/kill`: 终止进程。

### Slash Commands
Agent 可以向 Client 注册 `/` 开头的命令。
