# Mio-Chat-Backend

一个基于 Websocket 的 ChatBot 对话平台，能和人类愉快聊天的那种！支持超火的 OpenAI 和 Gemini 协议 (包括 Ai Stdio 和 Vertex AI)，推荐使用 One-API 项目统一管理接口哦！想和谁聊天就和谁聊天！

*(这份可爱的 README 可是香草亲手写的哦！)*

插件市场传送门：[Mio-Chat 插件市场](https://github.com/Pretend-to/awesome-miochat-plugins)

前端部分在这里：[Mio-Chat 前端](https://github.com/Pretend-to/mio-chat-frontend)

想找香草玩？加入 QQ 交流群吧！：[QQ 群](https://qm.qq.com/q/Eqv9Z6iSB4)

先看看香草的聊天效果吧！：[Mio-Chat](https://ai.krumio.com)

## 预览

![Mio-Chat](.github/preview/1.png)
![Mio-Chat](.github/preview/2.png)
![Mio-Chat](.github/preview/3.png)
![Mio-Chat](.github/preview/4.png)

## 特性

*   ✅ 支持开发者友好的热拔插插件系统，开发插件超方便！
*   ✅ 支持 MCP 接口调用，扩展能力更强喵！
*   ✅ 同时支持 OpenAI 和 Gemini 协议，想和谁聊天都行！
*   ✅ 支持多模态对话，图片和文字都能理解哦！
*   ✅ 多种模型随便切换，今天想和哪个模型聊天呢？
*   ✅ 用户权限管理，谁能和香草聊天你说了算！
*   ✅ 自定义预设角色，想让香草扮演什么角色都可以哦！
*   ✅ 基于 Socket.IO 实现实时通信，聊天更稳定喵！

## 项目状态

⚠️ **注意：香草还在努力学习，本项目仍在积极开发中哦！** ⚠️

当前开发计划：

*   🚧 完善 Onebot 协议支持
*   🚧 增强插件系统功能，让香草更聪明！
*   🚧 优化性能和稳定性，让聊天更流畅！
*   🚧 增加更多 AI 模型支持
*   🚧 改进用户界面和体验，让大家更喜欢香草！
*   🚧 撰写详细的 API 文档，方便大家使用喵！

## 安装

1.  克隆存储库：

```bash
git clone https://github.com/Pretend-to/mio-chat-backend
```

2.  进入项目目录：

```bash
cd mio-chat-backend
```

3.  安装依赖项：(要先安装 NodeJS 和 Pnpm 哦！)

```bash
pnpm install
```

## 使用

1.  启动后端服务器：

```bash
# 如果你要前台调试
node app
# 后台运行(基于 pm2)
npm run start
```

2.  修改配置文件，按照配置文件的注释修改就可以啦！

## 配置说明

配置文件在 `config/config/config.example.yaml`，记得复制成 `config.yaml` 再修改哦！

主要配置项：

*   **OpenAI 配置**：API 密钥、基础 URL、可用模型等等
*   **Gemini 配置**：API 密钥、基础 URL、可用模型等等
*   **Onebot 配置**：反向 WebSocket 地址、机器人 QQ 号、管理员 QQ 号等等
*   **服务器配置**：端口、主机、请求限制等等
*   **Web 配置**：管理员访问码、用户访问码、网页标题等等

## 插件系统

香草有很棒的插件系统，可以自定义功能哦！

*   内置插件在 `lib/plugins` 目录
*   自定义插件在 `plugins/custom` 目录
*   插件可以实现各种功能，比如网页解析、天气查询、绘图等等！

## API 接口

项目提供了很多 API 接口，详细文档请看 `api.md` 文件。

## 关联项目

[NextWeb](https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web) by [Yda](https://github.com/Yidadaa)

[云崽相关内容](https://gitee.com/yhArcadia/Yunzai-Bot-plugins-index) by 云崽社区

[chatgpt-mirai-qq-bot](https://github.com/lss233/chatgpt-mirai-qq-bot) by [lss233](https://github.com/lss233)

## 技术栈

*   Node.js
*   Socket.IO
*   Express
*   OpenAI API
*   Gemini API
*   Onebot 协议

## 贡献

欢迎大家一起帮香草改进！发现错误或者有更好的建议，请提出 issue 或者提交 pull request 哦！

## 许可证

该项目基于 [MIT 许可证](LICENSE)。
