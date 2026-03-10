# Mio-Chat 全栈项目面试 QA 指南 (综合版)

本文档整合了 Mio-Chat 前端与后端的架构设计、核心重难点及解决方案，旨在从全栈视角深度解析项目的技术价值。

---

## 一、 整体架构与设计模式 (Architecture & Design)

### Q1: 简述项目的全栈整体架构及其设计动机？

**A:** 项目采用 **“移动优先、全双工、插件化”** 的全栈架构。

- **后端 (Node.js)**：基于事件驱动和适配器模式。核心层通过 `middleware` 管理服务生命周期，利用工厂模式兼容 OpenAI、Gemini、Claude 及 OneBot 等多种协议。
- **前端 (Vue 3)**：基于原子化设计思想，核心业务逻辑（Client, Contactor, Message）与 UI 高度解耦。采用 IndexedDB 实现离线存储，Service Worker 提升访问速度。
- **动机**：解决跨平台对话（如 Web、QQ、飞书）与跨 AI 服务商（不同协议适配）的碎片化问题，提供统一的、高性能的 AI 交互体验。

### Q2: 后端为何使用全局单例 `middleware`？前端如何与之配合？

**A:**

- **后端**：`middleware` 充当了服务定位器（Service Locator），管理 SocketServer、LLM 适配器池和插件。这样可以实现统一的初始化流程和 **优雅退出（Graceful Shutdown）**。
- **前端**：通过 `Client` 类实现单例控制，维护全局的 `Socket` 实例。前端的 `Client` 与后端的 `middleware` 形成镜像映射，确保消息流转的清晰与可观测。

---

## 二、 实时通信与稳定性 (Real-time & Networking)

### Q3: 如何保证 WebSocket 长连接在复杂网络环境下的稳定性？

**A:**

1. **传输回退**：Socket.IO 优先尝试 `websocket`，若失败则自动回退至 `polling`，确保在防火墙环境下依然可用。
2. **心跳与重连**：全栈协同工作。后端监控链接活跃，前端监听 `connect_error` 并配置 `reconnectionDelay` 防止重连风暴。
3. **延迟感知**：前端 UI 实时计算并展示 Ping 值，增强用户在弱网环境下的感知能力。

### Q4: 既然是长连接，为何还要封装一套 Request-Response (fetch) 机制？

**A:** 标准的 WebSocket 是异步推送，但在获取设置、加载历史记录等场景下，需要类似 HTTP 的“请求-响应”语义。

- **实现方案**：前端发送请求时携带唯一 `request_id`，进入 `pending` 状态；后端处理完后在返回的消息中原样携带该 ID。前端通过 `EventEmitter` 触发对应 ID 的事件，从而实现 Promise 化的 `socket.fetch()` 调用，并设置 60s 超时防止死锁。

---

## 三、 多协议适配与核心功能 (Multi-protocol & Features)

### Q5: 项目如何支持 OneBot (QQ 机器人) 与 Web 实时的消息双向同步？

**A:**

- **接入层**：后端采用反向 WebSocket 链路，作为服务端接收 IM 机器人的事件。
- **转换层**：在 `lib/chat/onebot/` 中通过转换逻辑，将 IM 平台的专有格式（如 CQ 码、JSON 对象）映射为系统通用的 `Message` 模型，再通过 Socket.IO 同步给 Web 端，实现真正的全渠道对话管理。

### Q6: 详述 MCP (Model Context Protocol) 的集成意义。

**A:** MCP 是由 Anthropic 推出的开放协议。我们在后端实现了 `MCPPlugin`，它允许 AI 直接接入外部上下文（如文件系统、数据库、本地工具）。这使得 Mio-Chat 不再局限于对话，而是进化为一个可以通过插件动态扩展能力的“AI 工作站”。

---

## 四、 复杂 UI、编辑器与多模态 (UI & Multimodal)

### Q7: 为什么聊天输入框选择 `contenteditable` 而非简单的 `<textarea>`？

**A:**

