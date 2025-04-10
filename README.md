# Mio-Chat-Backend

一款基于 Websocket 的 ChatBot 对话平台，兼容 OpenAI 与**部分** Onebot 协议v11。兼容流行的 Onebot 生态圈。

插件市场：[Mio-Chat 插件市场](https://github.com/Pretend-to/awesome-miochat-plugins)

前端部分：[Mio-Chat 前端](https://github.com/Pretend-to/mio-chat-frontend)

QQ交流群：[qq 群](https://qm.qq.com/q/Eqv9Z6iSB4)

预览地址：[Mio-Chat](https://ai.krumio.com)

## 预览
![Mio-Chat](.github/preview/1.png)
![Mio-Chat](.github/preview/2.png)
![Mio-Chat](.github/preview/3.png)
![Mio-Chat](.github/preview/4.png)

## 特性

- ✅ 支持 OpenAI 协议的对话功能
- ✅ 支持 OpenAI 协议的 FunctionCall(ToolCall) 功能
- ✅ 支持 OpenAI 协议下的图片或文件上传分析 
- ✅ 支持 Onebot 协议的对话功能 (文本/图片/转发(部分支持))
- ✅ 对于 OpenAI 协议具备可定制拓展的插件系统
- ✅ 支持 Gemini API 接入
- ✅ 支持多种模型切换
- ✅ 支持用户权限管理
- ✅ 支持自定义预设角色
- ✅ 支持多种消息类型（文本、图片、转发消息等）
- ✅ 支持 WebSocket 实时通信
- ✅ 支持 MCP 接口调用

## 项目状态

⚠️ **注意：本项目仍在积极开发中** ⚠️

当前开发计划：
- 🚧 完善 Onebot 协议支持
- 🚧 增强插件系统功能
- 🚧 优化性能和稳定性
- 🚧 增加更多 AI 模型支持
- 🚧 改进用户界面和体验

## 安装

1. 克隆存储库：

```bash
git clone https://github.com/Pretend-to/mio-chat-backend
```

2. 进入项目目录：

```bash
cd mio-chat-backend
```

3. 安装依赖项：(请先确保你安装了NodeJS与Pnpm)

```bash
pnpm install
```

## 使用

1. 使用 node 启动后端服务器：

```bash
# 如果你要前台调试
node app
# 后台运行(基于 pm2)
npm run start
```

2. 修改配置文件，按配置文件的注释修改即可。

## 配置说明

配置文件位于 `config/config/config.example.yaml`，使用前请复制为 `config.yaml` 并根据需要修改。

主要配置项包括：

- **OpenAI 配置**：API密钥、基础URL、可用模型等
- **Gemini 配置**：API密钥、基础URL、可用模型等
- **Onebot 配置**：反向WebSocket地址、机器人QQ号、管理员QQ号等
- **服务器配置**：端口、主机、请求限制等
- **Web配置**：管理员访问码、用户访问码、网页标题等

## 插件系统

本项目具有灵活的插件系统，支持自定义功能扩展：

- 内置插件位于 `lib/plugins` 目录
- 自定义插件位于 `plugins/custom` 目录
- 插件可以实现各种功能，如网页解析、天气查询、绘图等

## API接口

项目提供了丰富的API接口，详细文档请参考 `api.md` 文件。

## 关联项目
[NextWeb](https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web) by [Yda](https://github.com/Yidadaa)

[云崽相关内容](https://gitee.com/yhArcadia/Yunzai-Bot-plugins-index) by 云崽社区

[chatgpt-mirai-qq-bot](https://github.com/lss233/chatgpt-mirai-qq-bot) by [lss233](https://github.com/lss233)

## 技术栈

- Node.js
- WebSocket (ws)
- Socket.IO
- Express
- OpenAI API
- Gemini API
- Onebot 协议

## 贡献

欢迎贡献！如果您发现任何错误或有改进建议，请提出问题或提交拉取请求。

## 许可证

该项目根据[MIT许可证](LICENSE)许可。
