# AnyUI（Shadow DOM）插件

AnyUI 用于让 Agent 在聊天消息中输出具备高保真样式、动态交互和表单收集能力的 HTML 卡片。插件通过 `extraRender` 下发 HTML，由前端以**同文档 Shadow DOM** 渲染。

> 当前推荐使用 `type: "html"`。`type: "iframe"` 仅作为兼容值保留。

## 适用场景

- 快捷选项、确认按钮和引导式追问
- 表单收集与任务提交
- 状态面板、商店、角色卡和游戏界面
- 进度条、仪表盘等数据展示

## 工作原理

1. Tool 返回 `extraRender` 数组。
2. 前端将 HTML 挂载到消息流中的 Shadow DOM。
3. HTML 中的 `<style>` 只作用于当前卡片，不污染聊天页面。
4. 内容自然撑开容器高度，无需传递 `height` 或同步 iframe 高度。

## Tool 返回协议

```typescript
interface ToolCallMessage {
  id: string;
  name: string;
  displayName?: string;
  action: "running" | "completed" | "failed";
  status: "pending" | "completed" | "failed";
  parameters?: Record<string, unknown>;
  result?: Record<string, unknown>;
  extraRender?: ExtraRenderItem[];
}

interface ExtraRenderItem {
  type: "html" | "iframe";
  html: string;
  placement?: "outer" | "inner";
}
```

### `placement`

- `outer`：渲染在工具折叠卡片下方，用户无需展开即可查看和操作。推荐使用。
- `inner`：渲染在工具折叠卡片内部，适合辅助信息或调试视图。

## 插件工具

### `send_ui`

直接发送内联 HTML，或渲染模板库中的模板。

参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `html` | `string` | 内联 HTML，与 `template` 二选一 |
| `template` | `string` | 已保存的模板名，与 `html` 二选一 |
| `variables` | `string` | JSON 对象字符串，用于模板变量替换 |

示例：

```javascript
return {
  success: true,
  result: { action: "choice_rendered" },
  extraRender: [{
    type: "html",
    placement: "outer",
    html: `
      <style>
        .card { padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .buttons { display: flex; gap: 8px; flex-wrap: wrap; }
        button { padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 8px;
          background: #f8fafc; cursor: pointer; }
        .primary { color: white; background: #3b82f6; border-color: #3b82f6; }
      </style>
      <div class="card">
        <strong>请选择下一步操作</strong>
        <div class="buttons">
          <button class="primary" onclick="window.__mio.sendText('确认执行全量构建')">🚀 立即构建</button>
          <button onclick="window.__mio.sendText('仅运行单元测试')">🧪 运行测试</button>
          <button onclick="window.__mio.setInput('取消构建，因为：')">✏️ 取消并说明原因</button>
        </div>
      </div>
    `
  }]
};
```

实际调用 `send_ui` 时，也可以直接传入 `html`；插件会自动返回：

```javascript
{
  success: true,
  rendered: true,
  extraRender: [{ type: "html", html: renderedHtml, placement: "outer" }]
}
```

### 模板工具

- `define_ui_template`：创建或保存 HTML 模板。
- `manage_ui_templates`：查看、更新或删除模板。
- `send_ui`：按模板名和 `variables` 渲染并发送。

模板变量示例：

```html
<div class="card">
  <h3>{{name}}</h3>
  <p>生命值：{{hp}}</p>
  {{#each items}}<span>{{this}}</span>{{/each}}
</div>
```

```json
{"name":"勇者","hp":87,"items":["药水","长剑"]}
```

## 前端交互 API：`window.__mio`

Shadow DOM 内可使用以下白名单 API：

| API | 参数 | 行为 |
| --- | --- | --- |
| `window.__mio.sendText(text)` | `string` | 填入输入框，并在约 30ms 后自动发送 |
| `window.__mio.setInput(text)` | `string` | 仅填入并聚焦输入框，等待用户编辑 |
| `window.__mio.previewImage(url)` | `string` | 全屏预览图片（Teleport 到 `<body>`，脱离 Shadow DOM 定位上下文） |

> ⚠️ **全屏预览不要用 CSS `position: fixed` 在 Shadow DOM 内实现**——`fixed` 定位的包含块会被限制在 shadow host（消息气泡）内，导致遮罩只覆盖气泡而非整个屏幕。请统一调用 `window.__mio.previewImage(url)`，由主页面用 `Teleport to="body"` 渲染真正的全屏遮罩。

### 全屏图片预览示例

```html
<style>
  .stage img { width: 100%; height: auto; display: block; cursor: zoom-in; }
  .fs-btn { position: absolute; bottom: 12px; right: 14px; cursor: pointer; }
</style>
<div class="stage" onclick="window.__mio.previewImage('{{imageUrl}}')">
  <img src="{{imageUrl}}" alt="预览图">
  <button class="fs-btn" onclick="event.stopPropagation();window.__mio.previewImage('{{imageUrl}}')">⛶ 全屏</button>
</div>
```

### Shadow DOM 内查找元素

不要使用 `document.getElementById`。应从当前节点获取 ShadowRoot：

```javascript
const root = this.getRootNode();
const value = root.getElementById("field").value;
```

## 表单示例

```html
<style>
  .form { padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; }
  label { display: block; margin: 10px 0 4px; font-size: 13px; }
  input, select, button { box-sizing: border-box; width: 100%; padding: 8px; }
  button { margin-top: 14px; color: white; background: #10b981; border: 0; border-radius: 6px; }
</style>
<div class="form">
  <label for="env">部署环境</label>
  <select id="env">
    <option>预发环境</option>
    <option>生产环境</option>
  </select>
  <label for="branch">分支或 Tag</label>
  <input id="branch" value="release/latest" placeholder="例如 v1.2.0" />
  <button onclick="
    const root = this.getRootNode();
    const env = root.getElementById('env').value;
    const branch = root.getElementById('branch').value.trim();
    if (!branch) { alert('请输入分支或 Tag'); return; }
    window.__mio.sendText('请帮我部署分支【' + branch + '】到【' + env + '】');
  ">确认提交部署任务</button>
</div>
```

## 开发规范与注意事项

1. **样式自包含**：在 HTML 顶部显式提供 `<style>`，不要依赖聊天页面的全局 CSS。
2. **使用内联事件**：通过 `onclick`、`onchange` 等属性绑定交互。
3. **不要依赖 `<script>`**：通过 `innerHTML` 插入的异步或普通 `<script>` 不应视为可执行；不要依赖外部脚本。
4. **避免固定高度**：不要使用 `height: 100vh` 或死高度，让内容自然流式布局。若对白/列表区域需要固定行数，用固定 `height` + `overflow-y: auto` 的滚动容器（如 `.dialog-scroll { height: 72px; overflow-y: auto; }`），而不是 `100vh`。
5. **避免 ID 冲突**：每个卡片使用独立、语义清晰的 ID，并始终从 `this.getRootNode()` 查找。
6. **转义动态数据**：模板变量来自用户或外部系统时，应进行 HTML 转义，避免注入不可信标签或属性。
7. **控制内容体积**：尽量减少内联资源和冗余样式，避免生成过大的消息卡片。

## 最小返回示例

```javascript
return {
  success: true,
  extraRender: [{
    type: "html",
    placement: "outer",
    html: '<style>.ok{color:#16a34a}</style><div class="ok">操作已完成</div>'
  }]
};
```
