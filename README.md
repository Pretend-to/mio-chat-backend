# Mio-Chat-Backend

主要是个AI平台，会对接一些著名的bot框架兼容原生态圈。

## 日志
- 2023-3-01
  构建基本框架。
- 2023-3-10
  完善了基于 Prodia 的 API 接口，画图功能应该没问题了。前端还在重构中，所以现在也只能当个画图服务器用,暂时可以无限制嫖几十个sd高速接口。


## 安装

1. 克隆存储库：

```bash
git clone https://github.com/Pretend-to/mio-chat-backend
```

2. 进入项目目录：

```bash
cd mio-chat-backend
```

3. 安装依赖项：

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
npm start
```
PS: 对于 Bot 建议搭配[云崽](https://github.com/yoimiya-kokomi/Miao-Yunzai)+我魔改的[ap-plugin](https://github.com/Pretend-to/ap-plugin/)食用。

1. 生成ap配置文件。没问题的话会在 scripts 目录下生成 config.yaml 文件，全部复制到剪贴板。

```bash
# 在本项目的根目录运行
npm run apconfig
```

2. 配置好云崽并且安装 ap 后，先跟 bot 发一句`#ap添加接口https://666备注测试`以生成配置文件。然后再到ap插件的 /config/config/config.yaml 中找到与本项目生成配置文件对应的部分(以 `APIList: `开头),进行替换。

3. 在云崽里应该就可以用了。魔改ap与原版不同的部分在于:
   1. 多图由轮询改为并发请求，因为 prodia 与本地部署 sd 不同，具有高并发的特性;
   2. 增加了绘制多图的方式，`#绘图xxx 接口1-16 `或者 `接口1，5，6 `都是可以的(两种写法不可混用)，也可以加张数如` #绘图xxx 接口23，15 2张 `实际张数则是张数 * 接口数，不会超出20张。

## 贡献

欢迎贡献！如果您发现任何错误或有改进建议，请提出问题或提交拉取请求。

## 许可证

该项目根据[MIT许可证](LICENSE)许可。
