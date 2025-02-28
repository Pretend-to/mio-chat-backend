# Mio-Chat-Backend

一款基于 Websocket 的 ChatBot 对话平台，兼容 OpenAI 与**部分** Onebot 协议v11。兼容流行的 Onebot 生态圈。

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


## 关联项目
[NextWeb](https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web) by [Yda](https://github.com/Yidadaa)

[云崽相关内容](https://gitee.com/yhArcadia/Yunzai-Bot-plugins-index) by 云崽社区

[chatgpt-mirai-qq-bot](https://github.com/lss233/chatgpt-mirai-qq-bot) by [lss233](https://github.com/lss233)

## 贡献

欢迎贡献！如果您发现任何错误或有改进建议，请提出问题或提交拉取请求。

## 许可证

该项目根据[MIT许可证](LICENSE)许可。
