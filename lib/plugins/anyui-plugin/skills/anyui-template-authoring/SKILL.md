---
name: anyui-template-authoring
description: Author and invoke high-quality, mobile-first AnyUI HTML templates for MioChat. Guides the creation of clean, responsive cards, game interfaces, forms, story choices, and Galgame/visual novel dialogue cards rendered via extraRender in Shadow DOM. Enforces decoupled zero-round-trip async image rendering (pure CSS skeleton fluid aura backgrounds + WebSocket auto-fill), global template repository (gal_dialogue_card), mobile-first UI standards, 44px touch targets, template syntax ({{var}}, {{#each}}), and Shadow DOM APIs (window.__mio.sendText / setInput / previewImage). Trigger when the user asks to build, design, modify, or author AnyUI templates/cards/interfaces.
---

# AnyUI 模板与卡片设计专家规范

AnyUI 用于在 MioChat 聊天流中输出高保真、响应式且可直接交互的 HTML 卡片。前端通过 **Shadow DOM 同文档渲染**（样式完全隔离于主页面）。

---

## 一、核心设计哲学：前后端解耦与模板原生视觉掌控

### 1. 零轮次开销内置异步生图（无需调用单独的 draw 工具）
AnyUI 原生打通了后端生图服务。在调用 `send_ui` 时：
- **文生图模式**：直接传入 `prompt` 或 `imagePrompt`，后端只负责创建任务并传递 `taskId`。初始状态下 `imageUrl` 保持为空，由 HTML 模板通过原生 CSS/DOM 呈现精美的骨架屏与极光流体动效；图片绘制完成后前端通过 WebSocket 直接将真实 URL 回填至 `img.src` 并平滑淡入！**无需调用 draw 工具，前后端完全解耦**。
- **静态图片模式**：传入已有图片链接 `imageUrl` 或 `imgurl`，直接即时渲染。
- **图生图模式**：同时传入 `imageUrl`（参考图）+ `prompt`（重绘提示词），自动进行图生图并在完成后替换。

### 2. 全局通用模板库（Global Templates）
系统内置全局共享模板目录 `templates/global/`，所有用户与智能体可直接免定义调用：
- **`gal_dialogue_card`**：Galgame / 视觉小说通用卡片（桌面端 480px 宽度约束，原生流体极光骨架屏，自适应 `object-fit: contain` 比例留白，支持章节标题、三行滚动对白、剧情分支选项、全屏画廊预览与异步生图）。

---

## 二、可用工具与模板语法

### 1. 三大工具
- `send_ui(template?, html?, variables?, prompt?, imageUrl?)`：
  - **优先使用**：指定全局或已有模板 `template: "gal_dialogue_card"` + `variables: JSON.stringify({...})` + 可选 `prompt`；
  - 也可传 `html` 直接发送自定义内联 HTML。
- `define_ui_template(name, html, description?, schema?)`：保存新模板到模板库；`schema` 接收标准 JSON Schema（如 `{"type":"object","properties":{...},"required":[...]}`），用于为每个字段定义类型、说明和必填约束，保存后 `manage_ui_templates` 的 list/get 均可查看标准 Schema 与字段规范。
- `manage_ui_templates(action: 'list' | 'get' | 'delete', name?)`：管理与查询可用模板列表；list 返回每个模板的名称、描述与标准 JSON Schema，get 返回完整正文与 Schema 详情。

### 2. 模板语法规范（支持 JSX 组件与经典 HTML 双模）
- **JSX / JS 组件模式（推荐）**：使用 `export default function Card(props, html)` 或 `(props, html) => html\`...\`` 编写。
  - 支持完整的 JavaScript 动态逻辑（条件渲染 `${hasImage && html\`...\`}`、动态数组循环 `${items.map(it => html\`...\`)}`、默认值兜底等）；
  - 内部通过 `html` 模板标签构建安全、自动转义的 HTML 结构。
- **经典 HTML 模式（向后兼容）**：`{{var}}` 变量替换与 `{{#each items}}...{{/each}}` 循环。

---

## 三、Shadow DOM 交互 API（window.__mio）

| API | 参数 | 行为与使用场景 |
| --- | --- | --- |
| `window.__mio.sendText(text)` | `string` | 填入输入框并在约 30ms 后自动提交（用于按钮/选项点击触发继续推进剧情） |
| `window.__mio.setInput(text)` | `string` | 仅填入输入框并自动聚焦，等待用户继续编辑 |
| `window.__mio.previewImage(url)` | `string` | 全屏画廊遮罩预览图片（Teleport 到 body，脱离 Shadow DOM 局限） |

> ⚠️ **DOM 查询硬规则**：在内联事件中查找 DOM，**绝不要使用 `document.getElementById`**，必须通过 `this.getRootNode().getElementById(...)` 从当前 ShadowRoot 获取！

---

## 四、经典范式与现代标准代码

### 范式 1：全局 Galgame / 视觉小说对话卡片（`gal_dialogue_card.jsx`）
```jsx
export default function GalDialogueCard(props, html) {
  const {
    chapterTitle = '',
    caption = '',
    text1, text2, text3, texts: customTexts,
    option1, option2, option3, options: customOptions,
    imageUrl, taskId
  } = props;

  // 动态判断是否需要渲染图片/立绘舞台（只有存在 imageUrl 或异步生图任务 taskId 时才渲染，纯文本对话时自动隐藏，不留白不转圈）
  const hasImage = Boolean((imageUrl && String(imageUrl).trim()) || (taskId && String(taskId).trim()));

  const texts = Array.isArray(customTexts) && customTexts.length > 0
    ? customTexts.filter(Boolean)
    : [text1, text2, text3].filter(Boolean);

  const options = Array.isArray(customOptions) && customOptions.length > 0
    ? customOptions.filter(Boolean)
    : [option1, option2, option3].filter(Boolean);

  return html`
    <div class="comic">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .comic { width: 100%; max-width: 480px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif;
          background: #ffffff; border-radius: 16px; overflow: hidden; color: #1e293b;
          box-shadow: 0 4px 24px rgba(244, 114, 182, 0.12); border: 1px solid rgba(244, 114, 182, 0.25); }
        .ldr-box { position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: 16px 16px 0 0;
          overflow: hidden; background: #fdf4ff; display: flex; align-items: center; justify-content: center; cursor: zoom-in; }
        .ldr-box.has-image { aspect-ratio: unset; }
        .balanced-liquid-container { position: absolute; inset: -30px; filter: blur(48px); opacity: 0.82; pointer-events: none; z-index: 1; }
        .soft-blob-1 { position: absolute; top: -10%; left: -10%; width: 110%; height: 110%; border-radius: 50% 50% 60% 40% / 40% 60% 50% 50%;
          background: radial-gradient(circle at 45% 45%, #f472b6 0%, #fbcfe8 55%, rgba(251, 207, 232, 0.2) 80%); animation: flow-smooth-1 4.2s infinite ease-in-out alternate; }
        .soft-blob-2 { position: absolute; bottom: -15%; right: -15%; width: 115%; height: 115%; border-radius: 60% 40% 50% 50% / 50% 50% 60% 40%;
          background: radial-gradient(circle at 55% 55%, #38bdf8 0%, #bae6fd 55%, rgba(186, 230, 253, 0.2) 80%); animation: flow-smooth-2 3.8s infinite ease-in-out alternate; }
        .soft-blob-center { position: absolute; top: 5%; left: 10%; width: 90%; height: 90%; border-radius: 45% 55% 45% 55% / 55% 45% 55% 45%;
          background: radial-gradient(circle at center, #c084fc 0%, #e9d5ff 50%, rgba(233, 213, 255, 0.2) 80%); animation: flow-smooth-center 4.8s infinite ease-in-out alternate; }
        .soft-blob-4 { position: absolute; bottom: -10%; left: -10%; width: 105%; height: 105%; border-radius: 40% 60% 55% 45% / 50% 45% 55% 50%;
          background: radial-gradient(circle at 50% 50%, #fda4af 0%, #fecdd3 55%, rgba(254, 205, 211, 0.2) 80%); animation: flow-smooth-4 3.5s infinite ease-in-out alternate; }
        @keyframes flow-smooth-1 { 0% { transform: translate(0, 0) scale(1) rotate(0deg); } 50% { transform: translate(20%, 15%) scale(1.18) rotate(35deg); } 100% { transform: translate(-10%, 10%) scale(0.92) rotate(-25deg); } }
        @keyframes flow-smooth-2 { 0% { transform: translate(0, 0) scale(1) rotate(0deg); } 50% { transform: translate(-22%, -18%) scale(1.2) rotate(-40deg); } 100% { transform: translate(12%, -10%) scale(0.95) rotate(30deg); } }
        @keyframes flow-smooth-center { 0% { transform: scale(0.95) translate(0, 0) rotate(0deg); } 50% { transform: scale(1.22) translate(-10%, 12%) rotate(45deg); } 100% { transform: scale(0.9) translate(15%, -10%) rotate(-35deg); } }
        @keyframes flow-smooth-4 { 0% { transform: translate(0, 0) scale(1.05) rotate(0deg); } 50% { transform: translate(25%, -15%) scale(0.9) rotate(-50deg); } 100% { transform: translate(-12%, 18%) scale(1.15) rotate(25deg); } }
        .soft-overlay { position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%);
          box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.85), inset 0 0 10px rgba(244, 114, 182, 0.1); pointer-events: none; z-index: 2; }
        .glass-spinner { position: absolute; z-index: 4; width: 44px; height: 44px; border-radius: 14px; background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.95); box-shadow: 0 6px 20px rgba(244, 114, 182, 0.18);
          display: flex; align-items: center; justify-content: center; transition: opacity 0.35s ease, transform 0.35s ease; pointer-events: none; }
        .glass-spinner .ring { width: 20px; height: 20px; border: 2.5px solid rgba(244, 114, 182, 0.2); border-top-color: #ec4899;
          border-right-color: #38bdf8; border-radius: 50%; animation: g-spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite; }
        @keyframes g-spin { to { transform: rotate(360deg); } }
        .ldr-box.has-image .glass-spinner { opacity: 0; transform: scale(0.85); pointer-events: none; }
        .ldr-box img { position: relative; z-index: 3; width: 100%; height: auto; max-height: 520px; display: block; object-fit: cover; opacity: 0; transition: opacity 0.45s ease; }
        .ldr-box img.loaded { opacity: 1; }
        .chapter-tag { position: absolute; top: 10px; left: 12px; z-index: 5; color: #831843; font-size: 12.5px; font-weight: 600;
          letter-spacing: 0.5px; background: rgba(255, 255, 255, 0.85); padding: 4px 10px; border-radius: 12px; backdrop-filter: blur(8px);
          border: 1px solid rgba(244, 114, 182, 0.3); box-shadow: 0 2px 8px rgba(244, 114, 182, 0.12); }
        .fs-btn { position: absolute; bottom: 10px; right: 12px; z-index: 5; background: rgba(255, 255, 255, 0.85); color: #475569;
          border: 1px solid rgba(244, 114, 182, 0.3); border-radius: 16px; padding: 5px 11px; font-size: 11.5px; cursor: pointer;
          backdrop-filter: blur(8px); box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: background 0.2s ease, transform 0.1s ease; }
        .fs-btn:active { transform: scale(0.95); background: #ffffff; }
        .dialog { background: #ffffff; border-top: 1px solid rgba(244, 114, 182, 0.2); padding: 12px 16px 10px; }
        .caption { color: #db2777; font-size: 12px; font-weight: 600; margin-bottom: 4px; }
        .dialog-scroll { max-height: 120px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
        .dialog-scroll::-webkit-scrollbar { width: 3px; }
        .dialog-scroll::-webkit-scrollbar-thumb { background: rgba(244, 114, 182, 0.4); border-radius: 2px; }
        .dialog p { font-size: 13.5px; line-height: 1.6; margin-bottom: 4px; color: #334155; }
        .dialog p:last-child { margin-bottom: 0; }
        .speech-bar { display: flex; gap: 8px; padding: 8px 14px 14px; background: #ffffff; border-top: 1px solid rgba(244, 114, 182, 0.12); overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .speech-btn { flex-shrink: 0; min-height: 38px; background: #fdf2f8; color: #be185d; border: 1px solid rgba(244, 114, 182, 0.35);
          border-radius: 20px; padding: 7px 14px; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.15s ease, transform 0.1s ease; }
        .speech-btn:active { background: #fce7f3; transform: scale(0.96); }
      </style>

      ${hasImage && html`
        <div class="stage ldr-box ${imageUrl ? 'has-image' : ''}" data-task-id="${taskId || ''}" onclick="window.__mio.previewImage(this.querySelector('img')?.src || '${imageUrl || ''}')">
          <div class="balanced-liquid-container">
            <div class="soft-blob-1"></div>
            <div class="soft-blob-2"></div>
            <div class="soft-blob-center"></div>
            <div class="soft-blob-4"></div>
          </div>
          <div class="soft-overlay"></div>
          <div class="glass-spinner">
            <div class="ring"></div>
          </div>
          <img src="${imageUrl || ''}" alt="${chapterTitle}" onload="if(this.src && this.src.length > 5){this.classList.add('loaded');this.closest('.ldr-box')?.classList.add('has-image');}" />
          ${chapterTitle && html`<div class="chapter-tag">${chapterTitle}</div>`}
          <button class="fs-btn" onclick="event.stopPropagation();window.__mio.previewImage(this.parentElement.querySelector('img')?.src || '${imageUrl || ''}')">⛶ 全屏</button>
        </div>
      `}

      <div class="dialog">
        ${caption && html`<div class="caption">${caption}</div>`}
        <div class="dialog-scroll">
          ${texts.length > 0 ? texts.map(t => html`<p>${t}</p>`) : html`<p>...</p>`}
        </div>
      </div>

      ${options.length > 0 && html`
        <div class="speech-bar">
          ${options.map(opt => html`
            <button class="speech-btn" onclick="window.__mio.sendText(this.textContent.trim())">${opt}</button>
          `)}
        </div>
      `}
    </div>
  `;
}
```

#### 调用方式：
```json
{
  "template": "gal_dialogue_card",
  "prompt": "1girl, solo, silver hair, anime style, classroom sunset",
  "variables": JSON.stringify({
    "chapterTitle": "第一章 · 命运的相遇",
    "caption": "艾莉西亚",
    "text1": "「你终于来了……我在这里等了你很久。」",
    "text2": "夕阳透过窗户洒在她银白色的发丝上，显得格外温柔。",
    "text3": "「准备好开始我们的冒险了吗？」",
    "option1": "「久等了，我们出发吧！」",
    "option2": "「你刚才说的秘密是什么？」",
    "option3": "「稍微等我准备一下装备。」"
  })
}
```

---

## 五、编写与调用自查清单

1. **是否需要额外调用 `draw` 工具？** ❌ 不需要！`send_ui` 直接传 `prompt` 或 `imagePrompt` 即可单步触发异步生图与骨架屏回填。
2. **是否前后端解耦？** ✅ 后端不硬塞任何假图 SVG，初始骨架屏与极光流体留白 100% 由模板 CSS 驱动。
3. **卡片宽度是否做桌面端限制？** ✅ `max-width: 480px` 避免撑满桌面端聊天气泡，移动端自然撑开。
4. **DOM 查询是否使用 `this.getRootNode()`？** ✅ 绝不使用全局 `document`。
5. **图片预览是否调用 `window.__mio.previewImage(url)`？** ✅ 严禁在 Shadow DOM 内自制 `position: fixed` 遮罩。
