# MioChat 核心多模态能力抽象设计方案与开发计划 (RFC)

> **版本**：v1.0.0-draft  
> **状态**：待评审 (Ready for Review)  
> **负责人**：Leo Wang / MioChat Core Team  
> **目标**：将「生图 (Image Gen)」、「识图 (Vision)」、「网络搜索 (Web Search)」三大分散能力统一抽象为系统级服务层，打通 AnyUI 深度融合，并补齐前后端配置管理与调试面板。

---

## 一、背景与设计目标

### 1.1 现状与痛点
- **生图割裂**：目前生图逻辑散落在 `plugins/custom/draw.js` 中，API Key 硬编码、逻辑耦合 SD WebUI 与第三方代理，无法动态切换 OpenAI DALL-E、Gemini Imagen、火山引擎等云端厂商。
- **识图臃肿**：`lib/plugins/ai-plugin/tools/vision.js` 单文件长达 350 行，手写模型名单与跨模型路由，能力无法被 AnyUI 或其他插件全局调用。
- **搜索分散**：搜索逻辑散布在 `web-plugin`、智谱适配器私有 `web_search` 等处，缺少统一的降级、缓存与 Provider 调度。
- **AnyUI 配合成本高**：AnyUI 的富文本与视觉小说模板（如 `gal_dialogue_card`、角色卡片）急需配图能力，但 Agent 需多次手工拼接 tool call，体验脱节。

### 1.2 预期收益
1. **多厂商热插拔**：像配置 LLM 适配器一样，在管理后台通过统一 Schema 自由添加和切换生图/搜索/识图实例。
2. **AnyUI 一键成图**：AnyUI 模板原生支持 `imagePrompt` 自动生图注入，实现从文本推理到视觉呈现的无缝闭环。
3. **系统级复用**：系统任何模块、Agent 或插件均可通过 `imageService` / `visionService` / `searchService` 单例安全、高效地调用能力。

---

## 二、总体架构设计

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MioChat Frontend (Vue 3)                          │
│   - LLM 适配器管理      - 生图配置管理      - 搜索配置管理      - 识图配置管理  │
│   - AnyUI 模板设计器    - 连通性测试工具    - 实时调试面板                      │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │ HTTP RESTful / WebSocket
┌───────────────────────────────────────▼─────────────────────────────────────┐
│                       MioChat Backend Core (/lib/chat)                      │
│                                                                             │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────┐  │
│  │     ImageService      │ │     VisionService     │ │   SearchService   │  │
│  │   (文生图调度中心)     │ │   (视觉路由与桥接)    │ │   (搜索调度中心)    │  │
│  └───────────┬───────────┘ └───────────┬───────────┘ └─────────┬─────────┘  │
│              │                         │                       │            │
│  ┌───────────▼───────────┐ ┌───────────▼───────────┐ ┌─────────▼─────────┐  │
│  │     Image Adapters    │ │   Multimodal Bridge   │ │  Search Adapters  │  │
│  │ - OpenAI (DALL-E 3)   │ │ - 原模型直接直通      │ │ - Tavily          │  │
│  │ - Gemini (Imagen 3)   │ │ - 纯文本模型跨实例中继 │ │ - Bing / Google   │  │
│  │ - 火山引擎 (SeaDream) │ │ - 专用 OCR/VL 模型    │ │ - DuckDuckGo      │  │
│  │ - SD WebUI / ComfyUI  │ │                       │ │ - 智谱 Web Search │  │
│  │ - 土块 / NovelAI 代理 │ │                       │ │ - SearXNG         │  │
│  └───────────────────────┘ └───────────────────────┘ └───────────────────┘  │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │
┌───────────────────────────────────────▼─────────────────────────────────────┐
│                              Plugins & Templates                            │
│   - AnyUI (Shadow DOM 自动渲染 + 模板插图注入)                               │
│   - ImagePlugin (通用 draw_image / sketch 工具)                              │
│   - WebPlugin (统一 search / crawl / extract 工具)                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 三、核心模块详细设计

### 3.1 统一生图层（`lib/chat/image/`）