- **动机**：为了实现高质量的图文混排。用户可以直接粘贴图片、表情包，甚至是文件卡片到输入框中。
- **技术难点**：`contenteditable` 容易丢失光标并带入杂乱 HTML。
- **解决方案**：手动管理 `Selection/Range` 对象记录光标位置；重写 `onPaste` 事件，对文本进行纯净化处理，对图片触发异步上传压缩。

### Q8: 针对 LLM 的打字机效果，如何平衡渲染性能与用户滚动体验？

**A:**

1. **流式重绘**：使用 `MdRenderer` 组件支持实时渲染 Markdown。为了防止内容快速增长导致的 Long Task，我们在渲染层做了局部更新。
2. **智能滚动监控**：
   - **自动触底**：如果用户原本就在底部，新消息到来时平滑滚动到底部。
   - **锁定机制**：如果用户手动上划查看历史，则锁定滚动位置，并显示“返回底部”浮标，避免干扰用户阅读。

---

## 五、 数据持久化与自修复 (Data & Persistence)

### Q9: 前后端如何处理海量聊天数据的存储？

**A:**

- **前端**：使用 **IndexedDB**（通过 `localforage` 封装），它异步且容量巨大，适合存储数万条消息。同时采用 **防抖写入（Debounced Storage）**，合并高频率写入操作，保护磁盘 I/O。
- **后端**：从早期的静态文件（YAML/JSON）全面迁移至 **Prisma + SQLite**。通过关系型数据库管理模型配置、API Key 及插件设置，支持运行时动态修改且不丢数据。

### Q10: 什么是“零配置”冷启动及自修复机制？

**A:** 为了降低部署门槛，后端 `app.js` 具备环境自感知能力：

- 若运行环境中 Prisma 客户端丢失，系统会自动调用命令生成。
- 实现了 `AutoMigrationDetector`，检测老版本的 JSON 配置，发现后自动执行“影子迁移”，将老数据无感导入 SQLite 数据库。

---

## 六、 性能优化与 PWA (Performance & PWA)

### Q11: 处理大文件上传（如视频、超大文档）时有哪些性能优化？

**A:**

- **多线程哈希**：在 Web Worker 中计算文件 MD5，避免主线程渲染卡顿。
- **分片上传**：将文件切分为 1MB 物理块并发上传，支持断点续传。
- **客户端预压缩**：针对图片粘贴，在前端利用 Canvas API 重新绘制并压缩质量（如 JPEG 0.7）后再上传，极大地节省了带宽和服务器压力。

### Q12: 你们的 Service Worker 缓存方案有何独特之处？

**A:** 我们没有使用简单的 Cache API，而是自研了 **基于 IndexedDB 的 SW 缓存系统**：

- **带 TTL 的缓存**：手动管理资源的过期时间。
- **归一化处理**：自动排序 URL 参数（如 `?b=2&a=1`），确保同一资源生成的缓存 Key 唯一，极大提高了命中率。

### Q14: 针对消息历史和预设列表，项目如何平衡加载速度与渲染性能？

**A:** 项目采用了 **“无限滚动（Infinite Scrolling）” + “虚拟滚动（Virtual Scrolling）”** 的组合拳：

1. **预设列表（Infinite Scroll）**：利用 `Intersection Observer API` 实现。当用户滚动到距离底部 100px 时自动触发异步加载，配合骨架屏（Skeleton）提升感知性能。
2. **对话历史（Virtual Scroll）**：针对可能存在的数千条聊天记录，聊天窗口采用了虚拟滚动技术。只渲染视口及其上下缓冲区的 DOM 节点，极大降低了大规模 DOM 操作带来的内存占用和渲染延迟。
3. **分片加载**：通过后端分页 API (`start`, `nums`) 按需获取数据，确保首屏加载速度。

---

## 七、 可靠性与运维 (Reliability & DevOps)

### Q13: 在生产环境下如何保证系统的稳定性？

**A:**

1. **集群模式**：支持 PM2 Cluster，充分利用多核服务器性能。
2. **优雅退出**：接收 SIGINT/SIGTERM 信号，确保退出前断开所有 Socket 连接并关闭数据库，防止数据损坏。
3. **静态资源层**：集成 `express-static-gzip` 配合 Brotli 压缩，并在 Nginx 层配置强缓存策略，降低 Node.js 服务端的负载。
