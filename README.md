# Mio-Chat-Backend

主要是个AI平台，兼容OpenAI与**部分**Onebot协议v11。兼容原生态圈。

前端部分：[Mio-Chat 前端](https://github.com/Pretend-to/mio-chat-frontend)

QQ交流群：[qq 群](https://qm.qq.com/q/Eqv9Z6iSB4)

预览地址：[Mio-Chat](https://ai.krumio.com)

## 日志
- 2024-3-01
  构建基本框架。
- 2024-3-10
  完善了基于 Prodia 的 API 接口，画图功能应该没问题了。前端还在重构中，所以现在也只能当个画图服务器用,暂时可以无限制嫖几十个sd高速接口。
- 2024-4-10
  继续完善后端，对于云崽 Lain 的对接基本完成，遗憾的是 Lain 跑路了。但是总是还有一些 fork 的，想用也能用。后续可能会顺带做一个云崽的插件？？？
- 2024-4-23
  后端基本接入OpenAI。昨天还是前天，与诸位队友用这个项目参加了某计算机设计大赛。OpenAI对话以及流式响应基于js异步迭代器实现，但还是存在一定问题。
- 2024-4-24(5.14 补档)
  跟 [NextWeb](https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web) 作者 [Yda](https://github.com/Yidadaa) 先生在半夜打了一小时视频，在Yda哥的帮助下把流式问题解决了，感谢Yda。


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

第一次运行会自动为你生成配置文件，画图的画需要一个Prodia的API Key，可以在[Prodia官网](https://app.prodia.com/api/)申请。

1. 使用 node 启动后端服务器：

```bash
# 如果你要前台调试
node index
# 后台运行(基于 pm2)
npm run start
```

2. 修改配置文件，按提示修改即可。
   
## Prodia 画图服务器在云崽的使用
PS: 对于 Bot 建议搭配[云崽](https://github.com/yoimiya-kokomi/Miao-Yunzai)+我魔改的[ap-plugin](https://github.com/Pretend-to/ap-plugin/)食用。

1. 生成ap配置文件。没问题的话会在 scripts 目录下生成 config.yaml 文件，全部复制到剪贴板。(或者直接白嫖我的，在[Wiki-接口列表](https://github.com/Pretend-to/mio-chat-backend/wiki/Prodia%E2%80%90AP%E6%8E%A5%E5%8F%A3%E5%88%97%E8%A1%A8))

```bash
# 在本项目的根目录运行
npm run apconfig
```

2. 配置好云崽并且安装 ap 后，先跟 bot 发一句`#ap添加接口https://666备注测试`以生成配置文件。然后再到ap插件的 /config/config/config.yaml 中找到与本项目生成配置文件对应的部分(以 `APIList: `开头),进行替换。

3. 在云崽里应该就可以用了。魔改ap与原版不同的部分在于:
   1. 多图由轮询改为并发请求，因为 prodia 与本地部署 sd 不同，具有高并发的特性;
   2. 增加了绘制多图的方式，`#绘图xxx 接口1-16 `或者 `接口1，5，6 `都是可以的(两种写法不可混用)，也可以加张数如` #绘图xxx 接口23，15 2张 `实际张数则是张数 * 接口数，不会超出20张。

## 关联项目
[NextWeb](https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web) by [Yda](https://github.com/Yidadaa)

[云崽相关内容](https://gitee.com/yhArcadia/Yunzai-Bot-plugins-index) by 云崽社区

[chatgpt-mirai-qq-bot](https://github.com/lss233/chatgpt-mirai-qq-bot) by [lss233](https://github.com/lss233)

## 贡献

欢迎贡献！如果您发现任何错误或有改进建议，请提出问题或提交拉取请求。

## 许可证

该项目根据[MIT许可证](LICENSE)许可。