#### 1. 适配器基类 `BaseImageAdapter.js`
```javascript
export default class BaseImageAdapter {
  constructor(config) {
    this.config = config || {}
    this.name = 'base-image'
  }

  /**
   * 核心方法：根据提示词生成图片
   * @param {Object} options
   * @param {string} options.prompt - 核心正向提示词
   * @param {string} [options.negativePrompt] - 负向提示词
   * @param {string} [options.size='1024x1024'] - 尺寸 (支持预设 'square' | 'portrait' | 'landscape' 或具体尺寸)
   * @param {number} [options.n=1] - 生成数量
   * @param {string} [options.style] - 风格预设 ('anime' | 'cinematic' | 'natural')
   * @param {number} [options.seed] - 随机种子
   * @returns {Promise<Array<{ url: string, base64?: string, seed?: number, revisedPrompt?: string }>>}
   */
  async generate(options) {
    throw new Error('子类必须实现 generate 方法')
  }

  /**
   * 适配器元数据与配置 Schema (供前端 DynamicForm 渲染表单)
   */
  static getAdapterMetadata() {
    return {
      type: 'base-image',
      name: 'Base Image Adapter',
      description: '',
      initialConfigSchema: {}
    }
  }
}
```

#### 2. 第一批适配器实现矩阵
- `implementations/openai-image.js`：OpenAI DALL-E 3、DALL-E 2 与未来 gpt-image。
- `implementations/gemini-image.js`：Google Imagen 3 (NanoBanana) 文生图。
- `implementations/volcengine-image.js`：字节火山引擎（SeaDream / 豆包文生图），国内低延迟免梯。
- `implementations/sd-webui.js`：本地/私有部署的 Stable Diffusion WebUI (Automatic1111) 与 ComfyUI。
- `implementations/ttd-anime.js`：土块/NovelAI 动漫通道，支持自动 tag 权重补齐与画风强化。

#### 3. 单例调度器 `ImageService.js`
- 维护所有已启用的生图适配器实例。
- 自动对接 `StorageService`：将返回的 base64 或临时 URL 统一落盘存储为持久化 Web 访问地址。
- 支持并发限流、请求去重与失败自动降级。

---

### 3.2 统一识图层（`lib/chat/vision/`）

#### 1. 服务类 `VisionService.js`
将原本在 `ai-plugin/tools/vision.js` 中的 350 行逻辑抽象为纯业务服务：
- **直通判定 (Direct Pass-through)**：判断当前对话的主模型是否支持视觉（联动 `ModelRegistryService.supportsVision(modelName)`），若支持则直接返回 `_postMessages` 载体，零额外开销。
- **跨模型中继 (Cross-Model Bridge)**：若主模型为纯文本推理模型（如 DeepSeek-R1、QwQ），自动在系统活跃适配器中匹配轻量视觉模型（如 Gemini Flash、MiMo-VL、GPT-4o-mini），静默提取画面特征并返给主模型。
- **图片预处理**：统一处理 URL 下载、超时控制 (AbortController)、本地路径读取、MIME 类型嗅探与 Base64 编码。

#### 2. 工具精简
`lib/plugins/ai-plugin/tools/vision.js` 瘦身为纯参数入口（< 40 行），直接调用 `visionService.analyze()`。

---

### 3.3 统一搜索层（`lib/chat/search/`）

#### 1. 适配器基类 `BaseSearchAdapter.js`
```javascript
export default class BaseSearchAdapter {
  constructor(config) {
    this.config = config || {}
    this.name = 'base-search'
  }

  /**
   * 核心方法：执行网页搜索
   * @param {Object} options
   * @param {string} options.query - 搜索关键词
   * @param {number} [options.count=5] - 返回结果数量
   * @param {string} [options.language='zh-CN'] - 语言
   * @returns {Promise<Array<{ title: string, url: string, snippet: string, score?: number }>>}
   */
  async search(options) {
    throw new Error('子类必须实现 search 方法')
  }
}
```

#### 2. 第一批适配器
- `tavily.js`：专为 LLM Agent 优化的搜索 API。
- `bing.js` / `google.js`：官方商业搜索 API。
- `duckduckgo.js`：免 Key 免费轻量兜底。
- `searxng.js`：自建聚合搜索引擎。
- `zhipu-search.js`：智谱原生联网搜索。

---

### 3.4 AnyUI 深度融合

AnyUI 模板引擎（`plugins/anyui/lib/TemplateRenderer.js`）新增内置指令支持：
- 模板支持指定数据槽位的生图标记。
- Agent 调用 `send_ui` 时，若传入 `imagePrompt`，AnyUI 插件自动调用 `ImageService.generate()`，将生成的图片地址直接绑定到 `{{imageUrl}}` 并完成 Shadow DOM 渲染。

---

## 四、数据库与管理 API 设计

### 4.1 Prisma 数据库表扩展 (`schema.prisma`)

```prisma
// 生图适配器配置
model ImageAdapterConfig {
  id          String   @id @default(uuid())
  name        String
  type        String   // openai, gemini, volcengine, sd-webui, ttd
  provider    String
  config      Json
  enabled     Boolean  @default(true)
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// 搜索适配器配置
model SearchAdapterConfig {
  id          String   @id @default(uuid())
  name        String
  type        String   // tavily, bing, google, duckduckgo, searxng, zhipu
  provider    String
  config      Json
  enabled     Boolean  @default(true)
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 4.2 RESTful API 规范

- `GET /api/images/adapters` - 获取生图实例列表
- `POST /api/images/adapters` - 创建生图实例
- `PUT /api/images/adapters/:id` - 更新生图实例
- `DELETE /api/images/adapters/:id` - 删除生图实例
- `POST /api/images/test` - 连通性测试与快速生图体验
- `GET /api/search/adapters` - 搜索实例列表与管理（同上范式）
- `POST /api/search/test` - 搜索连通性验证

---

## 五、前端（`mio-chat-frontend`）页面规划

在系统设置中心（`SettingsView`）新增对应的独立管理页面：

1. **生图管理页 (`ImageAdaptersView.vue`)**：
   - 实例卡片列表（包含当前默认实例标记、启用状态 Switch）。
   - 动态配置抽屉/弹窗（复用 `SchemaForm`，根据 Adapter Meta 自动生成表单）。
   - **快速测试工具**：输入提示词即时生成预览图，验证 Key 有效性。

2. **搜索管理页 (`SearchAdaptersView.vue`)**：
   - 搜索渠道管理、权重/优先级调整、测试搜索词返回卡片。

3. **视觉模型路由页 (`VisionSettingsView.vue`)**：
   - 视觉直通模式（自动优先 / 强制指定视觉模型）。

---

## 六、开发排期与实现路线图 (Roadmap)

### 阶段一：后端抽象与基础服务开发 (Backend Core)
- [ ] 创建 `lib/chat/image/` 目录与 `BaseImageAdapter.js`、`ImageRegistry.js`
- [ ] 实现第一批生图适配器（`sd-webui.js`、`ttd-anime.js`、`openai-image.js`、`volcengine-image.js`）
- [ ] 创建 `lib/chat/search/` 与 `BaseSearchAdapter.js`、实现 `tavily.js`、`duckduckgo.js`
- [ ] 重构 `VisionService.js`，将 `ai-plugin/tools/vision.js` 改造成轻量服务调用
- [ ] 编写单测验证所有 Adapter 标准出入参

### 阶段二：存储与管理 API (Prisma & HTTP Controllers)
- [ ] 更新 `prisma/schema.prisma`，执行迁移生成客户端
- [ ] 编写 `ImageConfigService.js` 与 `SearchConfigService.js`
- [ ] 编写 `imageController.js` 与 `searchController.js`，挂载路由与权限校验
- [ ] 实现连通性测试 API（`/api/images/test` 与 `/api/search/test`）

### 阶段三：前端管理面板与测试视图 (Frontend)
- [ ] 增加 `src/views/settings/ImageAdaptersView.vue`
- [ ] 增加 `src/views/settings/SearchAdaptersView.vue`
- [ ] 扩展设置路由与侧边栏菜单入口
- [ ] 增加生图与搜索测试弹窗与即时渲染

### 阶段四：AnyUI 深度融合与插件重构 (Plugin Ecosystem)
- [ ] AnyUI 增加 `imagePrompt` 自动识别与 `ImageService` 桥接
- [ ] 将旧 `plugins/custom/draw.js` 迁移为使用系统 `ImageService` 的标准插件 `image-plugin`
- [ ] 制作「视觉小说 / 智能生图卡片」官方标准 AnyUI 模板

### 阶段五：联调、测试与文档归档
- [ ] 全链路端到端联调（PC 端 + 移动端）
- [ ] 压力测试与异常降级容灾测试
- [ ] 编写使用手册与二次开发文档并合并上线
